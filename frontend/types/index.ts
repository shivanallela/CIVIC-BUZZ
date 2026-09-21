// ── Demo data constants ──────────────────────────────────────────────────────

export type UserRole = "citizen" | "employee" | "admin" | "villager" | "panchayat_official";

export interface DemoVillager {
  id: string;
  name: string;
  role: "villager" | "citizen";
  village: string;
  email?: string;
}

export interface DemoCitizen extends DemoVillager {}

export interface DemoEmployee {
  id: string;
  name: string;
  role: "employee";
  department: string;
  role_title?: string;
  email?: string;
}

export interface DemoAdmin {
  id: string;
  name: string;
  role: "admin";
  jurisdiction: string;
  email?: string;
}

export type DemoSession = DemoVillager | DemoEmployee | DemoAdmin;

// ── Multi-Role Lifecycle Interfaces ──────────────────────────────────────────

export interface EmployeeProfile {
  id: string;
  name: string;
  role_title: string;
  department: string;
  jurisdiction: string;
  status: "AVAILABLE" | "BUSY" | "ON_DUTY" | "ON_LEAVE";
  current_tasks_count: number;
  phone?: string;
  email?: string;
  rating?: number;
  latitude?: number;
  longitude?: number;
}

export interface EmployeeRecommendation {
  employee: EmployeeProfile;
  match_score: number;
  reason: string;
  skill_match: boolean;
  department_match: boolean;
  workload_score: number;
  distance_km: number;
}

export interface AuditEvent {
  id: string;
  complaint_id: string;
  event?: string;
  action?: string;
  actor?: string;
  actor_name?: string;
  actor_role?: string;
  timestamp?: string;
  created_at?: string;
  notes?: string;
  details?: any;
}

// ── Complaint stub ───────────────────────────────────────────────────────────

export interface Complaint {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "resolved" | "assigned" | "resolution_submitted";
  createdAt: string;
  villagerName: string;
  village: string;
  category?: string;
}

