from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.feature_builder import build_feature_vector

router = APIRouter()


class BBoxRequest(BaseModel):
    bbox: list[float]  # [south, west, north, east]


@router.post("/analyze")
async def analyze(req: BBoxRequest):
    if len(req.bbox) != 4:
        raise HTTPException(status_code=422, detail="bbox must have exactly 4 values: [south, west, north, east]")

    south, west, north, east = req.bbox
    if south >= north or west >= east:
        raise HTTPException(status_code=422, detail="Invalid bbox: south must be < north, west must be < east")

    features = build_feature_vector(req.bbox)
    return {"features": features}