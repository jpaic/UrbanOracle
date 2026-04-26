import json
import numpy as np
from sklearn.neighbors import NearestNeighbors


def load_index(vectors_path: str, meta_path: str) -> tuple[np.ndarray, list[dict]]:
    """Load precomputed city feature matrix and metadata."""
    vectors = np.load(vectors_path)
    with open(meta_path) as f:
        metadata = json.load(f)
    return vectors, metadata


def find_similar(
    query_vector: np.ndarray,
    city_vectors: np.ndarray,
    city_metadata: list[dict],
    k: int = 10,
    metric: str = "cosine",
) -> list[dict]:
    """
    Return the top-k most structurally similar cities.

    Args:
        query_vector: normalized 1-D feature array (8 dims)
        city_vectors: (N, 8) matrix of all precomputed city vectors
        city_metadata: list of dicts with at least {name, lat, lon}
        k: number of results to return
        metric: 'cosine' (recommended) or 'euclidean'

    Returns:
        List of dicts: city metadata + similarity_score
    """
    n_neighbors = min(k + 1, len(city_vectors))
    knn = NearestNeighbors(n_neighbors=n_neighbors, metric=metric, algorithm="brute")
    knn.fit(city_vectors)
    distances, indices = knn.kneighbors(query_vector.reshape(1, -1))

    results = []
    for dist, idx in zip(distances[0][1:], indices[0][1:]):
        similarity = 1.0 - float(dist) if metric == "cosine" else 1.0 / (1.0 + float(dist))
        results.append({
            **city_metadata[idx],
            "similarity_score": round(similarity, 4),
        })
    return results
