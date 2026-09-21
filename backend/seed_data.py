import sqlite3
from datetime import datetime, timedelta
import random
from db import get_db_connection, init_db


def seed_database(force=False):
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if already seeded
    cursor.execute("SELECT COUNT(*) as cnt FROM inventory_items;")
    row = cursor.fetchone()
    if row and row["cnt"] > 0 and not force:
        conn.close()
        return {"status": "already_seeded", "items_count": row["cnt"]}

    if force:
        cursor.execute("DELETE FROM distribution_records;")
        cursor.execute("DELETE FROM inventory_transactions;")
        cursor.execute("DELETE FROM alerts;")
        cursor.execute("DELETE FROM inventory_items;")
        cursor.execute("DELETE FROM categories;")
        cursor.execute("DELETE FROM suppliers;")
        conn.commit()

    now = datetime.now()
    now_str = now.strftime("%Y-%m-%d %H:%M:%S")
    today_date = now.strftime("%Y-%m-%d")

    # 1. Seed Categories
    categories = [
        ("Medicines", "Essential community medicines and supplements"),
        ("Maternal Health Supplies", "Supplies for pregnant mothers and post-natal care"),
        ("Child Health Supplies", "Vaccines, oral rehydration, and infant nutrition"),
        ("Hygiene Supplies", "Sanitary items, disinfectants, and personal protection"),
        ("Diagnostic Supplies", "RDT kits, test strips, and monitoring devices"),
        ("General Health Supplies", "Bandages, antiseptics, and general first-aid"),
    ]

    cat_map = {}
    for name, desc in categories:
        cursor.execute(
            "INSERT INTO categories (name, description, created_at) VALUES (?, ?, ?);",
            (name, desc, now_str)
        )
        cat_map[name] = cursor.lastrowid

    # 2. Seed Suppliers
    suppliers = [
        ("District Medical Warehouse", "Dr. Rajesh Sharma", "+91-9876543210", "supply@districtphc.gov.in", "District Health Office, Sector 4"),
        ("State ASHA Supply Hub", "Smt. Sunita Reddy", "+91-9876543211", "asha.hub@statehealth.gov.in", "Central Medical Depot, Block B"),
        ("PHC Central Depot", "Pharmacist Anil Kumar", "+91-9876543212", "phc.depot@ruralhealth.org", "Primary Health Centre, Ward 1"),
    ]

    sup_map = {}
    for name, cperson, phone, email, addr in suppliers:
        cursor.execute(
            "INSERT INTO suppliers (name, contact_person, phone, email, address, created_at) VALUES (?, ?, ?, ?, ?, ?);",
            (name, cperson, phone, email, addr, now_str)
        )
        sup_map[name] = cursor.lastrowid

    sup_ids = list(sup_map.values())

    # 3. Seed 25 Inventory Items
    items_data = [
        # Medicines
        ("Paracetamol 500mg", "Medicines", "Strips", 140, 20, 300, "BAT-PCM-2026", (now + timedelta(days=365)).strftime("%Y-%m-%d"), "District Medical Warehouse"),
        ("Paracetamol 125mg Syrup", "Medicines", "Bottles", 0, 15, 100, "BAT-PCM-SYP", (now + timedelta(days=180)).strftime("%Y-%m-%d"), "PHC Central Depot"),
        ("Amoxicillin 250mg Syrup", "Medicines", "Bottles", 0, 10, 80, "BAT-AMX-01", (now + timedelta(days=120)).strftime("%Y-%m-%d"), "PHC Central Depot"),
        ("Albendazole 400mg", "Medicines", "Strips", 120, 25, 250, "BAT-ALB-04", (now + timedelta(days=400)).strftime("%Y-%m-%d"), "State ASHA Supply Hub"),
        ("Iron & Folic Acid Tablets (Adult)", "Medicines", "Strips", 8, 30, 400, "BAT-IFA-901", (now + timedelta(days=18)).strftime("%Y-%m-%d"), "District Medical Warehouse"),
        ("Iron & Folic Acid Syrup (Pediatric)", "Medicines", "Bottles", 15, 10, 100, "BAT-IFA-PED", (now + timedelta(days=200)).strftime("%Y-%m-%d"), "District Medical Warehouse"),
        ("Chloroquine 250mg Tablets", "Medicines", "Strips", 0, 15, 150, "BAT-CQ-002", (now + timedelta(days=300)).strftime("%Y-%m-%d"), "PHC Central Depot"),

        # Maternal Health
        ("Iron & Folic Acid Tablets (IFA Blue)", "Maternal Health Supplies", "Strips", 65, 25, 300, "BAT-IFA-B01", (now + timedelta(days=240)).strftime("%Y-%m-%d"), "State ASHA Supply Hub"),
        ("Calcium & Vitamin D3 Tablets", "Maternal Health Supplies", "Strips", 85, 20, 200, "BAT-CAL-55", (now + timedelta(days=300)).strftime("%Y-%m-%d"), "District Medical Warehouse"),
        ("Clean Delivery Kit (Disposable)", "Maternal Health Supplies", "Kits", 22, 10, 50, "BAT-CDK-102", (now + timedelta(days=500)).strftime("%Y-%m-%d"), "State ASHA Supply Hub"),
        ("Pregnancy Test Kits (Nishchay)", "Maternal Health Supplies", "Kits", 45, 15, 100, "BAT-PTK-88", (now + timedelta(days=365)).strftime("%Y-%m-%d"), "PHC Central Depot"),
        ("Misoprostol 200mcg Tablets", "Maternal Health Supplies", "Strips", 12, 10, 60, "BAT-MSP-09", (now + timedelta(days=150)).strftime("%Y-%m-%d"), "PHC Central Depot"),

        # Child Health
        ("ORS & Zinc Kits", "Child Health Supplies", "Kits", 8, 20, 150, "BAT-ORS-2026", (now + timedelta(days=180)).strftime("%Y-%m-%d"), "State ASHA Supply Hub"),
        ("OPV Polio Vials", "Child Health Supplies", "Vials", 4, 15, 80, "BAT-OPV-44", (now + timedelta(days=90)).strftime("%Y-%m-%d"), "PHC Central Depot"),
        ("Pentavalent Vaccine Vials", "Child Health Supplies", "Vials", 35, 10, 60, "BAT-PENT-08", (now + timedelta(days=120)).strftime("%Y-%m-%d"), "PHC Central Depot"),
        ("Vitamin A Oil Syrup (100ml)", "Child Health Supplies", "Bottles", 6, 10, 40, "BAT-VITA-12", (now + timedelta(days=22)).strftime("%Y-%m-%d"), "District Medical Warehouse"),
        ("Zinc Sulfate 20mg Tablets", "Child Health Supplies", "Strips", 95, 30, 200, "BAT-ZNC-77", (now + timedelta(days=365)).strftime("%Y-%m-%d"), "State ASHA Supply Hub"),
        ("Tetanus Toxoid (TT) Vaccine", "Child Health Supplies", "Vials", 18, 10, 50, "BAT-TT-OLD", (now - timedelta(days=5)).strftime("%Y-%m-%d"), "PHC Central Depot"),

        # Hygiene
        ("Sanitary Napkins (Free Scheme Pack)", "Hygiene Supplies", "Packs", 9, 25, 200, "BAT-SAN-101", (now + timedelta(days=700)).strftime("%Y-%m-%d"), "State ASHA Supply Hub"),
        ("Chlorine Water Disinfection Tablets", "Hygiene Supplies", "Strips", 110, 20, 300, "BAT-CHL-03", (now + timedelta(days=400)).strftime("%Y-%m-%d"), "District Medical Warehouse"),
        ("Hand Sanitizer 100ml", "Hygiene Supplies", "Bottles", 40, 15, 100, "BAT-SAN-88", (now + timedelta(days=500)).strftime("%Y-%m-%d"), "PHC Central Depot"),

        # Diagnostic
        ("Hemoglobin Test Strips", "Diagnostic Supplies", "Packs", 55, 15, 100, "BAT-HB-90", (now + timedelta(days=250)).strftime("%Y-%m-%d"), "District Medical Warehouse"),
        ("Malaria Rapid Diagnostic Test (RDT) Kits", "Diagnostic Supplies", "Kits", 28, 10, 60, "BAT-RDT-04", (now + timedelta(days=180)).strftime("%Y-%m-%d"), "PHC Central Depot"),
        ("Digital Thermometers", "Diagnostic Supplies", "Units", 14, 5, 25, "BAT-THM-01", (now + timedelta(days=1000)).strftime("%Y-%m-%d"), "State ASHA Supply Hub"),

        # General
        ("Absorbent Cotton Roll 100g", "General Health Supplies", "Rolls", 30, 10, 80, "BAT-COT-22", (now + timedelta(days=600)).strftime("%Y-%m-%d"), "District Medical Warehouse"),
    ]

    item_db_ids = []
    for idx, (name, cat_name, unit, qty, min_q, max_q, batch, exp, sup_name) in enumerate(items_data, 1):
        item_code = f"ASH-INV-{idx:03d}"
        cat_id = cat_map[cat_name]
        sup_id = sup_map[sup_name]
        restocked = (now - timedelta(days=random.randint(2, 25))).strftime("%Y-%m-%d")

        cursor.execute("""
        INSERT INTO inventory_items (
            item_id_code, item_name, category_id, unit, current_quantity,
            min_quantity, max_quantity, batch_number, expiry_date,
            supplier_id, last_restocked, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            item_code, name, cat_id, unit, qty,
            min_q, max_q, batch, exp,
            sup_id, restocked, now_str, now_str
        ))
        db_id = cursor.lastrowid
        item_db_ids.append((db_id, item_code, name, qty))

        # Record Initial Stock In Transaction
        tx_code = f"TX-INIT-{idx:03d}"
        cursor.execute("""
        INSERT INTO inventory_transactions (
            transaction_id_code, item_id, transaction_type, quantity,
            previous_quantity, new_quantity, date, reference, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            tx_code, db_id, "STOCK_IN", qty + random.randint(10, 40),
            0, qty + random.randint(10, 40), restocked, "INITIAL_RESTOCK",
            "Initial stock received from Medical Depot", now_str
        ))

    # 4. Seed Historical Distribution Records over past 30 days
    beneficiaries = [
        ("HH-101", "Lakshmi Narayana (Pregnant Mother)", "Ward 3", "Maternal ANC Care"),
        ("HH-102", "Sunitha Rao (Pregnant Mother)", "Ward 2", "Routine ANC Checkup"),
        ("HH-104", "Radhika Sairam (High Risk ANC)", "Ward 3", "Anemia Management"),
        ("HH-108", "Meena Kumari", "Ward 4", "TT Vaccination"),
        ("HH-112", "Ramesh Kumar (Child Ramesh)", "Ward 1", "Diarrhea Prevention (ORS)"),
        ("HH-115", "Kavitha Devi", "Ward 2", "Sanitary Hygiene"),
        ("HH-120", "Gopal Varma", "Ward 3", "Fever Relief"),
        ("HH-125", "Saraswathi Amma", "Ward 4", "Calcium & IFA Care"),
        ("HH-130", "Baby Aarav (Infant)", "Ward 1", "Pulse Polio Immunization"),
        ("HH-135", "Mahesh Chandra", "Ward 2", "Deworming Campaign"),
    ]

    purposes = ["Maternal ANC Care", "Infant Care", "Fever & Pain Relief", "Anemia Control", "Sanitary Hygiene", "Diarrhea Control", "Polio Vaccination"]

    for d in range(28, 0, -2):
        dist_date = (now - timedelta(days=d)).strftime("%Y-%m-%d")
        sampled_items = random.sample(item_db_ids, 4)
        for db_id, item_code, item_name, cur_qty in sampled_items:
            dist_qty = random.randint(2, 8)
            hh_code, b_name, area, default_purpose = random.choice(beneficiaries)
            purpose = random.choice(purposes)

            # Record Transaction
            tx_code = f"TX-DIST-{d:02d}-{db_id}"
            cursor.execute("""
            INSERT INTO inventory_transactions (
                transaction_id_code, item_id, transaction_type, quantity,
                previous_quantity, new_quantity, date, reference, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                tx_code, db_id, "DISTRIBUTION", dist_qty,
                cur_qty + dist_qty, cur_qty, dist_date, hh_code,
                f"Distributed to {b_name} ({area})", now_str
            ))
            tx_id = cursor.lastrowid

            # Record Distribution Record
            cursor.execute("""
            INSERT INTO distribution_records (
                transaction_id, item_id, quantity, beneficiary_ref,
                area_village, purpose, date, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                tx_id, db_id, dist_qty, f"{b_name} ({hh_code})",
                area, purpose, dist_date, f"Provided during routine field visit", now_str
            ))

    # 5. Generate Alerts based on item status
    cursor.execute("SELECT id, item_name, current_quantity, min_quantity, expiry_date FROM inventory_items;")
    all_items = cursor.fetchall()

    for item in all_items:
        i_id = item["id"]
        i_name = item["item_name"]
        qty = item["current_quantity"]
        min_q = item["min_quantity"]
        exp_date_str = item["expiry_date"]

        exp_dt = datetime.strptime(exp_date_str, "%Y-%m-%d") if exp_date_str else None

        if qty == 0:
            cursor.execute("""
            INSERT INTO alerts (item_id, alert_type, severity, message, created_at)
            VALUES (?, 'OUT_OF_STOCK', 'CRITICAL', ?, ?);
            """, (i_id, f"⚠️ CRITICAL: {i_name} is completely out of stock! Immediate PHC refill required.", now_str))

        elif qty <= min_q:
            cursor.execute("""
            INSERT INTO alerts (item_id, alert_type, severity, message, created_at)
            VALUES (?, 'LOW_STOCK', 'WARNING', ?, ?);
            """, (i_id, f"⚠️ LOW STOCK: {i_name} balance ({qty} remaining) is at or below minimum threshold ({min_q}).", now_str))

        if exp_dt:
            days_left = (exp_dt - now).days
            if days_left < 0:
                cursor.execute("""
                INSERT INTO alerts (item_id, alert_type, severity, message, created_at)
                VALUES (?, 'EXPIRED', 'CRITICAL', ?, ?);
                """, (i_id, f"🚨 EXPIRED: {i_name} (Batch expired on {exp_date_str}). DO NOT DISTRIBUTE!", now_str))
            elif days_left <= 30:
                cursor.execute("""
                INSERT INTO alerts (item_id, alert_type, severity, message, created_at)
                VALUES (?, 'EXPIRING_SOON', 'WARNING', ?, ?);
                """, (i_id, f"⏳ EXPIRING SOON: {i_name} expires in {days_left} days ({exp_date_str}).", now_str))

    # 6. Seed Sample Medicine Requests
    cursor.execute("DELETE FROM medicine_requests;")
    med_reqs = [
        ("REQ-ASHA-0001", "Sunita Devi (Ward 3 & 4)", "Paracetamol 125mg Syrup", 30, 30, 30, "Bottles", "Urgent", "Zero stock remaining, viral fever reported among infants in Ward 3.", "Approved and dispatched by Mandal Hospital", "DISPATCHED", (now - timedelta(days=2)).strftime("%Y-%m-%d")),
        ("REQ-ASHA-0002", "Sunita Devi (Ward 3 & 4)", "Amoxicillin 250mg Syrup", 25, 25, 0, "Bottles", "High", "Critical shortage for pediatric bacterial infections.", "Approved, pending dispatch from depot.", "APPROVED", None),
        ("REQ-ASHA-0003", "Sunita Devi (Ward 3 & 4)", "ORS & Zinc Kits", 50, 0, 0, "Kits", "High", "Monsoon seasonal spike in dehydration cases anticipated.", "Submitted for review.", "PENDING", None),
    ]
    for r_id, a_name, m_name, req_q, app_q, disp_q, unit, urg, rsn, nts, st, disp_d in med_reqs:
        cursor.execute("""
        INSERT INTO medicine_requests (
            request_id, asha_worker_name, medicine_name, requested_quantity,
            approved_quantity, dispatched_quantity, unit, urgency, reason,
            notes, status, dispatch_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            r_id, a_name, m_name, req_q, app_q, disp_q, unit, urg, rsn, nts, st, disp_d, now_str, now_str
        ))

    conn.commit()
    conn.close()
    return {"status": "success", "items_count": len(items_data)}


if __name__ == "__main__":
    res = seed_database(force=True)
    print("Seed database result:", res)
