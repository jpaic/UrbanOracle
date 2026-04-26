import math
import numpy as np
from collections import Counter
from shapely.geometry import Polygon

from services.overpass import query_overpass_batch
from services.elevation import fetch_elevation_grid


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------

def haversine(a: dict, b: dict) -> float:
    """Return distance in metres between two {lat, lon} dicts."""
    R = 6_371_000
    lat1, lon1 = math.radians(a["lat"]), math.radians(a["lon"])
    lat2, lon2 = math.radians(b["lat"]), math.radians(b["lon"])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def compute_bearing(a: dict, b: dict) -> float:
    """Return compass bearing (0–360) from point a to point b."""
    lat1 = math.radians(a["lat"])
    lat2 = math.radians(b["lat"])
    dlon = math.radians(b["lon"] - a["lon"])
    x = math.sin(dlon) * math.cos(lat2)
    y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


def bbox_area_km2(bbox: list[float]) -> float:
    """Approximate area of bounding box in km²."""
    south, west, north, east = bbox
    lat_mid = math.radians((south + north) / 2)
    h = haversine({"lat": south, "lon": west}, {"lat": north, "lon": west}) / 1000
    w = haversine({"lat": lat_mid, "lon": west}, {"lat": lat_mid, "lon": east}) / 1000
    return h * w


def bbox_from_point(lat: float, lon: float, radius_km: float = 5.0) -> list[float]:
    """Create a square bounding box centred on (lat, lon)."""
    delta_lat = radius_km / 111.0
    delta_lon = radius_km / (111.0 * math.cos(math.radians(lat)))
    return [lat - delta_lat, lon - delta_lon, lat + delta_lat, lon + delta_lon]


def _polygon_from_element(el: dict) -> Polygon | None:
    coords = [(n["lon"], n["lat"]) for n in el.get("geometry", [])]
    if len(coords) < 3:
        return None
    poly = Polygon(coords)
    return poly if poly.is_valid else None


# ---------------------------------------------------------------------------
# Individual feature extractors
# ---------------------------------------------------------------------------

def road_network_density(osm_roads: dict, area_km2: float) -> float:
    """Total road length (km) / area (km²)."""
    total_m = 0.0
    for way in osm_roads.get("elements", []):
        coords = way.get("geometry", [])
        for i in range(len(coords) - 1):
            total_m += haversine(coords[i], coords[i + 1])
    return (total_m / 1000) / area_km2 if area_km2 > 0 else 0.0


def road_network_entropy(osm_roads: dict) -> float:
    """
    Shannon entropy of road bearing distribution (binned to 10°).
    Low entropy ≈ grid city.  High entropy ≈ organic/radial city.
    """
    bearings = []
    for way in osm_roads.get("elements", []):
        coords = way.get("geometry", [])
        for i in range(len(coords) - 1):
            b = compute_bearing(coords[i], coords[i + 1]) % 180  # collapse N/S same axis as S/N
            bearings.append(int(b / 10) * 10)
    if not bearings:
        return 0.0
    counts = Counter(bearings)
    total = sum(counts.values())
    probs = [c / total for c in counts.values()]
    return -sum(p * math.log2(p) for p in probs if p > 0)


def building_density(osm_buildings: dict, area_km2: float) -> float:
    """Number of building footprints per km²."""
    return len(osm_buildings.get("elements", [])) / area_km2 if area_km2 > 0 else 0.0


def building_regularity(osm_buildings: dict) -> float:
    """
    Lightweight proxy for building regularity: fraction of buildings
    that are simple rectangles (4-5 nodes). Avoids heavy Shapely ops.
    """
    elements = osm_buildings.get("elements", [])
    if not elements:
        return 0.0
    simple = sum(
        1 for el in elements
        if len(el.get("geometry", [])) in (4, 5)
    )
    return simple / len(elements)


def water_coverage_ratio(osm_water: dict, area_km2: float) -> float:
    """Fraction of the bounding box covered by water polygons."""
    total_km2 = 0.0
    for el in osm_water.get("elements", []):
        poly = _polygon_from_element(el)
        if poly:
            total_km2 += poly.area * 111 ** 2  # rough deg² → km²
    return min(total_km2 / area_km2, 1.0) if area_km2 > 0 else 0.0


def river_density(osm_waterways: dict, area_km2: float) -> float:
    """Total waterway length (km) / area (km²)."""
    total_m = 0.0
    for way in osm_waterways.get("elements", []):
        coords = way.get("geometry", [])
        for i in range(len(coords) - 1):
            total_m += haversine(coords[i], coords[i + 1])
    return (total_m / 1000) / area_km2 if area_km2 > 0 else 0.0


def elevation_variance(bbox: list[float]) -> float:
    """Standard deviation of sampled elevation values in metres."""
    try:
        grid = fetch_elevation_grid(bbox, resolution=20)
        return float(np.std(grid))
    except Exception:
        return 0.0


def green_space_ratio(osm_green: dict, area_km2: float) -> float:
    """Fraction of bounding box covered by parks, forests, and meadows."""
    total_km2 = 0.0
    for el in osm_green.get("elements", []):
        poly = _polygon_from_element(el)
        if poly:
            total_km2 += poly.area * 111 ** 2
    return min(total_km2 / area_km2, 1.0) if area_km2 > 0 else 0.0


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def build_feature_vector(bbox: list[float]) -> dict:
    """
    Fetch all OSM layers for bbox and return an 8-dimensional feature dict.

    Args:
        bbox: [south, west, north, east]

    Returns:
        dict with keys matching FEATURE_KEYS in ml/vectorizer.py
    """
    area = bbox_area_km2(bbox)

    # Single batched Overpass request — one round trip for all layers
    layers    = query_overpass_batch(bbox)
    roads     = layers["roads"]
    buildings = layers["buildings"]
    water     = layers["water"]
    waterways = layers["waterways"]
    green     = {"elements": layers["parks"]["elements"] + layers["forests"]["elements"]}

    return {
        "road_density":        road_network_density(roads, area),
        "road_entropy":        road_network_entropy(roads),
        "building_density":    building_density(buildings, area),
        "building_regularity": building_regularity(buildings),
        "water_coverage":      water_coverage_ratio(water, area),
        "river_density":       river_density(waterways, area),
        "elevation_variance":  elevation_variance(bbox),
        "green_space_ratio":   green_space_ratio(green, area),
    }