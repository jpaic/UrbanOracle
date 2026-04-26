"""
Tests for the Overpass API client.
Run with: pytest backend/tests/test_overpass.py
"""
import pytest
from unittest.mock import patch, MagicMock
from services.overpass import query_overpass

SAMPLE_BBOX = [48.83, 2.29, 48.87, 2.37]  # central Paris


def test_query_overpass_returns_dict():
    mock_response = MagicMock()
    mock_response.json.return_value = {"elements": []}
    mock_response.raise_for_status = MagicMock()

    with patch("services.overpass.httpx.post", return_value=mock_response):
        result = query_overpass(SAMPLE_BBOX, "way", {"highway": True})

    assert isinstance(result, dict)
    assert "elements" in result


def test_query_overpass_tag_filter_true():
    """Tags with value True should produce [\"key\"] not [\"key\"=\"True\"]."""
    captured = {}

    def fake_post(url, data, timeout):
        captured["query"] = data["data"]
        mock = MagicMock()
        mock.json.return_value = {"elements": []}
        mock.raise_for_status = MagicMock()
        return mock

    with patch("services.overpass.httpx.post", side_effect=fake_post):
        query_overpass(SAMPLE_BBOX, "way", {"highway": True})

    assert '["highway"]' in captured["query"]
    assert '["highway"="True"]' not in captured["query"]
