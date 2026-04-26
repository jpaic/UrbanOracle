import numpy as np
import httpx
from config import OPEN_ELEVATION_URL


def fetch_elevation_grid(bbox: list[float], resolution: int = 20) -> np.ndarray:
    """
    Fetch a grid of elevation values for the given bounding box.

    Args:
        bbox: [south, west, north, east]
        resolution: number of sample points along each axis

    Returns:
        2D numpy array of elevation values in metres.

    Note:
        Uses the Open-Elevation API. For production, consider
        hosting local SRTM tiles with elevation-api or similar
        to avoid rate limits.
    """
    south, west, north, east = bbox
    lats = np.linspace(south, north, resolution)
    lons = np.linspace(west, east, resolution)

    locations = [
        {"latitude": round(float(lat), 6), "longitude": round(float(lon), 6)}
        for lat in lats
        for lon in lons
    ]

    response = httpx.post(
        OPEN_ELEVATION_URL,
        json={"locations": locations},
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()

    elevations = [r["elevation"] for r in data["results"]]
    return np.array(elevations, dtype=np.float32).reshape(resolution, resolution)
