"""
Civic Catalyst — Supabase Medical Inventory & Database Manager
All data reads/writes first target Supabase cloud.
If Supabase is paused, offline, or unreachable, seamlessly falls back to local SQLite (inventory.db).
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import os
import sqlite3

from supabase_client import supabase
from db import get_db_connection, init_db, row_to_dict

init_db()


# ── Helper Status Calculator ──────────────────────────────────────────────────

def calculate_status(qty: int, min_q: int, expiry_str: Optional[str]) -> str:
    if qty == 0:
        return "Out of Stock"
    if expiry_str:
        try:
            exp = datetime.strptime(expiry_str, "%Y-%m-%d")
            if (exp - datetime.now()).days < 0:
                return "Expired"
            elif (exp - datetime.now()).days <= 30:
                return "Expiring Soon"
        except ValueError:
            pass
    if qty <= min_q:
        return "Low Stock"
    return "Healthy"


# ── SQLite Fallback Read Helpers ──────────────────────────────────────────────

def _sqlite_get_items() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
        SELECT i.*, c.name as category_name, s.name as supplier_name
        FROM inventory_items i
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN suppliers s ON i.supplier_id = s.id
        ORDER BY i.id ASC
    """)
    items = [dict(r) for r in c.fetchall()]
    conn.close()
    for item in items:
        item["status"] = calculate_status(
            item.get("current_quantity", 0),
            item.get("min_quantity", 10),
            item.get("expiry_date")
        )
    return items


def _sqlite_get_categories() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM categories ORDER BY id ASC")
    res = [dict(r) for r in c.fetchall()]
    conn.close()
    return res


def _sqlite_get_suppliers() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM suppliers ORDER BY id ASC")
    res = [dict(r) for r in c.fetchall()]
    conn.close()
    return res


def _sqlite_get_transactions() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
        SELECT t.*, i.item_name, i.unit
        FROM inventory_transactions t
        LEFT JOIN inventory_items i ON t.item_id = i.id
        ORDER BY t.id DESC
    """)
    res = [dict(r) for r in c.fetchall()]
    conn.close()
    return res


def _sqlite_get_distributions() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
        SELECT d.*, i.item_name, i.unit
        FROM distribution_records d
        LEFT JOIN inventory_items i ON d.item_id = i.id
        ORDER BY d.id DESC
    """)
    res = [dict(r) for r in c.fetchall()]
    conn.close()
    return res


def _sqlite_get_alerts() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
        SELECT a.*, i.item_name
        FROM alerts a
        LEFT JOIN inventory_items i ON a.item_id = i.id
        WHERE a.resolved = 0
        ORDER BY a.id DESC
    """)
    db_alerts = [dict(r) for r in c.fetchall()]
    conn.close()

    items = _sqlite_get_items()
    alerted_item_ids = {a.get("item_id") for a in db_alerts}
    generated_alerts = []
    for item in items:
        status = calculate_status(item.get("current_quantity", 0), item.get("min_quantity", 10), item.get("expiry_date"))
        if item.get("current_quantity", 0) <= 10 or status in ["Out of Stock", "Low Stock", "Expiring Soon", "Expired"]:
            if item["id"] in alerted_item_ids:
                continue
            severity = "CRITICAL" if item.get("current_quantity", 0) == 0 or status == "Expired" else "WARNING"
            msg = (
                f"🚨 [Urgent Mandal Requisition] {item['item_name']} stock dropped to "
                f"{item.get('current_quantity', 0)} {item.get('unit', 'Units')} (<= 10 units safety threshold). "
                f"Auto-reported to Mandal Hospital for emergency supply dispatch."
            )
            generated_alerts.append({
                "id": -(item["id"]),
                "item_id": item["id"],
                "item_name": item["item_name"],
                "alert_type": "MANDAL_REQUISITION_REPORTED",
                "severity": severity,
                "message": msg,
                "resolved": False,
                "created_at": datetime.now().isoformat(),
            })
    return db_alerts + generated_alerts


def _sqlite_get_medicine_requests() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM medicine_requests ORDER BY id DESC")
    data = [dict(r) for r in c.fetchall()]
    conn.close()
    return data


# ── Database Read Operations with Fallback ────────────────────────────────────

def get_items() -> List[Dict[str, Any]]:
    """Fetch all medical inventory items from Supabase or SQLite fallback."""
    try:
        res = supabase.table("inventory_items").select("*").order("id", desc=False).execute()
        if res.data is not None:
            return res.data
    except Exception as e:
        print(f"[Supabase Offline -> SQLite fallback] get_items: {e}")
    return _sqlite_get_items()


def get_categories() -> List[Dict[str, Any]]:
    try:
        res = supabase.table("categories").select("*").order("id", desc=False).execute()
        if res.data is not None:
            return res.data
    except Exception as e:
        print(f"[Supabase Offline -> SQLite fallback] get_categories: {e}")
    return _sqlite_get_categories()


def get_suppliers() -> List[Dict[str, Any]]:
    try:
        res = supabase.table("suppliers").select("*").order("id", desc=False).execute()
        if res.data is not None:
            return res.data
    except Exception as e:
        print(f"[Supabase Offline -> SQLite fallback] get_suppliers: {e}")
    return _sqlite_get_suppliers()


def get_transactions() -> List[Dict[str, Any]]:
    try:
        res = supabase.table("inventory_transactions").select("*").order("id", desc=True).execute()
        if res.data is not None:
            return res.data
    except Exception as e:
        print(f"[Supabase Offline -> SQLite fallback] get_transactions: {e}")
    return _sqlite_get_transactions()


def get_distributions() -> List[Dict[str, Any]]:
    try:
        res = supabase.table("distribution_records").select("*").order("id", desc=True).execute()
        if res.data is not None:
            return res.data
    except Exception as e:
        print(f"[Supabase Offline -> SQLite fallback] get_distributions: {e}")
    return _sqlite_get_distributions()


def get_alerts() -> List[Dict[str, Any]]:
    """Fetch unresolved alerts from Supabase or SQLite fallback."""
    try:
        res = supabase.table("alerts").select("*").eq("resolved", False).order("id", desc=True).execute()
        db_alerts = res.data or []
        items_res = supabase.table("inventory_items").select("*").execute()
        items = items_res.data or []

        alerted_item_ids = {a["item_id"] for a in db_alerts}
        generated_alerts = []

        for item in items:
            status = calculate_status(item["current_quantity"], item["min_quantity"], item.get("expiry_date"))
            if item["current_quantity"] <= 10 or status in ["Out of Stock", "Low Stock", "Expiring Soon", "Expired"]:
                if item["id"] in alerted_item_ids:
                    continue
                severity = "CRITICAL" if item["current_quantity"] == 0 or status == "Expired" else "WARNING"
                msg = (
                    f"🚨 [Urgent Mandal Requisition] {item['item_name']} stock dropped to "
                    f"{item['current_quantity']} {item['unit']} (<= 10 units safety threshold). "
                    f"Auto-reported to Mandal Hospital for emergency supply dispatch."
                )
                generated_alerts.append({
                    "id": -(item["id"]),
                    "item_id": item["id"],
                    "item_name": item["item_name"],
                    "alert_type": "MANDAL_REQUISITION_REPORTED",
                    "severity": severity,
                    "message": msg,
                    "resolved": False,
                    "created_at": datetime.now().isoformat(),
                })

        return db_alerts + generated_alerts
    except Exception as e:
        print(f"[Supabase Offline -> SQLite fallback] get_alerts: {e}")
        return _sqlite_get_alerts()


def resolve_alert(alert_id: int) -> bool:
    if alert_id < 0:
        return True
    try:
        supabase.table("alerts").update({"resolved": True}).eq("id", alert_id).execute()
    except Exception as e:
        print(f"[Supabase Offline -> SQLite fallback] resolve_alert: {e}")
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("UPDATE alerts SET resolved = 1 WHERE id = ?", (alert_id,))
        conn.commit()
        conn.close()
    return True


# ── Create / Update Operations with Fallback ──────────────────────────────────

def _sqlite_create_item(data: Dict[str, Any]) -> Dict[str, Any]:
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT count(*) as cnt FROM inventory_items")
    cnt = c.fetchone()["cnt"] + 1
    item_code = f"ASH-INV-{cnt:03d}"

    c.execute("""
        INSERT INTO inventory_items (
            item_id_code, item_name, category_id, unit, current_quantity, min_quantity, max_quantity,
            batch_number, expiry_date, supplier_id, last_restocked, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        item_code,
        data["item_name"],
        data.get("category_id", 1),
        data.get("unit", "Strips"),
        data.get("current_quantity", 50),
        data.get("min_quantity", 15),
        data.get("max_quantity", 250),
        data.get("batch_number", f"BAT-NEW-{datetime.now().strftime('%Y%m%d')}"),
        data.get("expiry_date", "2027-12-31"),
        data.get("supplier_id", 1),
        datetime.now().strftime("%Y-%m-%d"),
        now_str,
        now_str
    ))
    new_id = c.lastrowid
    conn.commit()
    c.execute("""
        SELECT i.*, c.name as category_name, s.name as supplier_name
        FROM inventory_items i
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN suppliers s ON i.supplier_id = s.id
        WHERE i.id = ?
    """, (new_id,))
    item = dict(c.fetchone())
    conn.close()
    item["status"] = calculate_status(item["current_quantity"], item["min_quantity"], item.get("expiry_date"))
    return item


def create_item(data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        now_str = datetime.now().isoformat()
        status = calculate_status(
            data.get("current_quantity", 50),
            data.get("min_quantity", 15),
            data.get("expiry_date"),
        )
        res = supabase.table("inventory_items").select("id").order("id", desc=True).limit(1).execute()
        next_id = (res.data[0]["id"] + 1) if res.data else 1
        item_code = f"ASH-INV-{next_id:03d}"

        row = {
            "item_id_code": item_code,
            "item_name": data["item_name"],
            "category_id": data.get("category_id", 1),
            "category_name": data.get("category_name", "Medicines"),
            "unit": data.get("unit", "Strips"),
            "current_quantity": data.get("current_quantity", 50),
            "min_quantity": data.get("min_quantity", 15),
            "max_quantity": data.get("max_quantity", 250),
            "batch_number": data.get("batch_number", f"BAT-NEW-{datetime.now().strftime('%Y%m%d')}"),
            "expiry_date": data.get("expiry_date", "2027-12-31"),
            "supplier_id": data.get("supplier_id", 1),
            "supplier_name": data.get("supplier_name", "District Medical Warehouse"),
            "last_restocked": datetime.now().strftime("%Y-%m-%d"),
            "status": status,
            "created_at": now_str,
            "updated_at": now_str,
        }
        result = supabase.table("inventory_items").insert(row).execute()
        if result.data:
            return result.data[0]
    except Exception as e:
        print(f"[Supabase Offline -> SQLite fallback] create_item: {e}")
    return _sqlite_create_item(data)


def _sqlite_restock_item(
    item_id: int,
    quantity: int,
    batch_number: Optional[str] = None,
    expiry_date: Optional[str] = None,
    supplier_id: Optional[int] = None,
    ref: str = "MANDAL_ACCEPTED_AND_DELIVERED",
    notes: str = "",
) -> Dict[str, Any]:
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    today_str = datetime.now().strftime("%Y-%m-%d")
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM inventory_items WHERE id = ?", (item_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise ValueError(f"Item ID {item_id} not found in database")
    item = dict(row)
    prev_qty = item["current_quantity"]
    new_qty = prev_qty + quantity
    new_expiry = expiry_date or (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")

    c.execute("""
        UPDATE inventory_items
        SET current_quantity = ?, batch_number = ?, expiry_date = ?, last_restocked = ?, updated_at = ?
        WHERE id = ?
    """, (
        new_qty,
        batch_number or f"BAT-MANDAL-{datetime.now().strftime('%Y%m%d')}",
        new_expiry,
        today_str,
        now_str,
        item_id
    ))

    c.execute("SELECT count(*) as cnt FROM inventory_transactions")
    tx_cnt = c.fetchone()["cnt"] + 1
    tx_code = f"TX-RESTOCK-{tx_cnt:03d}"
    c.execute("""
        INSERT INTO inventory_transactions (
            transaction_id_code, item_id, transaction_type, quantity, previous_quantity, new_quantity, date, reference, notes, created_at
        ) VALUES (?, ?, 'STOCK_IN', ?, ?, ?, ?, ?, ?, ?)
    """, (
        tx_code, item_id, quantity, prev_qty, new_qty, today_str,
        ref or "MANDAL_ACCEPTED_AND_DELIVERED",
        notes or f"Delivered by Mandal Central Hospital HQ (+{quantity} {item['unit']}).",
        now_str
    ))

    c.execute("UPDATE alerts SET resolved = 1 WHERE item_id = ?", (item_id,))
    conn.commit()

    c.execute("SELECT * FROM inventory_items WHERE id = ?", (item_id,))
    updated_item = dict(c.fetchone())
    conn.close()
    updated_item["status"] = calculate_status(updated_item["current_quantity"], updated_item["min_quantity"], updated_item.get("expiry_date"))
    return updated_item


def restock_item(
    item_id: int,
    quantity: int,
    batch_number: Optional[str] = None,
    expiry_date: Optional[str] = None,
    supplier_id: Optional[int] = None,
    ref: str = "MANDAL_ACCEPTED_AND_DELIVERED",
    notes: str = "",
) -> Dict[str, Any]:
    try:
        now_str = datetime.now().isoformat()
        res = supabase.table("inventory_items").select("*").eq("id", item_id).single().execute()
        if res.data:
            item = res.data
            prev_qty = item["current_quantity"]
            new_qty = prev_qty + quantity
            new_expiry = expiry_date or (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
            new_status = calculate_status(new_qty, item["min_quantity"], new_expiry)

            updated_res = supabase.table("inventory_items").update({
                "current_quantity": new_qty,
                "status": new_status,
                "batch_number": batch_number or f"BAT-MANDAL-{datetime.now().strftime('%Y%m%d')}",
                "expiry_date": new_expiry,
                "last_restocked": datetime.now().strftime("%Y-%m-%d"),
                "updated_at": now_str,
            }).eq("id", item_id).execute()

            tx_res = supabase.table("inventory_transactions").select("id").order("id", desc=True).limit(1).execute()
            tx_next = (tx_res.data[0]["id"] + 1) if tx_res.data else 1

            tx = {
                "transaction_id_code": f"TX-RESTOCK-{tx_next:03d}",
                "item_id": item_id,
                "item_name": item["item_name"],
                "transaction_type": "STOCK_IN",
                "quantity": quantity,
                "previous_quantity": prev_qty,
                "new_quantity": new_qty,
                "date": now_str,
                "reference": ref or "MANDAL_ACCEPTED_AND_DELIVERED",
                "notes": notes or f"✓ Delivered by Mandal Central Hospital HQ (+{quantity} {item['unit']}).",
                "created_at": now_str,
            }
            supabase.table("inventory_transactions").insert(tx).execute()
            supabase.table("alerts").update({"resolved": True}).eq("item_id", item_id).execute()
            return updated_res.data[0] if updated_res.data else item
    except Exception as e:
        print(f"[Supabase Offline -> SQLite fallback] restock_item: {e}")
    return _sqlite_restock_item(item_id, quantity, batch_number, expiry_date, supplier_id, ref, notes)


def _sqlite_distribute_item(
    item_id: int,
    quantity: int,
    beneficiary_ref: str = "",
    area_village: str = "",
    purpose: str = "",
    notes: str = "",
    beneficiary: str = "",
) -> Dict[str, Any]:
    beneficiary = beneficiary_ref or beneficiary
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    today_str = datetime.now().strftime("%Y-%m-%d")
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM inventory_items WHERE id = ?", (item_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise ValueError(f"Item ID {item_id} not found in database")
    item = dict(row)
    if item["current_quantity"] < quantity:
        conn.close()
        raise ValueError(f"Insufficient stock for {item['item_name']}. Available: {item['current_quantity']}")

    prev_qty = item["current_quantity"]
    new_qty = prev_qty - quantity
    new_status = calculate_status(new_qty, item["min_quantity"], item.get("expiry_date"))

    c.execute("""
        UPDATE inventory_items
        SET current_quantity = ?, updated_at = ?
        WHERE id = ?
    """, (new_qty, now_str, item_id))

    c.execute("SELECT count(*) as cnt FROM inventory_transactions")
    tx_cnt = c.fetchone()["cnt"] + 1
    tx_code = f"TX-DIST-{tx_cnt:03d}"
    c.execute("""
        INSERT INTO inventory_transactions (
            transaction_id_code, item_id, transaction_type, quantity, previous_quantity, new_quantity, date, reference, notes, created_at
        ) VALUES (?, ?, 'DISTRIBUTION', ?, ?, ?, ?, ?, ?, ?)
    """, (
        tx_code, item_id, quantity, prev_qty, new_qty, today_str,
        f"DIST-{area_village}",
        f"Beneficiary: {beneficiary} ({area_village})",
        now_str
    ))
    tx_id = c.lastrowid

    c.execute("""
        INSERT INTO distribution_records (
            transaction_id, item_id, quantity, beneficiary_ref, area_village, purpose, date, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        tx_id, item_id, quantity, beneficiary, area_village,
        purpose or "Healthcare Distribution",
        today_str, notes, now_str
    ))
    dist_id = c.lastrowid

    if new_qty <= 10:
        severity = "CRITICAL" if new_qty == 0 else "WARNING"
        msg = f"🚨 [Urgent Mandal Requisition] Stock for '{item['item_name']}' dropped to {new_qty} {item['unit']} (<= 10 units)."
        c.execute("""
            INSERT INTO alerts (item_id, alert_type, severity, message, resolved, created_at)
            VALUES (?, 'MANDAL_REQUISITION_REPORTED', ?, ?, 0, ?)
        """, (item_id, severity, msg, now_str))

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "message": f"Distributed {quantity} {item['unit']} to {beneficiary}",
        "distribution_id": dist_id,
        "remaining_quantity": new_qty,
        "item": {**item, "current_quantity": new_qty, "status": new_status},
    }


def distribute_item(
    item_id: int,
    quantity: int,
    beneficiary_ref: str = "",
    area_village: str = "",
    purpose: str = "",
    notes: str = "",
    beneficiary: str = "",
) -> Dict[str, Any]:
    beneficiary = beneficiary_ref or beneficiary
    try:
        now_str = datetime.now().isoformat()
        res = supabase.table("inventory_items").select("*").eq("id", item_id).single().execute()
        if res.data:
            item = res.data
            if item["current_quantity"] < quantity:
                raise ValueError(f"Insufficient stock for {item['item_name']}. Available: {item['current_quantity']}")

            prev_qty = item["current_quantity"]
            new_qty = prev_qty - quantity
            new_status = calculate_status(new_qty, item["min_quantity"], item.get("expiry_date"))

            supabase.table("inventory_items").update({
                "current_quantity": new_qty,
                "status": new_status,
                "updated_at": now_str,
            }).eq("id", item_id).execute()

            tx_res = supabase.table("inventory_transactions").select("id").order("id", desc=True).limit(1).execute()
            tx_next = (tx_res.data[0]["id"] + 1) if tx_res.data else 1
            tx_code = f"TX-DIST-{tx_next:03d}"

            tx = {
                "transaction_id_code": tx_code,
                "item_id": item_id,
                "item_name": item["item_name"],
                "transaction_type": "DISTRIBUTION",
                "quantity": quantity,
                "previous_quantity": prev_qty,
                "new_quantity": new_qty,
                "date": now_str,
                "reference": f"DIST-{area_village}",
                "notes": f"Beneficiary: {beneficiary} ({area_village})",
                "created_at": now_str,
            }
            tx_result = supabase.table("inventory_transactions").insert(tx).execute()
            tx_id = tx_result.data[0]["id"] if tx_result.data else 1

            dist = {
                "transaction_id": tx_id,
                "item_id": item_id,
                "item_name": item["item_name"],
                "unit": item.get("unit", "Units"),
                "quantity": quantity,
                "beneficiary_ref": beneficiary,
                "area_village": area_village,
                "purpose": purpose or "Healthcare Distribution",
                "date": now_str,
                "notes": notes,
                "created_at": now_str,
            }
            dist_result = supabase.table("distribution_records").insert(dist).execute()
            dist_id = dist_result.data[0]["id"] if dist_result.data else 1

            if new_qty <= 10:
                alert_msg = (
                    f"🚨 [Urgent Mandal Requisition] Stock for '{item['item_name']}' dropped to "
                    f"{new_qty} {item['unit']} (<= 10 units). Auto-reported to Mandal Hospital for emergency delivery."
                )
                supabase.table("alerts").insert({
                    "item_id": item_id,
                    "item_name": item["item_name"],
                    "alert_type": "MANDAL_REQUISITION_REPORTED",
                    "severity": "CRITICAL" if new_qty == 0 else "WARNING",
                    "message": alert_msg,
                    "resolved": False,
                    "created_at": now_str,
                }).execute()

            return {
                "status": "success",
                "message": f"Distributed {quantity} {item['unit']} to {beneficiary}",
                "distribution_id": dist_id,
                "remaining_quantity": new_qty,
                "item": {**item, "current_quantity": new_qty, "status": new_status},
            }
    except ValueError:
        raise
    except Exception as e:
        print(f"[Supabase Offline -> SQLite fallback] distribute_item: {e}")
    return _sqlite_distribute_item(item_id, quantity, beneficiary_ref, area_village, purpose, notes, beneficiary)


# ── Medicine Request Workflow with Fallback ────────────────────────────────────

def get_medicine_requests() -> List[Dict[str, Any]]:
    try:
        res = supabase.table("medicine_requests").select("*").order("created_at", desc=True).execute()
        if res.data is not None:
            data = res.data
            status_prio = {"PENDING": 1, "UNDER_REVIEW": 1, "NEW": 1, "REQUESTED": 1, "APPROVED": 2, "PARTIALLY_APPROVED": 2, "DISPATCHED": 3, "RECEIVED": 4, "REJECTED": 5}
            def get_sort_key(r):
                st = str(r.get("status", "")).strip().upper()
                prio = status_prio.get(st, 99)
                ts = 0
                cat_str = str(r.get("created_at", "") or "")
                if cat_str:
                    try:
                        ts = datetime.fromisoformat(cat_str.replace("Z", "+00:00")).timestamp()
                    except Exception:
                        ts = 0
                req_id_num = int(r.get("id") or 0)
                return (prio, -ts, -req_id_num)
            return sorted(data, key=get_sort_key)
    except Exception as e:
        print(f"[Supabase Offline -> SQLite fallback] get_medicine_requests: {e}")
    return _sqlite_get_medicine_requests()


def _sqlite_create_medicine_request(data: Dict[str, Any]) -> Dict[str, Any]:
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT count(*) as cnt FROM medicine_requests")
    cnt = c.fetchone()["cnt"] + 1
    req_id = f"REQ-{datetime.now().strftime('%Y%m%d')}-{cnt:03d}"
    c.execute("""
        INSERT INTO medicine_requests (
            request_id, asha_worker_name, medicine_name, requested_quantity, approved_quantity, dispatched_quantity,
            unit, urgency, reason, notes, status, dispatch_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?, 'PENDING', NULL, ?, ?)
    """, (
        req_id,
        data.get("asha_worker_name", "Sunita Devi (Ward 3 & 4)"),
        data["medicine_name"],
        int(data["requested_quantity"]),
        data.get("unit", "Units"),
        data.get("urgency", "Normal"),
        data.get("reason", "ASHA Field Requisition"),
        data.get("notes", ""),
        now_str,
        now_str
    ))
    new_id = c.lastrowid
    conn.commit()
    c.execute("SELECT * FROM medicine_requests WHERE id = ?", (new_id,))
    row = dict(c.fetchone())
    conn.close()
    return row


def create_medicine_request(data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        now_str = datetime.now().isoformat()
        count_res = supabase.table("medicine_requests").select("id").order("id", desc=True).limit(1).execute()
        next_id = (count_res.data[0]["id"] + 1) if count_res.data else 1
        request_id = f"REQ-{datetime.now().strftime('%Y%m%d')}-{next_id:03d}"

        row = {
            "request_id": request_id,
            "asha_worker_name": data.get("asha_worker_name", "Sunita Devi (Ward 3 & 4)"),
            "medicine_name": data["medicine_name"],
            "requested_quantity": int(data["requested_quantity"]),
            "approved_quantity": 0,
            "dispatched_quantity": 0,
            "unit": data.get("unit", "Units"),
            "urgency": data.get("urgency", "Normal"),
            "reason": data.get("reason", "ASHA Field Requisition"),
            "notes": data.get("notes", ""),
            "status": "PENDING",
            "created_at": now_str,
            "updated_at": now_str,
        }
        result = supabase.table("medicine_requests").insert(row).execute()
        if result.data:
            return result.data[0]
    except Exception as e:
        print(f"[Supabase Offline -> SQLite fallback] create_medicine_request: {e}")
    return _sqlite_create_medicine_request(data)


def _sqlite_update_medicine_request_status(
    request_id: str,
    action: str,
    approved_qty: Optional[int] = None,
    dispatched_qty: Optional[int] = None,
    notes: Optional[str] = None,
) -> Dict[str, Any]:
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM medicine_requests WHERE request_id = ?", (request_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise ValueError(f"Request ID {request_id} not found in database")
    req = dict(row)
    act = action.upper()
    status = req["status"]
    app_q = req["approved_quantity"]
    disp_q = req["dispatched_quantity"]
    disp_d = req["dispatch_date"]

    if act in ["APPROVE", "APPROVED"]:
        status = "APPROVED"
        app_q = approved_qty if approved_qty is not None else req["requested_quantity"]
    elif act in ["PARTIALLY_APPROVE", "PARTIAL_APPROVE"]:
        status = "PARTIALLY_APPROVED"
        app_q = approved_qty if approved_qty is not None else req["requested_quantity"]
    elif act in ["REJECT", "REJECTED"]:
        status = "REJECTED"
    elif act in ["DISPATCH", "DISPATCHED", "SEND"]:
        status = "DISPATCHED"
        disp_q = dispatched_qty if (dispatched_qty is not None and dispatched_qty > 0) else (req["approved_quantity"] or req["requested_quantity"])
        disp_d = now_str
    elif act in ["MARK_RECEIVED", "RECEIVED"]:
        status = "RECEIVED"

    c.execute("""
        UPDATE medicine_requests
        SET status = ?, approved_quantity = ?, dispatched_quantity = ?, dispatch_date = ?, notes = coalesce(?, notes), updated_at = ?
        WHERE request_id = ?
    """, (status, app_q, disp_q, disp_d, notes, now_str, request_id))
    conn.commit()
    c.execute("SELECT * FROM medicine_requests WHERE request_id = ?", (request_id,))
    updated = dict(c.fetchone())
    conn.close()
    return updated


def update_medicine_request_status(
    request_id: str,
    action: str,
    approved_qty: Optional[int] = None,
    dispatched_qty: Optional[int] = None,
    notes: Optional[str] = None,
) -> Dict[str, Any]:
    try:
        now_str = datetime.now().isoformat()
        res = supabase.table("medicine_requests").select("*").eq("request_id", request_id).single().execute()
        if res.data:
            req = res.data
            act = action.upper()
            update_payload: Dict[str, Any] = {"updated_at": now_str}

            if act in ["APPROVE", "APPROVED"]:
                update_payload["status"] = "APPROVED"
                update_payload["approved_quantity"] = approved_qty if approved_qty is not None else req["requested_quantity"]
            elif act in ["PARTIALLY_APPROVE", "PARTIAL_APPROVE"]:
                update_payload["status"] = "PARTIALLY_APPROVED"
                update_payload["approved_quantity"] = approved_qty if approved_qty is not None else req["requested_quantity"]
            elif act in ["REJECT", "REJECTED"]:
                update_payload["status"] = "REJECTED"
                if notes:
                    update_payload["notes"] = notes
            elif act in ["DISPATCH", "DISPATCHED", "SEND"]:
                update_payload["status"] = "DISPATCHED"
                qty_to_send = dispatched_qty if (dispatched_qty is not None and dispatched_qty > 0) else (req["approved_quantity"] or req["requested_quantity"])
                update_payload["dispatched_quantity"] = qty_to_send
                update_payload["dispatch_date"] = now_str
            elif act in ["MARK_RECEIVED", "RECEIVED"]:
                update_payload["status"] = "RECEIVED"

            if notes and "notes" not in update_payload:
                update_payload["notes"] = notes

            result = supabase.table("medicine_requests").update(update_payload).eq("request_id", request_id).execute()
            if result.data:
                return result.data[0]
    except Exception as e:
        print(f"[Supabase Offline -> SQLite fallback] update_medicine_request_status: {e}")
    return _sqlite_update_medicine_request_status(request_id, action, approved_qty, dispatched_qty, notes)


def seed_data() -> Dict[str, Any]:
    items = get_items()
    return {"status": "success", "items_count": len(items)}
