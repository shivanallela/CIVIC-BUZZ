"""
Civic -Buzz — AI Civic Priority Intelligence Engine Test Suite
Tests covering all 7 mandatory priority scoring & audit scenarios.
"""
import pytest
import sys
import os

# Add parent directory to path for backend module imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from priority_engine import (
    calculate_priority_score,
    recommend_department,
    get_recommended_sla,
    detect_duplicate_complaint,
    safe_fallback_priority,
)


def test_scenario_1_severe_road_damage_near_school():
    """Scenario 1: Severe road damage + school proximity ➔ CRITICAL priority tier."""
    ai_obs = {
        "category": "Roads & Infrastructure",
        "severity": "CRITICAL",
        "safety_risk": "HIGH",
        "affected_area": "MULTI-WARD",
        "accessibility_impact": ["school", "vehicles", "emergency vehicles"],
        "description": "Deep asphalt trench in front of Primary School",
        "confidence": 0.96,
    }
    location_ctx = {"location": "Main Road near Primary School, Ward 4"}
    hist_signals = {"recent_complaints_count": 3, "unresolved_nearby_count": 2, "is_new_report": True, "is_escalated": True}

    res = calculate_priority_score(ai_obs, location_ctx, hist_signals)

    assert res["priority_score"] >= 75
    assert res["priority_tier"] == "CRITICAL"
    assert res["recommended_sla_hours"] == 6
    assert "Roads" in res["recommended_department"]
    assert len(res["explanation_bullets"]) >= 2


def test_scenario_2_minor_streetlight_defect():
    """Scenario 2: Minor streetlight issue ➔ LOW / MEDIUM priority tier."""
    ai_obs = {
        "category": "Street Lighting",
        "severity": "LOW",
        "safety_risk": "LOW",
        "affected_area": "LOCAL",
        "accessibility_impact": ["pedestrians"],
        "description": "Flickering street lamp fixture near residential lane",
        "confidence": 0.94,
    }
    location_ctx = {"location": "Lane 3, Ward 1"}
    hist_signals = {"recent_complaints_count": 0, "unresolved_nearby_count": 0, "is_new_report": True, "is_escalated": False}

    res = calculate_priority_score(ai_obs, location_ctx, hist_signals)

    assert res["priority_score"] < 50
    assert res["priority_tier"] in ["LOW", "MEDIUM"]
    assert res["recommended_sla_hours"] in [72, 168]


def test_scenario_3_major_drinking_water_failure():
    """Scenario 3: Major drinking water failure ➔ HIGH / CRITICAL tier."""
    ai_obs = {
        "category": "Water Supply",
        "severity": "CRITICAL",
        "safety_risk": "HIGH",
        "affected_area": "WARD",
        "accessibility_impact": ["hospital", "residents"],
        "description": "Main water supply pipe burst flooding Ward 2",
        "confidence": 0.95,
    }
    location_ctx = {"location": "Water Tank Road, Ward 2"}
    hist_signals = {"recent_complaints_count": 4, "unresolved_nearby_count": 2, "is_new_report": True, "is_escalated": True}

    res = calculate_priority_score(ai_obs, location_ctx, hist_signals)

    assert res["priority_score"] >= 70
    assert res["priority_tier"] in ["HIGH", "CRITICAL"]
    assert "Water" in res["recommended_department"]


def test_scenario_4_ai_unavailable_graceful_fallback():
    """Scenario 4: AI model unavailable ➔ Safe fallback to MEDIUM + Human review flag."""
    fallback = safe_fallback_priority("Roads & Infrastructure", "Damaged Road surface")

    assert fallback["priority_tier"] == "MEDIUM"
    assert fallback["priority_score"] == 35
    assert fallback["recommended_sla_hours"] == 72
    assert fallback["needs_human_review"] is True
    assert "offline" in fallback["explanation_bullets"][0].lower()


def test_scenario_5_low_confidence_flagged_for_review():
    """Scenario 5: Low confidence AI result ➔ Flagged for human review."""
    ai_obs = {
        "category": "Sanitation",
        "severity": "MEDIUM",
        "safety_risk": "LOW",
        "affected_area": "STREET",
        "accessibility_impact": [],
        "description": "Unclear blur image of waste pile",
        "confidence": 0.55,  # Low confidence < 0.75
    }
    location_ctx = {"location": "Ward 3"}
    hist_signals = {"recent_complaints_count": 0, "unresolved_nearby_count": 0, "is_new_report": True, "is_escalated": False}

    res = calculate_priority_score(ai_obs, location_ctx, hist_signals)

    assert res["needs_human_review"] is True


def test_scenario_6_duplicate_complaint_detection():
    """Scenario 6: Possible duplicate complaint detection logic."""
    new_comp = {
        "category": "Water Supply",
        "location": "Ward 4 Main Road",
        "title": "Water Pipeline Burst and Street Leakage",
    }
    existing = [
        {
            "id": "C-005",
            "complaint_id_code": "C-005",
            "category": "Water Supply",
            "location": "Ward 4 Main Road",
            "title": "Water Pipe Burst Flooding Road",
            "status": "pending",
        }
    ]

    dup_res = detect_duplicate_complaint(new_comp, existing)

    assert dup_res["possible_duplicate"] is True
    assert dup_res["duplicate_confidence"] >= 0.70
    assert dup_res["related_complaint_id"] == "C-005"


def test_scenario_7_panchayat_override_audit_fields():
    """Scenario 7: Panchayat human override audit data structure validation."""
    override_payload = {
        "priority_score": 85,
        "priority_tier": "CRITICAL",
        "recommended_department": "Emergency Public Works Dept",
        "recommended_sla_hours": 6,
        "override_reason": "Vip visit route & school access blocked",
        "official_name": "Gram Sarpanch Ramesh",
    }

    assert override_payload["priority_score"] == 85
    assert override_payload["priority_tier"] == "CRITICAL"
    assert override_payload["recommended_sla_hours"] == 6
    assert len(override_payload["override_reason"]) > 5


def test_scenario_8_fire_emergency_ultra_fast_sla():
    """Scenario 8: Fire hazard emergency ➔ 100 CRITICAL score & 0.5h (30 Mins) Rapid Action SLA (Never 6h)."""
    ai_obs = {
        "category": "Fire & Disaster Emergency",
        "severity": "CRITICAL",
        "safety_risk": "CRITICAL",
        "affected_area": "WARD",
        "accessibility_impact": ["emergency vehicles", "residents"],
        "description": "Massive fire outbreak and gas cylinder explosion near market shops",
        "confidence": 0.99,
    }
    location_ctx = {"location": "Market Yard, Ward 3"}
    hist_signals = {"recent_complaints_count": 1, "unresolved_nearby_count": 1, "is_new_report": True, "is_escalated": True}

    res = calculate_priority_score(ai_obs, location_ctx, hist_signals)

    assert res["priority_score"] == 100
    assert res["priority_tier"] == "CRITICAL"
    assert res["recommended_sla_hours"] == 0.5  # 30 Mins Rapid Action SLA
    assert "Fire" in res["recommended_department"]
    assert "101" in res["recommended_department"]
    assert "30-Minute Rapid Action SLA" in res["explanation_bullets"][0]


def test_scenario_9_current_shock_emergency_ultra_fast_sla():
    """Scenario 9: Electric current shock / snapped live wire ➔ 100 CRITICAL score & 0.5h (30 Mins) Rapid Action SLA."""
    ai_obs = {
        "category": "Electricity-related Civic Issue",
        "severity": "CRITICAL",
        "safety_risk": "CRITICAL",
        "affected_area": "STREET",
        "accessibility_impact": ["pedestrians", "children"],
        "description": "High voltage snapped live wire sparking on flooded road causing electric shock hazard",
        "confidence": 0.98,
    }
    location_ctx = {"location": "Primary School Road, Ward 1"}
    hist_signals = {"recent_complaints_count": 0, "unresolved_nearby_count": 0, "is_new_report": True, "is_escalated": True}

    res = calculate_priority_score(ai_obs, location_ctx, hist_signals)

    assert res["priority_score"] == 100
    assert res["priority_tier"] == "CRITICAL"
    assert res["recommended_sla_hours"] == 0.5  # 30 Mins Rapid Action SLA
    assert "Electricity Board" in res["recommended_department"]
    assert "1912" in res["recommended_department"]
    assert "30-Minute Rapid Action SLA" in res["explanation_bullets"][0]

