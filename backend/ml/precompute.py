"""
Helper utilities used by the build_city_index script.
Not called at API runtime.
"""
import os
import json
import numpy as np
from ml.vectorizer import dict_to_array, fit_and_save_scaler
from config import CITY_VECTORS_PATH, CITY_INDEX_PATH, SCALER_PATH


def _resolve(path: str) -> str:
    """Make relative paths absolute from the backend/ directory."""
    if os.path.isabs(path):
        return path
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(backend_dir, path)


def save_index(raw_vectors: list, metadata: list) -> None:
    """Fit scaler, normalise, and persist city index to disk."""
    vectors_path = _resolve(CITY_VECTORS_PATH)
    index_path   = _resolve(CITY_INDEX_PATH)
    scaler_path  = _resolve(SCALER_PATH)

    # Ensure data/ directory exists
    os.makedirs(os.path.dirname(vectors_path), exist_ok=True)

    matrix = np.array(raw_vectors, dtype=np.float32)
    scaler = fit_and_save_scaler(matrix, scaler_path)
    scaled = scaler.transform(matrix)
    np.save(vectors_path, scaled)
    with open(index_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved {len(metadata)} cities → {vectors_path}")