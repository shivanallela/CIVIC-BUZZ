import pytest
from fastapi.testclient import TestClient
from main import app
import db_complaints

client = TestClient(app)


def test_demo_login_endpoints():
    # Citizen login
    res = client.post("/api/demo/login", json={"identifier": "citizen@civic.gov.in", "password": "citizen123"})
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "citizen"

    # Employee login
    res = client.post("/api/demo/login", json={"identifier": "employee@civic.gov.in", "password": "emp123"})
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "employee"

    # Admin login
    res = client.post("/api/demo/login", json={"identifier": "admin@civic.gov.in", "password": "admin123"})
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "admin"

    # Invalid login
    res = client.post("/api/demo/login", json={"identifier": "admin@civic.gov.in", "password": "wrongpassword"})
    assert res.status_code == 401


def test_multirole_lifecycle_flow():
    # 1. Create a complaint
    complaint = db_complaints.create_complaint({
        "title": "Broken Water Pipe Main Line",
        "description": "Continuous leak flooding street near school",
        "category": "Water Supply",
        "location": "Ward 2, Main Cross, Shyampet",
        "urgency": "High",
        "villager_name": "Ramesh Kumar",
        "village": "Shyampet",
    })
    c_id = complaint["id"]
    assert c_id is not None

    # 2. Get Employee Recommendations for this complaint
    rec_res = client.get(f"/api/complaints/recommendations/{c_id}")
    assert rec_res.status_code == 200
    recs = rec_res.json()["recommendations"]
    assert len(recs) > 0
    top_employee = recs[0]["employee"]
    emp_id = top_employee["id"]

    # 3. Admin Assigns Complaint to top recommended employee
    assign_res = client.post(
        f"/api/complaints/{c_id}/assign",
        json={
            "employee_id": emp_id,
            "department": "Water Supply Department",
            "admin_notes": "Urgent repair needed before evening rush.",
            "admin_name": "Rajesh Sharma",
        },
    )
    assert assign_res.status_code == 200
    assigned_data = assign_res.json()["complaint"]
    assert assigned_data["status"] == "assigned"
    assert assigned_data["assigned_employee_id"] == emp_id

    # 4. Employee views assigned tasks
    tasks_res = client.get(f"/api/complaints/employee/{emp_id}/tasks")
    assert tasks_res.status_code == 200
    task_ids = [t["id"] for t in tasks_res.json()["tasks"]]
    assert c_id in task_ids

    # 5. Employee updates progress to in_progress
    start_res = client.post(
        f"/api/complaints/{c_id}/update-task",
        json={
            "employee_id": emp_id,
            "status": "in_progress",
            "notes": "Work started on site, pipe isolated.",
        },
    )
    assert start_res.status_code == 200
    assert start_res.json()["complaint"]["status"] == "in_progress"

    # 6. Employee submits resolution proof
    submit_res = client.post(
        f"/api/complaints/{c_id}/update-task",
        json={
            "employee_id": emp_id,
            "status": "resolution_submitted",
            "notes": "Pipe replaced and pressure tested OK.",
            "resolution_image_url": "https://example.com/proof.jpg",
        },
    )
    assert submit_res.status_code == 200
    assert submit_res.json()["complaint"]["status"] == "resolution_submitted"

    # 7. Admin verifies and approves resolution
    verify_res = client.post(
        f"/api/complaints/{c_id}/verify",
        json={
            "approved": True,
            "admin_notes": "Repairs inspected and verified.",
            "admin_name": "Rajesh Sharma",
        },
    )
    assert verify_res.status_code == 200
    verified_data = verify_res.json()["complaint"]
    assert verified_data["status"] == "resolved"
    assert verified_data["verified_at"] is not None

    # 8. Check audit log
    audit_res = client.get(f"/api/complaints/audit-log?complaint_id={c_id}")
    assert audit_res.status_code == 200
    logs = audit_res.json()["audit_logs"]
    assert len(logs) >= 4  # CREATED, ASSIGNED, STATUS_UPDATED, VERIFIED
