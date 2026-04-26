"""
Offline script to build the city feature index.

Usage (from repo root):
    python scripts/build_city_index.py
    python scripts/build_city_index.py --limit 10 --workers 5
"""
import sys
import os
import time
import argparse
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "backend"))

from services.feature_builder import build_feature_vector, bbox_from_point
from ml.vectorizer import dict_to_array
from ml.precompute import save_index

CITIES = [
    # Europe
    {"name": "Paris",         "lat": 48.8566,  "lon":   2.3522},
    {"name": "London",        "lat": 51.5074,  "lon":  -0.1278},
    {"name": "Berlin",        "lat": 52.5200,  "lon":  13.4050},
    {"name": "Madrid",        "lat": 40.4168,  "lon":  -3.7038},
    {"name": "Rome",          "lat": 41.9028,  "lon":  12.4964},
    {"name": "Amsterdam",     "lat": 52.3676,  "lon":   4.9041},
    {"name": "Vienna",        "lat": 48.2082,  "lon":  16.3738},
    {"name": "Prague",        "lat": 50.0755,  "lon":  14.4378},
    {"name": "Warsaw",        "lat": 52.2297,  "lon":  21.0122},
    {"name": "Budapest",      "lat": 47.4979,  "lon":  19.0402},
    {"name": "Lisbon",        "lat": 38.7169,  "lon":  -9.1395},
    {"name": "Stockholm",     "lat": 59.3293,  "lon":  18.0686},
    {"name": "Copenhagen",    "lat": 55.6761,  "lon":  12.5683},
    {"name": "Athens",        "lat": 37.9838,  "lon":  23.7275},
    {"name": "Brussels",      "lat": 50.8503,  "lon":   4.3517},
    # Americas
    {"name": "New York",      "lat": 40.7128,  "lon": -74.0060},
    {"name": "Los Angeles",   "lat": 34.0522,  "lon":-118.2437},
    {"name": "Chicago",       "lat": 41.8781,  "lon": -87.6298},
    {"name": "Toronto",       "lat": 43.6532,  "lon": -79.3832},
    {"name": "Mexico City",   "lat": 19.4326,  "lon": -99.1332},
    {"name": "Sao Paulo",     "lat": -23.5505, "lon": -46.6333},
    {"name": "Buenos Aires",  "lat": -34.6037, "lon": -58.3816},
    {"name": "Bogota",        "lat":  4.7110,  "lon": -74.0721},
    {"name": "Lima",          "lat": -12.0464, "lon": -77.0428},
    {"name": "Santiago",      "lat": -33.4489, "lon": -70.6693},
    # Asia
    {"name": "Tokyo",         "lat": 35.6895,  "lon": 139.6917},
    {"name": "Beijing",       "lat": 39.9042,  "lon": 116.4074},
    {"name": "Shanghai",      "lat": 31.2304,  "lon": 121.4737},
    {"name": "Seoul",         "lat": 37.5665,  "lon": 126.9780},
    {"name": "Mumbai",        "lat": 19.0760,  "lon":  72.8777},
    {"name": "Delhi",         "lat": 28.6139,  "lon":  77.2090},
    {"name": "Bangkok",       "lat": 13.7563,  "lon": 100.5018},
    {"name": "Singapore",     "lat":  1.3521,  "lon": 103.8198},
    {"name": "Jakarta",       "lat": -6.2088,  "lon": 106.8456},
    {"name": "Kuala Lumpur",  "lat":  3.1390,  "lon": 101.6869},
    {"name": "Ho Chi Minh",   "lat": 10.8231,  "lon": 106.6297},
    {"name": "Dhaka",         "lat": 23.8103,  "lon":  90.4125},
    {"name": "Karachi",       "lat": 24.8607,  "lon":  67.0011},
    {"name": "Osaka",         "lat": 34.6937,  "lon": 135.5023},
    {"name": "Hong Kong",     "lat": 22.3193,  "lon": 114.1694},
    # Africa & Middle East
    {"name": "Cairo",         "lat": 30.0444,  "lon":  31.2357},
    {"name": "Lagos",         "lat":  6.5244,  "lon":   3.3792},
    {"name": "Nairobi",       "lat": -1.2921,  "lon":  36.8219},
    {"name": "Johannesburg",  "lat": -26.2041, "lon":  28.0473},
    {"name": "Casablanca",    "lat": 33.5731,  "lon":  -7.5898},
    {"name": "Dubai",         "lat": 25.2048,  "lon":  55.2708},
    {"name": "Istanbul",      "lat": 41.0082,  "lon":  28.9784},
    {"name": "Tel Aviv",      "lat": 32.0853,  "lon":  34.7818},
    # Oceania
    {"name": "Sydney",        "lat": -33.8688, "lon": 151.2093},
    {"name": "Melbourne",     "lat": -37.8136, "lon": 144.9631},
]


def process_city(city: dict, radius_km: float) -> tuple:
    """Returns (city_dict, raw_vector) or raises on failure."""
    bbox = bbox_from_point(city["lat"], city["lon"], radius_km=radius_km)
    features = build_feature_vector(bbox)
    return {**city, "features": features}, dict_to_array(features)


def main():
    parser = argparse.ArgumentParser(description="Build UrbanOracle city index")
    parser.add_argument("--limit",   type=int,   default=None, help="Process only first N cities")
    parser.add_argument("--radius",  type=float, default=2.0,  help="BBox radius in km (default 2)")
    parser.add_argument("--workers", type=int,   default=3,    help="Parallel workers (default 3, max 5)")
    args = parser.parse_args()

    workers = min(args.workers, 5)  # don't hammer Overpass
    cities  = CITIES[: args.limit] if args.limit else CITIES
    total   = len(cities)

    print(f"Processing {total} cities | radius={args.radius}km | workers={workers}\n")

    raw_vectors: list = [None] * total
    metadata:    list = [None] * total
    failed:      list = []
    done = 0

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(process_city, city, args.radius): (i, city) for i, city in enumerate(cities)}
        for future in as_completed(futures):
            i, city = futures[future]
            done += 1
            try:
                meta, vec = future.result()
                raw_vectors[i] = vec
                metadata[i]    = meta
                print(f"  [{done}/{total}] {city['name']} ✓")
            except Exception as e:
                failed.append(city["name"])
                print(f"  [{done}/{total}] {city['name']} ✗  ({e})")

    # Filter out failed cities
    pairs = [(v, m) for v, m in zip(raw_vectors, metadata) if v is not None]
    if not pairs:
        print("\nNo cities processed successfully. Aborting.")
        sys.exit(1)

    vecs, metas = zip(*pairs)
    print(f"\nSuccessful: {len(vecs)}  |  Failed: {len(failed)}")
    if failed:
        print("Failed:", ", ".join(failed))

    save_index(list(vecs), list(metas))
    print("Done.")


if __name__ == "__main__":
    main()