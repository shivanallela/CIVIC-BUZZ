"""
Civic Catalyst — AI Civic Priority Intelligence Engine
Policy Engine for Deterministic 0-100 Priority Scoring, Department Recommendation,
SLA Calculation, Duplicate Detection, & Explainable AI Decisions.
"""
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import math


# Configurable Priority Tier Thresholds & SLAs
PRIORITY_THRESHOLDS = {
    "LOW": (0, 24),
    "MEDIUM": (25, 49),
    "HIGH": (50, 74),
    "CRITICAL": (75, 100),
}

DEFAULT_SLA_HOURS = {
    "CRITICAL": 6,
    "HIGH": 24,
    "MEDIUM": 72,
    "LOW": 168,  # 7 Days
}

CATEGORY_DEPARTMENT_MAP = {
    "Roads & Infrastructure": "Roads & Infrastructure Department",
    "Water Supply": "Water Supply & Sanitation Board",
    "Street Lighting": "Electrical & Street Lighting Dept",
    "Electricity-related Civic Issue": "Electricity Board (TSSPDCL / DISCOM)",
    "Sanitation & Waste": "Sanitation & Waste Management",
    "Sanitation": "Sanitation & Waste Management",
    "Drainage": "Drainage & Sewerage Department",
    "Public Facilities": "Public Works & Panchayat Buildings",
    "Health & Other": "Public Health & Sanitation Dept",
    "Environmental Issue": "Environment & Forest Wing",
    "Other": "General Panchayat Administration",
}
EMERGENCY_FIRE_KEYWORDS = [
    "fire", "flame", "smoke", "explosion", "blaze", "gas leak", "burning",
    "cylinder blast", "cylinder explosion", "forest fire", "building fire", "house fire"
]
EMERGENCY_SHOCK_KEYWORDS = [
    "shock", "current", "electrocution", "live wire", "sparking", "short circuit",
    "transformer fire", "high voltage", "current shock", "electric shock", "fallen wire",
    "broken wire", "cable snapped", "open wire", "power line down", "sparking pole"
]


def recommend_department(category: str, description: str = "") -> Tuple[str, float]:
    """
    Deterministically maps issue category to municipal department,
    with description keyword fallback and emergency overrides.
    """
    desc_lower = (category + " " + description).lower()

    if any(w in desc_lower for w in EMERGENCY_FIRE_KEYWORDS):
        return "Fire & Disaster Emergency Services (Call 101 - Rapid Action)", 0.99
    if any(w in desc_lower for w in EMERGENCY_SHOCK_KEYWORDS):
        return "Electricity Board Emergency Rapid Action Wing (TSSPDCL / DISCOM - Call 1912)", 0.99

    dept = CATEGORY_DEPARTMENT_MAP.get(category)
    confidence = 0.95

    if not dept:
        if any(w in desc_lower for w in ["water", "pipe", "leak", "tap"]):
            dept = CATEGORY_DEPARTMENT_MAP["Water Supply"]
            confidence = 0.85
        elif any(w in desc_lower for w in ["road", "pothole", "asphalt", "bridge"]):
            dept = CATEGORY_DEPARTMENT_MAP["Roads & Infrastructure"]
            confidence = 0.85
        elif any(w in desc_lower for w in ["wire", "light", "pole", "transformer"]):
            dept = CATEGORY_DEPARTMENT_MAP["Street Lighting"]
            confidence = 0.85
        elif any(w in desc_lower for w in ["garbage", "dump", "trash", "waste"]):
            dept = CATEGORY_DEPARTMENT_MAP["Sanitation & Waste"]
            confidence = 0.85
        elif any(w in desc_lower for w in ["drain", "sewer", "gutter", "flood"]):
            dept = CATEGORY_DEPARTMENT_MAP["Drainage"]
            confidence = 0.85
        else:
            dept = CATEGORY_DEPARTMENT_MAP["Other"]
            confidence = 0.60

    return dept, confidence


def get_recommended_sla(priority_tier: str) -> float:
    """Returns recommended response SLA in hours based on priority tier."""
    return DEFAULT_SLA_HOURS.get(priority_tier.upper(), 72)


def calculate_priority_score(
    ai_observations: Dict[str, Any],
    location_context: Dict[str, Any],
    historical_signals: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Deterministic Weighted Priority Scoring Engine.
    Combines AI vision observations with spatial, service, historical, freshness, and emergency signals.
    Emergency fire/current shock issues automatically receive CRITICAL 100 score & 0.5 Hour (30 Mins) Rapid SLA.
    """
    cat = ai_observations.get("category", "")
    text_desc = (ai_observations.get("description", "") + " " + location_context.get("location", "") + " " + cat).lower()

    # Check emergency fire or electric shock hazards
    is_fire_emergency = any(w in text_desc for w in EMERGENCY_FIRE_KEYWORDS)
    is_shock_emergency = any(w in text_desc for w in EMERGENCY_SHOCK_KEYWORDS)
    is_life_emergency = is_fire_emergency or is_shock_emergency

    # ── 1. Visual Severity Score (0 - 25) ──────────────────────────────────
    severity = str(ai_observations.get("severity", "MEDIUM")).upper()
    if is_life_emergency:
        severity = "CRITICAL"
    severity_map = {"LOW": 5, "MEDIUM": 12, "HIGH": 20, "CRITICAL": 25}
    severity_score = severity_map.get(severity, 12)

    # ── 2. Safety Risk Score (0 - 20) ──────────────────────────────────────
    safety_risk = str(ai_observations.get("safety_risk", "LOW")).upper()
    if is_life_emergency:
        safety_risk = "CRITICAL"
    safety_map = {"NONE": 2, "LOW": 5, "MEDIUM": 10, "HIGH": 16, "CRITICAL": 20}
    safety_score = safety_map.get(safety_risk, 5)

    # ── 3. Population & Location Impact Score (0 - 20) ─────────────────────
    affected_area = str(ai_observations.get("affected_area", "STREET")).upper()
    area_map = {"LOCAL": 4, "STREET": 8, "WARD": 14, "MULTI-WARD": 18, "UNKNOWN": 8}
    area_score = area_map.get(affected_area, 8)

    # Facility Proximity Signal (school, hospital, market, main road)
    proximity_boost = 0
    if any(k in text_desc for k in ["school", "hospital", "phc", "clinic", "market", "bus", "main road", "highway"]):
        proximity_boost = 2

    population_score = min(20, area_score + proximity_boost)

    # ── 4. Essential Service & Accessibility Impact (0 - 15) ────────────────
    accessibility_impact = ai_observations.get("accessibility_impact", [])
    if isinstance(accessibility_impact, str):
        accessibility_impact = [accessibility_impact]

    service_score = 0
    if cat in ["Water Supply", "Electricity-related Civic Issue", "Health & Other", "Electricity"]:
        service_score += 6
    elif cat in ["Roads & Infrastructure", "Drainage", "Sanitation & Waste"]:
        service_score += 4

    impact_lower = [str(x).lower() for x in accessibility_impact]
    if any(i in impact_lower for i in ["emergency vehicles", "ambulance", "hospital", "elderly"]):
        service_score += 6
    elif any(i in impact_lower for i in ["children", "pedestrians", "vehicles"]):
        service_score += 3

    essential_service_score = min(15, service_score)

    # ── 5. Recurrence / Historical Signal (0 - 10) ─────────────────────────
    similar_recent_count = historical_signals.get("recent_complaints_count", 0)
    unresolved_nearby = historical_signals.get("unresolved_nearby_count", 0)
    
    recurrence_score = 0
    if similar_recent_count >= 3 or unresolved_nearby >= 2:
        recurrence_score = 10
    elif similar_recent_count >= 1 or unresolved_nearby >= 1:
        recurrence_score = 6
    else:
        recurrence_score = 2

    # ── 6. Freshness & Escalation Signal (0 - 10) ──────────────────────────
    is_new = historical_signals.get("is_new_report", True)
    is_escalated = historical_signals.get("is_escalated", False)
    
    escalation_score = 5
    if is_escalated or is_life_emergency:
        escalation_score = 10
    elif is_new and severity in ["HIGH", "CRITICAL"]:
        escalation_score = 8

    # ── Total Weighted Calculation ──────────────────────────────────────────
    raw_total = (
        severity_score
        + safety_score
        + population_score
        + essential_service_score
        + recurrence_score
        + escalation_score
    )
    final_score = min(100, max(0, int(round(raw_total))))

    if is_life_emergency:
        final_score = 100
        priority_tier = "CRITICAL"
        sla_hours = 0.5  # 30 Minutes Rapid Emergency Response SLA (Never 6+ hours)
    else:
        # Determine Tier
        if final_score >= 75:
            priority_tier = "CRITICAL"
        elif final_score >= 50:
            priority_tier = "HIGH"
        elif final_score >= 25:
            priority_tier = "MEDIUM"
        else:
            priority_tier = "LOW"
        sla_hours = get_recommended_sla(priority_tier)

    dept, dept_conf = recommend_department(cat, text_desc)

    # Confidence calculation
    raw_conf = ai_observations.get("confidence")
    ai_vision_conf = float(raw_conf) if raw_conf is not None else 0.92
    overall_confidence = round((ai_vision_conf * 0.5) + (dept_conf * 0.5), 2)
    needs_human_review = ai_vision_conf < 0.75 or overall_confidence < 0.75 or priority_tier == "CRITICAL"

    # Explanations
    explanation_bullets = generate_explanation_bullets(
        severity=severity,
        safety_risk=safety_risk,
        affected_area=affected_area,
        category=cat,
        proximity_boost=proximity_boost > 0,
        historical_count=similar_recent_count,
        priority_tier=priority_tier,
        score=final_score,
    )

    if is_fire_emergency:
        explanation_bullets.insert(0, "🚨 FIRE / EXPLOSION HAZARD: Immediate life-safety emergency — 30-Minute Rapid Action SLA (Call 101 Fire Emergency)")
    elif is_shock_emergency:
        explanation_bullets.insert(0, "🚨 ELECTRIC SHOCK / LIVE WIRE HAZARD: Immediate electrocution risk — 30-Minute Rapid Action SLA (TSSPDCL Emergency Wing Call 1912)")

    factors_breakdown = {
        "visual_severity_score": severity_score,
        "visual_severity_max": 25,
        "safety_risk_score": safety_score,
        "safety_risk_max": 20,
        "population_impact_score": population_score,
        "population_impact_max": 20,
        "essential_service_score": essential_service_score,
        "essential_service_max": 15,
        "historical_recurrence_score": recurrence_score,
        "historical_recurrence_max": 10,
        "freshness_escalation_score": escalation_score,
        "freshness_escalation_max": 10,
    }

    return {
        "priority_score": final_score,
        "priority_tier": priority_tier,
        "recommended_department": dept,
        "department_confidence": dept_conf,
        "recommended_sla_hours": sla_hours,
        "confidence": overall_confidence,
        "needs_human_review": needs_human_review,
        "factors_breakdown": factors_breakdown,
        "explanation_bullets": explanation_bullets,
    }


def generate_explanation_bullets(
    severity: str,
    safety_risk: str,
    affected_area: str,
    category: str,
    proximity_boost: bool,
    historical_count: int,
    priority_tier: str,
    score: int,
) -> List[str]:
    """Generates structured, fact-based bullet points explaining the priority score."""
    bullets = []

    if severity in ["HIGH", "CRITICAL"]:
        bullets.append(f"Severe {category.lower()} issue detected from visual evidence")
    elif severity == "MEDIUM":
        bullets.append(f"Moderate surface & structural disruption observed")
    else:
        bullets.append(f"Minor localized issue identified")

    if safety_risk in ["HIGH", "CRITICAL"]:
        bullets.append("High public safety and accident risk for villagers and vehicles")
    elif safety_risk == "MEDIUM":
        bullets.append("Potential safety hazard during night hours or rain")

    if proximity_boost:
        bullets.append("Located near critical public infrastructure (school / health center / main road)")

    if affected_area in ["WARD", "MULTI-WARD"]:
        bullets.append(f"Broad impact covering entire {affected_area.lower()} section")

    if historical_count > 0:
        bullets.append(f"Recurrent pattern: {historical_count} similar report(s) filed recently nearby")

    if priority_tier == "CRITICAL":
        bullets.append("Immediate Panchayat dispatch & containment required (SLA: 6h)")

    return bullets


def detect_duplicate_complaint(
    new_complaint: Dict[str, Any],
    existing_complaints: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Checks new complaint against active complaints for spatial/textual/category duplicates.
    Returns possible_duplicate, duplicate_confidence, and related_complaint_id.
    """
    if not existing_complaints:
        return {"possible_duplicate": False, "duplicate_confidence": 0.0, "related_complaint_id": None}

    new_cat = (new_complaint.get("category") or "").lower()
    new_loc = (new_complaint.get("location") or "").lower()
    new_title = (new_complaint.get("title") or "").lower()

    for item in existing_complaints:
        if item.get("status") == "resolved":
            continue

        item_cat = (item.get("category") or "").lower()
        item_loc = (item.get("location") or "").lower()
        item_title = (item.get("title") or "").lower()

        # Check location match and category match
        cat_match = (new_cat == item_cat) or (new_cat in item_cat) or (item_cat in new_cat)
        loc_match = (new_loc and item_loc) and ((new_loc in item_loc) or (item_loc in new_loc))
        
        # Word overlap in title
        new_words = set(w for w in new_title.split() if len(w) > 3)
        item_words = set(w for w in item_title.split() if len(w) > 3)
        common_words = new_words.intersection(item_words)
        title_similar = len(common_words) >= 2

        if cat_match and (loc_match or title_similar):
            confidence = 0.88 if (loc_match and title_similar) else 0.72
            return {
                "possible_duplicate": True,
                "duplicate_confidence": confidence,
                "related_complaint_id": item.get("id") or item.get("complaint_id_code"),
            }

    return {"possible_duplicate": False, "duplicate_confidence": 0.0, "related_complaint_id": None}


def safe_fallback_priority(category: str, title: str) -> Dict[str, Any]:
    """Graceful degradation fallback when AI engine or external vision service is offline."""
    desc_lower = (category + " " + title).lower()
    is_fire = any(w in desc_lower for w in EMERGENCY_FIRE_KEYWORDS)
    is_shock = any(w in desc_lower for w in EMERGENCY_SHOCK_KEYWORDS)
    is_emergency = is_fire or is_shock

    dept, _ = recommend_department(category, title)

    if is_emergency:
        return {
            "priority_score": 100,
            "priority_tier": "CRITICAL",
            "recommended_department": dept,
            "department_confidence": 0.99,
            "recommended_sla_hours": 0.5,
            "confidence": 0.95,
            "needs_human_review": True,
            "factors_breakdown": {
                "visual_severity_score": 25,
                "visual_severity_max": 25,
                "safety_risk_score": 20,
                "safety_risk_max": 20,
                "population_impact_score": 18,
                "population_impact_max": 20,
                "essential_service_score": 15,
                "essential_service_max": 15,
                "historical_recurrence_score": 6,
                "historical_recurrence_max": 10,
                "freshness_escalation_score": 10,
                "freshness_escalation_max": 10,
            },
            "explanation_bullets": [
                f"🚨 {'FIRE / EXPLOSION' if is_fire else 'ELECTRIC SHOCK / LIVE WIRE'} EMERGENCY: Immediate rapid response required (SLA: 30 Mins)",
                f"Auto-routed to {dept} for emergency containment",
            ],
        }

    return {
        "priority_score": 35,
        "priority_tier": "MEDIUM",
        "recommended_department": dept,
        "department_confidence": 0.70,
        "recommended_sla_hours": 72,
        "confidence": 0.60,
        "needs_human_review": True,
        "factors_breakdown": {
            "visual_severity_score": 10,
            "visual_severity_max": 25,
            "safety_risk_score": 5,
            "safety_risk_max": 20,
            "population_impact_score": 8,
            "population_impact_max": 20,
            "essential_service_score": 4,
            "essential_service_max": 15,
            "historical_recurrence_score": 3,
            "historical_recurrence_max": 10,
            "freshness_escalation_score": 5,
            "freshness_escalation_max": 10,
        },
        "explanation_bullets": [
            "AI Vision service offline — Safe default fallback applied",
            "Assigned MEDIUM priority (72h SLA) requiring Panchayat human verification",
        ],
    }
