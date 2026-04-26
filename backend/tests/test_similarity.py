"""
Unit tests for the ML similarity search.
Run with: pytest backend/tests/test_similarity.py
"""
import numpy as np
import pytest
from ml.similarity import find_similar
from ml.vectorizer import dict_to_array, FEATURE_KEYS


def _make_dummy_vectors(n: int = 20) -> tuple[np.ndarray, list[dict]]:
    rng = np.random.default_rng(42)
    vectors = rng.random((n, len(FEATURE_KEYS))).astype(np.float32)
    metadata = [{"name": f"City_{i}", "lat": float(i), "lon": float(i)} for i in range(n)]
    return vectors, metadata


def test_find_similar_returns_k_results():
    vectors, metadata = _make_dummy_vectors(20)
    query = vectors[0]
    results = find_similar(query, vectors, metadata, k=5)
    assert len(results) == 5


def test_find_similar_has_score():
    vectors, metadata = _make_dummy_vectors(10)
    results = find_similar(vectors[0], vectors, metadata, k=3)
    for r in results:
        assert "similarity_score" in r
        assert 0.0 <= r["similarity_score"] <= 1.0


def test_find_similar_most_similar_first():
    vectors, metadata = _make_dummy_vectors(10)
    results = find_similar(vectors[0], vectors, metadata, k=5)
    scores = [r["similarity_score"] for r in results]
    assert scores == sorted(scores, reverse=True)


def test_dict_to_array_order():
    feat = {k: float(i) for i, k in enumerate(FEATURE_KEYS)}
    arr = dict_to_array(feat)
    assert list(arr) == [float(i) for i in range(len(FEATURE_KEYS))]
