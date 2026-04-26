"""
Unit tests for feature extraction functions.
Run with: pytest backend/tests/test_features.py
"""
import math
from services.feature_builder import (
    haversine,
    compute_bearing,
    bbox_area_km2,
    bbox_from_point,
    road_network_density,
    road_network_entropy,
    building_density,
    water_coverage_ratio,
)


def test_haversine_same_point():
    p = {"lat": 48.85, "lon": 2.35}
    assert haversine(p, p) == pytest.approx(0.0)


def test_haversine_known_distance():
    # Paris → London ≈ 340 km
    import pytest
    paris  = {"lat": 48.8566, "lon": 2.3522}
    london = {"lat": 51.5074, "lon": -0.1278}
    dist_m = haversine(paris, london)
    assert 330_000 < dist_m < 350_000


def test_compute_bearing_north():
    a = {"lat": 0.0, "lon": 0.0}
    b = {"lat": 1.0, "lon": 0.0}
    assert compute_bearing(a, b) == pytest.approx(0.0, abs=0.5)


def test_bbox_area_km2_nonzero():
    bbox = [48.83, 2.29, 48.87, 2.37]
    area = bbox_area_km2(bbox)
    assert area > 0


def test_bbox_from_point_shape():
    bbox = bbox_from_point(48.85, 2.35, radius_km=5)
    assert len(bbox) == 4
    south, west, north, east = bbox
    assert south < north
    assert west < east


def test_road_network_density_empty():
    assert road_network_density({"elements": []}, area_km2=10.0) == 0.0


def test_road_network_entropy_empty():
    assert road_network_entropy({"elements": []}) == 0.0


def test_building_density_empty():
    assert building_density({"elements": []}, area_km2=10.0) == 0.0


def test_water_coverage_zero_area():
    assert water_coverage_ratio({"elements": []}, area_km2=0.0) == 0.0


import pytest
