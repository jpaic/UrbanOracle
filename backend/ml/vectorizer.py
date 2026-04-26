import pickle
import numpy as np
from sklearn.preprocessing import StandardScaler

FEATURE_KEYS = [
    "road_density",
    "road_entropy",
    "building_density",
    "building_regularity",
    "water_coverage",
    "river_density",
    "elevation_variance",
    "green_space_ratio",
]


def dict_to_array(feature_dict: dict) -> np.ndarray:
    """Convert a feature dict to a numpy array in the canonical key order."""
    return np.array([feature_dict[k] for k in FEATURE_KEYS], dtype=np.float32)


def load_scaler(path: str) -> StandardScaler:
    with open(path, "rb") as f:
        return pickle.load(f)


def save_scaler(scaler: StandardScaler, path: str) -> None:
    with open(path, "wb") as f:
        pickle.dump(scaler, f)


def fit_and_save_scaler(matrix: np.ndarray, path: str) -> StandardScaler:
    scaler = StandardScaler()
    scaler.fit(matrix)
    save_scaler(scaler, path)
    return scaler
