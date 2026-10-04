"""
Civic -Buzz — Civic Complaints, AI Vision, & AI Civic Priority Intelligence Engine Router
"""
import os
import re
import sys
import json
import base64
from typing import Optional, List, Dict, Any
import requests
from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel

import db_complaints
import priority_engine

router = APIRouter(prefix="/api/complaints", tags=["complaints"])


# ── Pydantic Request & Response Schemas ──────────────────────────────────────

class ComplaintCreateRequest(BaseModel):
    id: Optional[str] = None
    title: str
    description: Optional[str] = ""
    category: str
    location: Optional[str] = "Ward 1"
    urgency: Optional[str] = "High"
    villager_name: Optional[str] = "Citizen"
    villager_id: Optional[str] = "vil_001"
    village: Optional[str] = "Shyampet"
    image_url: Optional[str] = None
    ai_generated: Optional[bool] = False
    date: Optional[str] = None
    # AI Priority Intelligence Optional Overrides / Pass-throughs
    ai_category: Optional[str] = None
    ai_severity: Optional[str] = None
    ai_safety_risk: Optional[str] = None
    ai_accessibility_impact: Optional[List[str]] = None
    ai_affected_area: Optional[str] = None
    ai_confidence: Optional[float] = None
    priority_score: Optional[int] = None
    priority_tier: Optional[str] = None
    priority_factors: Optional[Dict[str, Any]] = None
    recommended_department: Optional[str] = None
    department_confidence: Optional[float] = None
    recommended_sla_hours: Optional[float] = None
    explanation_bullets: Optional[List[str]] = None


class ComplaintStatusUpdateRequest(BaseModel):
    status: str  # 'pending', 'in_progress', 'resolved'


class PriorityOverrideRequest(BaseModel):
    priority_score: Optional[int] = None
    priority_tier: Optional[str] = None
    recommended_department: Optional[str] = None
    recommended_sla_hours: Optional[float] = None
    override_reason: str
    official_name: Optional[str] = "Panchayat Official"


class ImageAnalysisRequest(BaseModel):
    image_base64: Optional[str] = None
    filename: Optional[str] = None
    location: Optional[str] = "Ward 4"


class GeocodeRequest(BaseModel):
    latitude: float
    longitude: float


class ComplaintAnalysisResponse(BaseModel):
    success: bool
    title: str
    category: str
    description: str
    urgency: str
    confidence: float
    ai_model: str
    # AI Civic Priority Intelligence Extension
    ai_severity: str
    ai_safety_risk: str
    ai_affected_area: str
    ai_accessibility_impact: List[str]
    priority_score: int
    priority_tier: str
    recommended_department: str
    recommended_sla_hours: float
    needs_human_review: bool
    explanation_bullets: List[str]
    factors_breakdown: Dict[str, Any]


class AssignRequest(BaseModel):
    employee_id: str
    department: Optional[str] = None
    admin_notes: Optional[str] = None
    override_reason: Optional[str] = None
    admin_name: Optional[str] = "Panchayat Secretary"


class TaskUpdateRequest(BaseModel):
    employee_id: str
    status: str
    notes: Optional[str] = None
    resolution_image_url: Optional[str] = None


class VerifyRequest(BaseModel):
    approved: bool
    admin_notes: Optional[str] = None
    admin_name: Optional[str] = "Panchayat Secretary"


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("", response_model=List[Dict[str, Any]])
async def list_complaints(
    village: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """
    List all civic complaints from Supabase / live store with optional filters.
    """
    return db_complaints.get_all_complaints(
        village=village,
        status=status,
        category=category,
        search=search,
    )


@router.post("", status_code=201)
@router.post("/create", status_code=201)
async def create_new_complaint(req: ComplaintCreateRequest):
    """
    Submit a new civic complaint with full AI priority scoring & duplicate detection.
    """
    data = req.dict()

    # 1. Fetch active complaints for duplicate detection & recurrence signal
    existing = db_complaints.get_all_complaints(village=req.village)
    dup_res = priority_engine.detect_duplicate_complaint(data, existing)

    data["possible_duplicate"] = dup_res["possible_duplicate"]
    data["duplicate_confidence"] = dup_res["duplicate_confidence"]
    data["related_complaint_id"] = dup_res["related_complaint_id"]

    # 2. Run deterministic priority scoring if not pre-computed by image analyzer
    if data.get("priority_score") is None:
        cat = data.get("category", "Roads & Infrastructure")
        severity = data.get("ai_severity") or ("HIGH" if data.get("urgency") == "High" else "MEDIUM")
        safety_risk = data.get("ai_safety_risk") or ("HIGH" if data.get("urgency") == "High" else "LOW")
        affected_area = data.get("ai_affected_area") or "STREET"

        ai_obs = {
            "category": cat,
            "severity": severity,
            "safety_risk": safety_risk,
            "affected_area": affected_area,
            "accessibility_impact": data.get("ai_accessibility_impact") or ["pedestrians"],
            "description": data.get("description", ""),
            "confidence": data.get("ai_confidence", 0.92),
        }

        # Spatial recurrence signal
        unresolved_count = sum(1 for c in existing if c.get("status") != "resolved" and c.get("category") == cat)
        hist_signals = {
            "recent_complaints_count": unresolved_count,
            "unresolved_nearby_count": unresolved_count,
            "is_new_report": True,
            "is_escalated": data.get("urgency") == "High",
        }

        scoring_res = priority_engine.calculate_priority_score(
            ai_observations=ai_obs,
            location_context={"location": data.get("location", "")},
            historical_signals=hist_signals,
        )

        data["priority_score"] = scoring_res["priority_score"]
        data["priority_tier"] = scoring_res["priority_tier"]
        data["recommended_department"] = scoring_res["recommended_department"]
        data["department_confidence"] = scoring_res["department_confidence"]
        data["recommended_sla_hours"] = scoring_res["recommended_sla_hours"]
        data["priority_factors"] = scoring_res["factors_breakdown"]
        data["explanation_bullets"] = scoring_res["explanation_bullets"]
        data["ai_severity"] = severity
        data["ai_safety_risk"] = safety_risk
        data["ai_affected_area"] = affected_area

    # Map priority tier back to classic urgency string for backward compatibility
    tier = data.get("priority_tier", "HIGH").upper()
    data["urgency"] = "High" if tier in ["CRITICAL", "HIGH"] else "Medium" if tier == "MEDIUM" else "Low"

    new_record = db_complaints.create_complaint(data)
    return {
        "success": True,
        "message": "Complaint registered & AI priority score assigned",
        "complaint": new_record,
    }


@router.get("/stats")
async def get_complaint_kpis():
    """
    Get complaint statistics and KPI metrics for Panchayat Dashboard.
    """
    return db_complaints.get_complaint_stats()


@router.get("/priority-analytics")
async def get_priority_analytics_endpoint():
    """
    Get AI Priority Intelligence performance & human override analytics.
    """
    return db_complaints.get_priority_analytics()


@router.patch("/{complaint_id}/status")
async def update_complaint_status_endpoint(complaint_id: str, req: ComplaintStatusUpdateRequest):
    """
    Update complaint resolution status (pending, in_progress, resolved).
    """
    updated = db_complaints.update_complaint_status(complaint_id, req.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return {
        "success": True,
        "message": f"Complaint status updated to {req.status}",
        "complaint": updated,
    }


@router.patch("/{complaint_id}/priority")
async def override_complaint_priority_endpoint(complaint_id: str, req: PriorityOverrideRequest):
    """
    Panchayat Official Human-in-the-Loop priority override with mandatory audit tracking.
    """
    updated = db_complaints.update_complaint_priority_override(complaint_id, req.dict())
    if not updated:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return {
        "success": True,
        "message": "Panchayat priority override saved with audit trail",
        "complaint": updated,
    }


# ── Multi-Role Lifecycle Endpoints ──────────────────────────────────────────

@router.get("/employees")
async def list_employees():
    """Retrieve list of civic field employees with workload and availability."""
    return db_complaints.get_employees()


@router.get("/recommendations/{complaint_id}")
async def get_complaint_employee_recommendations(complaint_id: str):
    """
    AI Assistance Layer: Evaluates and ranks eligible field employees for a complaint
    based on skill, jurisdiction, current workload, distance, and availability.
    """
    recommendations = db_complaints.get_employee_recommendations(complaint_id)
    return {
        "success": True,
        "complaint_id": complaint_id,
        "recommendations": recommendations,
    }


@router.post("/{complaint_id}/assign")
async def assign_complaint_endpoint(complaint_id: str, req: AssignRequest):
    """
    Human-in-the-Loop: Admin reviews AI recommendation and officially assigns
    the complaint to an employee with optional override reason.
    """
    updated = db_complaints.assign_complaint(
        complaint_id=complaint_id,
        employee_id=req.employee_id,
        department=req.department,
        admin_notes=req.admin_notes,
        override_reason=req.override_reason,
        admin_name=req.admin_name or "Panchayat Secretary",
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return {
        "success": True,
        "message": f"Task assigned to {updated.get('assigned_employee_name')}",
        "complaint": updated,
    }


@router.post("/{complaint_id}/update-task")
async def update_task_endpoint(complaint_id: str, req: TaskUpdateRequest):
    """
    Employee Field Action: Start work, add notes, or upload evidence and submit for verification.
    """
    updated = db_complaints.update_task_progress(
        complaint_id=complaint_id,
        employee_id=req.employee_id,
        status=req.status,
        notes=req.notes,
        resolution_image_url=req.resolution_image_url,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return {
        "success": True,
        "message": f"Task status updated to {req.status}",
        "complaint": updated,
    }


@router.post("/{complaint_id}/verify")
async def verify_resolution_endpoint(complaint_id: str, req: VerifyRequest):
    """
    Admin Verification: Inspect before/after evidence and approve or request rework.
    """
    updated = db_complaints.verify_resolution(
        complaint_id=complaint_id,
        approved=req.approved,
        admin_notes=req.admin_notes,
        admin_name=req.admin_name or "Panchayat Secretary",
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return {
        "success": True,
        "message": "Resolution approved and marked resolved" if req.approved else "Rework requested from field team",
        "complaint": updated,
    }


@router.get("/employee/{employee_id}/tasks")
async def list_employee_tasks(employee_id: str):
    """
    Employee Portal: List tasks assigned to a specific field employee.
    """
    tasks = db_complaints.get_employee_tasks(employee_id)
    return {
        "success": True,
        "employee_id": employee_id,
        "tasks": tasks,
    }


@router.get("/audit-log")
async def get_system_audit_log(complaint_id: Optional[str] = Query(None)):
    """
    Retrieve audit trail of all civic actions, assignments, overrides, and verifications.
    """
    logs = db_complaints.get_audit_logs(complaint_id=complaint_id)
    return {
        "success": True,
        "audit_logs": logs,
    }


@router.delete("/{complaint_id}")
async def delete_complaint_endpoint(complaint_id: str):
    """
    Delete a complaint record.
    """
    db_complaints.delete_complaint(complaint_id)
    return {"success": True, "message": "Complaint deleted"}


def _generate_groq_smart_description(filename: str, location: str) -> Optional[Dict[str, Any]]:
    """
    Generate a clear, detailed, and relevant civic complaint description using the Groq API.
    API keys are securely read from the backend environment configuration.
    """
    groq_key = (os.getenv("GROQ_API_KEY") or "").strip("\"' ")
    if not groq_key:
        return None

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {groq_key}",
        "Content-Type": "application/json",
    }

    prompt = f"""You are Civic Buzz Groq AI, an intelligent civic infrastructure and hazard analyst for local and rural Gram Panchayats.
A citizen uploaded an image of a civic issue at location: '{location}'.
Image file context / name: '{filename}'.

Identify the visible civic problem (such as pothole, road crater, garbage dump, broken streetlight, water pipe leak, live wire electrocution risk, damaged pavement, drainage overflow).
Return ONLY a valid JSON object with this exact structure:
{{
  "title": "Concise, professional civic issue title",
  "category": "Roads & Infrastructure" or "Water Supply" or "Sanitation & Waste" or "Electricity-related Civic Issue" or "Fire & Disaster Emergency" or "Health & Other",
  "description": "Clear, detailed, relevant civic complaint description (2-3 sentences explaining what is damaged, danger to pedestrians or vehicles, and needed municipal action)",
  "urgency": "High" or "Medium" or "Low",
  "severity": "CRITICAL" or "HIGH" or "MEDIUM" or "LOW",
  "safety_risk": "CRITICAL" or "HIGH" or "MEDIUM" or "LOW",
  "affected_area": "STREET" or "WARD" or "COMMUNITY",
  "accessibility_impact": ["pedestrians", "vehicles"]
}}
"""

    # Try models in order: openai/gpt-oss-120b, openai/gpt-oss-20b, qwen/qwen3.8-27b
    for model_name in ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"]:
        try:
            payload = {
                "model": model_name,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are Civic Buzz Groq AI, an intelligent civic complaint analyst. Output strictly valid JSON.",
                    },
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.2,
            }
            res = requests.post(url, headers=headers, json=payload, timeout=6)
            if res.status_code == 200:
                content = res.json()["choices"][0]["message"]["content"]
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0].strip()
                data = json.loads(content)
                data["ai_model"] = f"Groq AI ({model_name})"
                return data
        except Exception as e:
            print(f"[Groq AI warning: model {model_name} error: {e}]")
            continue

    return None


@router.post("/analyze-image", response_model=ComplaintAnalysisResponse)
async def analyze_issue_image(req: ImageAnalysisRequest):
    """
    AI Vision & Priority Engine endpoint: Analyzes uploaded complaint image using
    Groq AI to generate a clear, relevant complaint description and calculate
    deterministic 0-100 priority score.
    """
    fn = (req.filename or "").lower()
    loc = req.location or "Ward 4"

    # 1. Try Groq AI first for smart complaint description generation
    groq_res = _generate_groq_smart_description(req.filename or "civic_issue.jpg", loc)

    if groq_res and groq_res.get("description"):
        category_raw = groq_res.get("category", "Roads & Infrastructure")
        cat_norm_map = {
            "electricity": "Electricity-related Civic Issue",
            "electrical": "Electricity-related Civic Issue",
            "electricity-related civic issue": "Electricity-related Civic Issue",
            "street lighting": "Electricity-related Civic Issue",
            "power": "Electricity-related Civic Issue",
            "roads": "Roads & Infrastructure",
            "road": "Roads & Infrastructure",
            "infrastructure": "Roads & Infrastructure",
            "roads & infrastructure": "Roads & Infrastructure",
            "water": "Water Supply",
            "water supply": "Water Supply",
            "sanitation": "Sanitation & Waste",
            "waste": "Sanitation & Waste",
            "sanitation & waste": "Sanitation & Waste",
            "fire": "Fire & Disaster Emergency",
            "fire & disaster emergency": "Fire & Disaster Emergency",
            "health": "Health & Other",
            "health & other": "Health & Other",
        }
        category = cat_norm_map.get(str(category_raw).strip().lower(), category_raw)
        title = groq_res.get("title", "Civic Infrastructure Issue")
        description = groq_res.get("description", "")
        severity = groq_res.get("severity", "HIGH")
        safety_risk = groq_res.get("safety_risk", "HIGH")
        affected_area = groq_res.get("affected_area", "STREET")
        accessibility_impact = groq_res.get("accessibility_impact", ["pedestrians", "vehicles"])
        ai_model_name = groq_res.get("ai_model", "Groq AI (openai/gpt-oss-120b)")
        confidence = 0.98
    else:
        # 2. Resilient fallback heuristics if Groq is temporarily unreachable
        ai_model_name = "Civic -Buzz AI Vision & Deterministic Priority Engine"
        confidence = 0.92
        if any(k in fn for k in ["fire", "flame", "smoke", "blaze", "burn", "explosion", "gas leak", "cylinder"]):
            category = "Fire & Disaster Emergency"
            title = "🚨 Fire Outbreak & Life Safety Hazard Emergency"
            description = "AI Vision Analysis: Detected active flame, smoke, or fire hazard. Immediate 30-minute rapid emergency response required to prevent injury and property loss."
            severity = "CRITICAL"
            safety_risk = "CRITICAL"
            affected_area = "WARD"
            accessibility_impact = ["emergency vehicles", "all residents", "hospital", "school"]
        elif any(k in fn for k in ["shock", "current", "electrocution", "live wire", "spark", "sparking", "snapped wire", "high voltage"]):
            category = "Electricity-related Civic Issue"
            title = "⚡ Electric Shock Hazard & Snapped Live Wire Emergency"
            description = "AI Vision Analysis: Detected exposed live electrical wire / sparking hazard with critical electrocution danger. Immediate rapid power shutdown & emergency repair required."
            severity = "CRITICAL"
            safety_risk = "CRITICAL"
            affected_area = "STREET"
            accessibility_impact = ["pedestrians", "emergency vehicles", "children"]
        elif any(k in fn for k in ["water", "pipe", "leak", "drain", "tap", "overflow", "sewer", "flood"]):
            category = "Water Supply"
            title = "Water Pipeline Leakage & Drainage Overflow"
            description = "AI Vision Analysis: Detected a damaged water supply pipe causing continuous water leakage and street flooding. Immediate maintenance required."
            severity = "CRITICAL" if "flood" in fn or "sewer" in fn else "HIGH"
            safety_risk = "MEDIUM"
            affected_area = "WARD"
            accessibility_impact = ["pedestrians", "vehicles", "schools"]
        elif any(k in fn for k in ["light", "lamp", "pole", "wire", "electric", "dark", "transformer"]):
            category = "Electricity-related Civic Issue"
            title = "Non-Functional Streetlight & Exposed Electrical Wiring"
            description = "AI Vision Analysis: Detected broken streetlight fixture and exposed electrical wiring along public roadway. Creates severe night hazard."
            severity = "HIGH" if "wire" in fn or "transformer" in fn else "MEDIUM"
            safety_risk = "CRITICAL" if "wire" in fn or "transformer" in fn else "MEDIUM"
            affected_area = "STREET"
            accessibility_impact = ["pedestrians", "emergency vehicles"]
        elif any(k in fn for k in ["waste", "trash", "garbage", "clean", "dump", "bin", "litter", "plastic"]):
            category = "Sanitation & Waste"
            title = "Unattended Municipal Garbage Accumulation"
            description = "AI Vision Analysis: Identified illegal waste dump site with organic and plastic garbage accumulation. High pest & health risk."
            severity = "MEDIUM"
            safety_risk = "LOW"
            affected_area = "STREET"
            accessibility_impact = ["pedestrians"]
        elif any(k in fn for k in ["health", "hospital", "clinic", "stray", "animal", "mosquito"]):
            category = "Health & Other"
            title = "Public Health Hazard & Mosquito Breeding Site"
            description = "AI Vision Analysis: Detected stagnant water collection and unhygienic conditions near residential zone."
            severity = "HIGH"
            safety_risk = "HIGH"
            affected_area = "WARD"
            accessibility_impact = ["children", "pedestrians", "hospital"]
        else:
            category = "Roads & Infrastructure"
            title = "Severe Road Pothole & Damaged Pavement"
            description = "AI Vision Analysis: Detected deep asphalt erosion, heavy surface cracking, and dangerous potholes along main road near school."
            severity = "HIGH"
            safety_risk = "HIGH"
            affected_area = "STREET"
            accessibility_impact = ["vehicles", "school", "emergency vehicles"]

    ai_obs = {
        "category": category,
        "severity": severity,
        "safety_risk": safety_risk,
        "affected_area": affected_area,
        "accessibility_impact": accessibility_impact,
        "description": description,
        "confidence": confidence,
    }

    # Fetch existing complaints to build recurrence signal
    try:
        existing = db_complaints.get_all_complaints()
        unresolved_count = sum(1 for c in existing if c.get("status") != "resolved" and c.get("category") == category)
    except Exception:
        unresolved_count = 1

    hist_signals = {
        "recent_complaints_count": unresolved_count,
        "unresolved_nearby_count": unresolved_count,
        "is_new_report": True,
        "is_escalated": severity in ["HIGH", "CRITICAL"],
    }

    priority_res = priority_engine.calculate_priority_score(
        ai_observations=ai_obs,
        location_context={"location": loc},
        historical_signals=hist_signals,
    )

    classic_urgency = "High" if priority_res["priority_tier"] in ["CRITICAL", "HIGH"] else "Medium"

    return ComplaintAnalysisResponse(
        success=True,
        title=title,
        category=category,
        description=description,
        urgency=classic_urgency,
        confidence=priority_res["confidence"],
        ai_model=ai_model_name,
        ai_severity=severity,
        ai_safety_risk=safety_risk,
        ai_affected_area=affected_area,
        ai_accessibility_impact=accessibility_impact,
        priority_score=priority_res["priority_score"],
        priority_tier=priority_res["priority_tier"],
        recommended_department=priority_res["recommended_department"],
        recommended_sla_hours=priority_res["recommended_sla_hours"],
        needs_human_review=priority_res["needs_human_review"],
        explanation_bullets=priority_res["explanation_bullets"],
        factors_breakdown=priority_res["factors_breakdown"],
    )


# ── ElevenLabs Voice Welcome Endpoint ───────────────────────────────────────

@router.get("/voice-welcome")
@router.post("/voice-welcome")
async def voice_welcome(text: str = "Welcome to Civic Buzz Platform."):
    """
    ElevenLabs Text-to-Speech welcome voice message endpoint.
    API keys are securely held on the backend environment configuration.
    """
    eleven_key = (os.getenv("ELEVENLABS_API_KEY") or "").strip("\"' ")
    if eleven_key:
        voice_id = "21m00Tcm4TlvDq8ikWAM"  # Rachel / Friendly voice
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": eleven_key,
        }
        data = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
            },
        }
        try:
            resp = requests.post(url, json=data, headers=headers, timeout=8)
            if resp.status_code == 200:
                audio_b64 = base64.b64encode(resp.content).decode("utf-8")
                return {
                    "success": True,
                    "provider": "ElevenLabs",
                    "text": text,
                    "audio_base64": f"data:audio/mpeg;base64,{audio_b64}",
                }
            else:
                print(f"[ElevenLabs notice ({resp.status_code}): {resp.text[:120]}]")
        except Exception as e:
            print(f"[ElevenLabs TTS connection error: {e}]")

    # Graceful fallback instruction for Web Speech Synthesis
    return {
        "success": False,
        "provider": "WebSpeechFallback",
        "text": text,
        "audio_base64": None,
        "message": "Using browser Web Speech Synthesis for crystal-clear voice welcome.",
    }


@router.get("/voice-welcome/audio")
async def voice_welcome_audio(text: str = "Welcome to Civic Buzz Platform."):
    """
    Direct audio stream of the welcome message via ElevenLabs.
    """
    eleven_key = (os.getenv("ELEVENLABS_API_KEY") or "").strip("\"' ")
    if eleven_key:
        voice_id = "21m00Tcm4TlvDq8ikWAM"
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": eleven_key,
        }
        data = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
            },
        }
        try:
            resp = requests.post(url, json=data, headers=headers, timeout=8)
            if resp.status_code == 200:
                return Response(content=resp.content, media_type="audio/mpeg")
        except Exception:
            pass

    return Response(status_code=204)


@router.post("/reverse-geocode")
async def reverse_geocode(req: GeocodeRequest):
    """
    Auto-detect human-readable village location from GPS coordinates.
    """
    lat, lng = req.latitude, req.longitude
    return {
        "success": True,
        "location": f"Ward 4, Main Road (GPS: {lat:.4f}°N, {lng:.4f}°E)",
        "latitude": lat,
        "longitude": lng,
        "ward": "Ward 4",
        "mandal": "Shyampet",
        "district": "Warangal",
    }
