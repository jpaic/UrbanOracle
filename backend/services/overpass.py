import time
import httpx
from config import OVERPASS_URL, OVERPASS_TIMEOUT


def query_overpass_batch(bbox: list, max_retries: int = 4) -> dict:
    """
    Fetch all needed OSM layers in a single Overpass request.
    Limits results per layer to cap memory usage on free tier.
    """
    s, w, n, e = bbox
    # 500 limit per layer keeps response under ~10MB total
    query = f"""
    [out:json][timeout:{OVERPASS_TIMEOUT}][maxsize:67108864];
    (
      way["highway"]({s},{w},{n},{e});
      way["building"]({s},{w},{n},{e});
      way["natural"="water"]({s},{w},{n},{e});
      way["waterway"]({s},{w},{n},{e});
      way["leisure"="park"]({s},{w},{n},{e});
      way["landuse"="forest"]({s},{w},{n},{e});
    );
    out body geom qt 500;
    """
    headers = {"User-Agent": "UrbanOracle/1.0"}

    for attempt in range(max_retries + 1):
        try:
            response = httpx.post(
                OVERPASS_URL,
                data={"data": query},
                headers=headers,
                timeout=OVERPASS_TIMEOUT + 10,
            )
            if response.status_code == 429 or response.status_code >= 500:
                wait = 15 * (2 ** attempt)
                print(f"      [overpass] {response.status_code} — waiting {wait}s (retry {attempt + 1}/{max_retries})...")
                time.sleep(wait)
                continue
            response.raise_for_status()
            raw = response.json()
            return _split_layers(raw)

        except httpx.TimeoutException:
            wait = 20 * (2 ** attempt)
            print(f"      [overpass] timeout — waiting {wait}s (retry {attempt + 1}/{max_retries})...")
            time.sleep(wait)

    raise RuntimeError(f"Overpass batch query failed after {max_retries} retries for bbox={bbox}")


def _split_layers(raw: dict) -> dict:
    layers = {
        "roads":      {"elements": []},
        "buildings":  {"elements": []},
        "water":      {"elements": []},
        "waterways":  {"elements": []},
        "parks":      {"elements": []},
        "forests":    {"elements": []},
    }
    for el in raw.get("elements", []):
        tags = el.get("tags", {})
        if "highway" in tags:
            layers["roads"]["elements"].append(el)
        if "building" in tags:
            layers["buildings"]["elements"].append(el)
        if tags.get("natural") == "water":
            layers["water"]["elements"].append(el)
        if "waterway" in tags:
            layers["waterways"]["elements"].append(el)
        if tags.get("leisure") == "park":
            layers["parks"]["elements"].append(el)
        if tags.get("landuse") == "forest":
            layers["forests"]["elements"].append(el)
    return layers