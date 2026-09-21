/**
 * demoSession.ts
 * Manages user authentication & demo sessions for Citizen / Villager portal.
 */

import type { DemoSession, DemoVillager } from "@/types";

const SESSION_KEY = "nivaaran_demo_session";

export interface DemoAccount {
  id: string;
  email: string;
  phone?: string;
  password: string;
  name: string;
  roleTitle: string;
  role: "villager";
  village: string;
  badge: string;
  badgeColor: string;
  redirectUrl: string;
  description: string;
}

// ── Demo Accounts with Credentials ──────────────────────────────────────────

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: "demo-villager-001",
    email: "citizen@civic.gov.in",
    phone: "9876543210",
    password: "citizen123",
    name: "Ramesh Kumar",
    roleTitle: "Rural Citizen / Villager",
    role: "villager",
    village: "Shyampet",
    badge: "Citizen Portal",
    badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300",
    redirectUrl: "/citizen/dashboard",
    description: "Report civic hazards (potholes, live wires, leaks) with AI Vision, weather & mandi rates",
  },
];

export const DEMO_VILLAGER: DemoVillager = {
  id: DEMO_ACCOUNTS[0].id,
  name: DEMO_ACCOUNTS[0].name,
  role: "villager",
  village: DEMO_ACCOUNTS[0].village,
};

// ── Authentication & Session Helpers ────────────────────────────────────────

export function loginWithCredentials(
  identifier: string,
  pass: string
): { success: true; redirectUrl: string; session: DemoSession } | { success: false; error: string } {
  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = pass.trim();

  if (!cleanId || !cleanPass) {
    return { success: false, error: "Please enter both identifier (email/phone) and password." };
  }

  const matched = DEMO_ACCOUNTS.find(
    (acc) =>
      (acc.email.toLowerCase() === cleanId ||
        acc.phone === cleanId ||
        acc.id.toLowerCase() === cleanId ||
        acc.role.toLowerCase() === cleanId) &&
      acc.password === cleanPass
  );

  if (!matched) {
    const userExists = DEMO_ACCOUNTS.some(
      (acc) =>
        acc.email.toLowerCase() === cleanId ||
        acc.phone === cleanId ||
        acc.id.toLowerCase() === cleanId
    );
    if (userExists) {
      return { success: false, error: "Invalid password. Use 'citizen123' to sign in." };
    }
    return { success: false, error: "Account not found. Use 'citizen@civic.gov.in' / 'citizen123'." };
  }

  const sessionData: DemoSession = {
    id: matched.id,
    name: matched.name,
    role: "villager",
    village: matched.village,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  }

  return { success: true, redirectUrl: matched.redirectUrl, session: sessionData };
}

export function setVillagerSession(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(DEMO_VILLAGER));
}

export function setSessionByAccount(account: DemoAccount): void {
  if (typeof window === "undefined") return;
  const sessionData: DemoSession = {
    id: account.id,
    name: account.name,
    role: "villager",
    village: account.village,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
}

export function getSession(): DemoSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DemoSession;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export function isVillager(session: DemoSession | null): session is DemoVillager {
  return session?.role === "villager";
}
