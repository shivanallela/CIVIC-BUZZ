// ── Demo data constants ──────────────────────────────────────────────────────

export type UserRole = "villager";

export interface DemoVillager {
  id: string;
  name: string;
  role: "villager";
  village: string;
}

export type DemoSession = DemoVillager;

// ── Complaint stub ───────────────────────────────────────────────────────────

export interface Complaint {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "resolved";
  createdAt: string;
  villagerName: string;
  village: string;
  category?: string;
}
