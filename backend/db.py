import sqlite3
import os
import json
from datetime import datetime
from typing import Dict, Any, List

DB_PATH = os.path.join(os.path.dirname(__file__), "inventory.db")


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Enable Foreign Keys
    cursor.execute("PRAGMA foreign_keys = ON;")

    # 1. Categories Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL
    );
    """)

    # 2. Suppliers Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact_person TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        created_at TEXT NOT NULL
    );
    """)

    # 3. Inventory Items Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inventory_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id_code TEXT UNIQUE NOT NULL,
        item_name TEXT NOT NULL,
        category_id INTEGER NOT NULL,
        unit TEXT NOT NULL,
        current_quantity INTEGER NOT NULL DEFAULT 0,
        min_quantity INTEGER NOT NULL DEFAULT 10,
        max_quantity INTEGER NOT NULL DEFAULT 200,
        batch_number TEXT,
        expiry_date TEXT,
        supplier_id INTEGER,
        last_restocked TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );
    """)

    # 4. Inventory Transactions Table (Immutable Log)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inventory_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id_code TEXT UNIQUE NOT NULL,
        item_id INTEGER NOT NULL,
        transaction_type TEXT NOT NULL, -- STOCK_IN, STOCK_OUT, DISTRIBUTION, ADJUSTMENT
        quantity INTEGER NOT NULL,
        previous_quantity INTEGER NOT NULL,
        new_quantity INTEGER NOT NULL,
        date TEXT NOT NULL,
        reference TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (item_id) REFERENCES inventory_items(id)
    );
    """)

    # 5. Distribution Records Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS distribution_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        beneficiary_ref TEXT NOT NULL,
        area_village TEXT NOT NULL,
        purpose TEXT NOT NULL,
        date TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (transaction_id) REFERENCES inventory_transactions(id),
        FOREIGN KEY (item_id) REFERENCES inventory_items(id)
    );
    """)

    # 6. Alerts Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        alert_type TEXT NOT NULL, -- OUT_OF_STOCK, LOW_STOCK, EXPIRING_SOON, EXPIRED
        severity TEXT NOT NULL, -- CRITICAL, WARNING, INFO
        message TEXT NOT NULL,
        resolved INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (item_id) REFERENCES inventory_items(id)
    );
    """)

    # 7. Medicine Requests Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS medicine_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id TEXT UNIQUE NOT NULL,
        asha_worker_name TEXT NOT NULL,
        medicine_name TEXT NOT NULL,
        requested_quantity INTEGER NOT NULL,
        approved_quantity INTEGER NOT NULL DEFAULT 0,
        dispatched_quantity INTEGER NOT NULL DEFAULT 0,
        unit TEXT NOT NULL DEFAULT 'Units',
        urgency TEXT NOT NULL DEFAULT 'Normal',
        reason TEXT NOT NULL,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING',
        dispatch_date TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    # 8. Complaints Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS complaints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complaint_id_code TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL DEFAULT 'Roads & Infrastructure',
        location TEXT NOT NULL,
        urgency TEXT NOT NULL DEFAULT 'High',
        status TEXT NOT NULL DEFAULT 'pending',
        villager_name TEXT NOT NULL,
        villager_id TEXT,
        village TEXT DEFAULT 'Shyampet',
        image_url TEXT,
        ai_generated INTEGER DEFAULT 0,
        date_label TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        ai_category TEXT,
        ai_severity TEXT,
        ai_safety_risk TEXT,
        ai_accessibility_impact TEXT,
        ai_affected_area TEXT,
        ai_confidence REAL,
        priority_score INTEGER,
        priority_tier TEXT,
        priority_factors TEXT,
        recommended_department TEXT,
        department_confidence REAL,
        recommended_sla_hours REAL,
        explanation_bullets TEXT,
        possible_duplicate INTEGER DEFAULT 0,
        duplicate_confidence REAL,
        related_complaint_id TEXT,
        ai_analyzed_at TEXT,
        human_priority_override INTEGER DEFAULT 0,
        human_override_reason TEXT,
        human_override_by TEXT,
        human_override_at TEXT,
        human_override_department TEXT,
        human_override_sla_hours REAL
    );
    """)

    # Seed sample complaints if empty
    cursor.execute("SELECT COUNT(*) as cnt FROM complaints;")
    row = cursor.fetchone()
    if row and row["cnt"] == 0:
        now_iso = datetime.now().isoformat()
        sample_complaints = [
            (
                "C-001",
                "Damaged Water Pipeline Leakage & Flooding",
                "Continuous high-pressure water leaking onto primary school path, creating mud hazards and drinking water loss.",
                "Water Supply",
                "Ward 3, Near Primary School",
                "High",
                "pending",
                "Ramesh Kumar",
                "vil_001",
                "Shyampet",
                "CRITICAL",
                "HIGH",
                85,
                "CRITICAL",
                "Water Supply & Sanitation Board",
                6.0,
                "Today, 9:30 AM",
                now_iso,
                now_iso
            ),
            (
                "C-002",
                "Exposed Live Wire & Broken Streetlight",
                "Damaged pole with dangling sparking live wire posing lethal danger to pedestrians and cattle.",
                "Electricity",
                "Ward 1, Market Crossroad",
                "High",
                "in_progress",
                "Suresh Rao",
                "vil_002",
                "Shyampet",
                "CRITICAL",
                "CRITICAL",
                100,
                "CRITICAL",
                "Electricity Board Emergency Rapid Action Wing (TSSPDCL / DISCOM - Call 1912)",
                0.5,
                "Yesterday, 4:15 PM",
                now_iso,
                now_iso
            ),
            (
                "C-003",
                "Severe Overflowing Garbage & Pest Breeding",
                "Unattended municipal waste accumulating over 5 days behind the vegetable market, blocking storm drain.",
                "Sanitation",
                "Ward 4, West Colony",
                "Medium",
                "pending",
                "Lakshmi Bai",
                "vil_003",
                "Shyampet",
                "MEDIUM",
                "MEDIUM",
                52,
                "MEDIUM",
                "Sanitation & Public Health Wing",
                72.0,
                "Yesterday, 11:00 AM",
                now_iso,
                now_iso
            ),
            (
                "C-004",
                "Deep Monsoon Potholes on Main Bus Route",
                "Multiple deep craters stretching 30 meters causing auto-rickshaw overturning risks during night hours.",
                "Roads & Infrastructure",
                "Ward 2, Bus Stand Road",
                "High",
                "resolved",
                "Anil Reddy",
                "vil_004",
                "Shyampet",
                "HIGH",
                "HIGH",
                68,
                "HIGH",
                "Roads & Infrastructure Department",
                24.0,
                "2 days ago",
                now_iso,
                now_iso
            ),
        ]
        for item in sample_complaints:
            cursor.execute("""
            INSERT INTO complaints (
                complaint_id_code, title, description, category, location,
                urgency, status, villager_name, villager_id, village,
                ai_severity, ai_safety_risk, priority_score, priority_tier,
                recommended_department, recommended_sla_hours, date_label,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, item)

    # 9. Dynamic Schema Migration: Ensure all lifecycle columns exist on complaints
    cursor.execute("PRAGMA table_info(complaints);")
    existing_cols = {col["name"] for col in cursor.fetchall()}

    lifecycle_columns = [
        ("assigned_department", "TEXT"),
        ("assigned_employee_id", "TEXT"),
        ("assigned_employee_name", "TEXT"),
        ("assigned_at", "TEXT"),
        ("started_at", "TEXT"),
        ("resolved_at", "TEXT"),
        ("verified_at", "TEXT"),
        ("resolution_notes", "TEXT"),
        ("resolution_image_url", "TEXT"),
        ("admin_notes", "TEXT"),
        ("activity_history", "TEXT"),
        ("citizen_edited_description", "TEXT"),
        ("ai_recommended_employee_id", "TEXT"),
        ("ai_recommended_employee_name", "TEXT"),
        ("ai_recommendation_reason", "TEXT"),
    ]

    for col_name, col_type in lifecycle_columns:
        if col_name not in existing_cols:
            cursor.execute(f"ALTER TABLE complaints ADD COLUMN {col_name} {col_type};")

    # 10. Employees Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id_code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        department TEXT NOT NULL,
        role_title TEXT NOT NULL,
        skills TEXT,
        jurisdiction TEXT,
        workload_percent INTEGER DEFAULT 40,
        active_tasks INTEGER DEFAULT 0,
        completed_today INTEGER DEFAULT 0,
        status TEXT DEFAULT 'Available',
        current_location TEXT,
        latitude REAL,
        longitude REAL,
        shift TEXT DEFAULT 'Morning (8AM - 4PM)',
        avatar_bg TEXT,
        created_at TEXT NOT NULL
    );
    """)

    # Seed employees if empty
    cursor.execute("SELECT COUNT(*) as cnt FROM employees;")
    emp_row = cursor.fetchone()
    if emp_row and emp_row["cnt"] == 0:
        now_iso = datetime.now().isoformat()
        sample_employees = [
            (
                "EMP-001",
                "Ravi Kumar",
                "employee@civic.gov.in",
                "+91-9876543220",
                "Roads & Infrastructure Department",
                "Senior Field Engineer",
                json.dumps(["Roads & Infrastructure", "Drainage", "Public Facilities"]),
                "Wards 1, 2, 3, 4",
                42,
                2,
                1,
                "Available",
                "Ward 2, Panchayat Sub-Station",
                18.1250,
                79.5840,
                "Morning (8AM - 4PM)",
                "bg-emerald-600",
                now_iso,
            ),
            (
                "EMP-002",
                "Suresh Rao",
                "suresh.rao@civic.gov.in",
                "+91-9876543221",
                "Roads & Infrastructure Department",
                "Pavement & Asphalt Supervisor",
                json.dumps(["Roads & Infrastructure"]),
                "Wards 3, 4, 5",
                61,
                3,
                0,
                "On Field",
                "Ward 4, West Road",
                18.1320,
                79.5910,
                "Morning (8AM - 4PM)",
                "bg-blue-600",
                now_iso,
            ),
            (
                "EMP-003",
                "Arun Kumar",
                "arun.kumar@civic.gov.in",
                "+91-9876543222",
                "Roads & Infrastructure Department",
                "Junior Road Maintenance Tech",
                json.dumps(["Roads & Infrastructure"]),
                "Wards 1, 6",
                38,
                1,
                2,
                "Available",
                "Central Depot",
                18.1180,
                79.5760,
                "General (9AM - 5PM)",
                "bg-amber-600",
                now_iso,
            ),
            (
                "EMP-004",
                "Priya Sharma",
                "priya.sharma@civic.gov.in",
                "+91-9876543223",
                "Water Supply & Sanitation Board",
                "Pipeline Operations Specialist",
                json.dumps(["Water Supply", "Drainage"]),
                "All Village Wards",
                30,
                1,
                1,
                "Available",
                "Water Works Pump Station",
                18.1210,
                79.5890,
                "Morning (8AM - 4PM)",
                "bg-cyan-600",
                now_iso,
            ),
            (
                "EMP-005",
                "Manjunath Reddy",
                "manjunath.reddy@civic.gov.in",
                "+91-9876543224",
                "Electrical & Street Lighting Dept",
                "Senior DISCOM Lineman",
                json.dumps(["Street Lighting", "Electricity-related Civic Issue"]),
                "All Village Wards",
                50,
                2,
                1,
                "On Field",
                "Electrical Substation",
                18.1290,
                79.5820,
                "Rotational",
                "bg-yellow-600",
                now_iso,
            ),
            (
                "EMP-006",
                "Rajesh Varma",
                "rajesh.varma@civic.gov.in",
                "+91-9876543225",
                "Sanitation & Waste Management",
                "Chief Sanitary Inspector",
                json.dumps(["Sanitation & Waste", "Sanitation", "Health & Other"]),
                "Wards 1, 2, 3, 4, 5",
                45,
                2,
                3,
                "Available",
                "Sanitation Depot",
                18.1265,
                79.5865,
                "Morning (7AM - 3PM)",
                "bg-teal-600",
                now_iso,
            ),
        ]
        for emp in sample_employees:
            cursor.execute("""
            INSERT INTO employees (
                employee_id_code, name, email, phone, department, role_title,
                skills, jurisdiction, workload_percent, active_tasks, completed_today,
                status, current_location, latitude, longitude, shift, avatar_bg, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, emp)

    # 11. Audit Logs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complaint_id TEXT NOT NULL,
        actor_name TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        created_at TEXT NOT NULL
    );
    """)

    # Seed initial audit log entries if empty
    cursor.execute("SELECT COUNT(*) as cnt FROM audit_logs;")
    audit_row = cursor.fetchone()
    if audit_row and audit_row["cnt"] == 0:
        now_iso = datetime.now().isoformat()
        cursor.execute("""
        INSERT INTO audit_logs (complaint_id, actor_name, actor_role, action, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?);
        """, ("C-002", "Rajesh Sharma", "Admin", "ASSIGNMENT_APPROVED", "Assigned to Manjunath Reddy (Electricity Dept)", now_iso))

    conn.commit()
    conn.close()


def row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    return dict(row) if row else {}


