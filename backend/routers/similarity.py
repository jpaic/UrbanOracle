from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import numpy as np
from ml.vectorizer import dict_to_array, load_scaler
from ml.similarity import load_index, find_similar
from config import CITY_VECTORS_PATH, CITY_INDEX_PATH, SCALER_PATH
import os

router = APIRouter()

# Load index and scaler once at startup (will be None if files don't exist yet)
_city_vectors = None
_city_metadata = None
_scaler = None


def _ensure_loaded():
    global _city_vectors, _city_metadata, _scaler
    if _city_vectors is None:
        if not os.path.exists(CITY_VECTORS_PATH):
            raise HTTPException(
                status_code=503,
                detail="City index not built yet. Run scripts/build_city_index.py first.",
            )
        _city_vectors, _city_metadata = load_index(CITY_VECTORS_PATH, CITY_INDEX_PATH)
        _scaler = load_scaler(SCALER_PATH)


class SimilarityRequest(BaseModel):
    features: dict
    k: int = 10


@router.post("/similarity")
async def similarity(req: SimilarityRequest):
    _ensure_loaded()
    raw = dict_to_array(req.features)
    normalized = _scaler.transform(raw.reshape(1, -1)).flatten()
    results = find_similar(normalized, _city_vectors, _city_metadata, k=req.k)
    return {"results": results}
