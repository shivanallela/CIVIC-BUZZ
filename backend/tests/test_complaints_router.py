"""
Civic -Buzz — Complaints Router Unit & Integration Tests
"""
import pytest
import os
import sys
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from routers.complaints import (
    analyze_issue_image,
    reverse_geocode,
    ImageAnalysisRequest,
    GeocodeRequest,
    ComplaintCreateRequest,
    PriorityOverrideRequest,
)


def test_analyze_fire_image():
    req = ImageAnalysisRequest(filename="fire_outbreak_market.jpg", location="Ward 2")
    res = asyncio.run(analyze_issue_image(req))

    assert res.success is True
    assert res.category == "Fire & Disaster Emergency"
    assert res.priority_score == 100
    assert res.priority_tier == "CRITICAL"
    assert res.recommended_sla_hours == 0.5
    assert "Fire" in res.recommended_department
    assert "101" in res.recommended_department


def test_analyze_shock_image():
    req = ImageAnalysisRequest(filename="broken_live_wire_current_shock.png", location="Ward 1")
    res = asyncio.run(analyze_issue_image(req))

    assert res.success is True
    assert res.category == "Electricity-related Civic Issue"
    assert res.priority_score == 100
    assert res.priority_tier == "CRITICAL"
    assert res.recommended_sla_hours == 0.5
    assert "Electricity" in res.recommended_department
    assert "1912" in res.recommended_department


def test_analyze_water_leak_image():
    req = ImageAnalysisRequest(filename="broken_water_pipe.png", location="Ward 4")
    res = asyncio.run(analyze_issue_image(req))

    assert res.success is True
    assert res.category == "Water Supply"
    assert res.priority_score >= 60
    assert res.priority_tier in ["HIGH", "CRITICAL"]


def test_reverse_geocode():
    req = GeocodeRequest(latitude=17.9689, longitude=79.5941)
    res = asyncio.run(reverse_geocode(req))

    assert res["success"] is True
    assert "Ward 4" in res["location"]
    assert res["mandal"] == "Shyampet"


def test_complaint_schemas():
    create_req = ComplaintCreateRequest(
        title="Fire hazard at garbage dump",
        category="Fire & Disaster Emergency",
        recommended_sla_hours=0.5,
    )
    assert create_req.recommended_sla_hours == 0.5

    override_req = PriorityOverrideRequest(
        priority_score=100,
        priority_tier="CRITICAL",
        recommended_sla_hours=0.5,
        override_reason="Verified fire emergency",
    )
    assert override_req.recommended_sla_hours == 0.5
