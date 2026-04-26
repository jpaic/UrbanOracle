import os
from dotenv import load_dotenv

load_dotenv()

OVERPASS_URL       = os.getenv("OVERPASS_URL", "https://overpass-api.de/api/interpreter")
OPEN_ELEVATION_URL = os.getenv("OPEN_ELEVATION_URL", "https://api.open-elevation.com/api/v1/lookup")
CITY_VECTORS_PATH  = os.getenv("CITY_VECTORS_PATH", "data/city_vectors.npy")
CITY_INDEX_PATH    = os.getenv("CITY_INDEX_PATH",   "data/city_index.json")
SCALER_PATH        = os.getenv("SCALER_PATH",        "data/scaler.pkl")
OVERPASS_TIMEOUT   = int(os.getenv("OVERPASS_TIMEOUT", "40"))
