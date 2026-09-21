/**
 * demoSession.ts
 * Manages user authentication & demo sessions for Citizen, Employee, and Admin portals.
 */

import type { DemoSession, DemoVillager, DemoEmployee, DemoAdmin, UserRole } from "@/types";

const SESSION_KEY = "nivaaran_demo_session";

export interface DemoAccount {
  id: string;
  email: string;
  phone?: string;
  password: string;
  name: string;
  roleTitle: string;
  role: UserRole;
  village?: string;
  department?: string;
  jurisdiction?: string;
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
    role: "citizen",
    village: "Shyampet",
    badge: "Citizen Portal",
    badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300",
    redirectUrl: "/citizen/dashboard",
    description: "Report civic hazards (potholes, live wires, leaks) with AI Vision, weather & mandi rates",
  },
  {
    id: "EMP-001",
    email: "employee@civic.gov.in",
    phone: "9876543211",
    password: "emp123",
    name: "Ravi Kumar",
    roleTitle: "Senior Field Engineer",
    role: "employee",
    department: "Roads & Infrastructure Department",
    jurisdiction: "Shyampet & Ward 1-3",
    badge: "Field Operations",
    badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
    redirectUrl: "/employee/dashboard",
    description: "Accept assigned tasks, update on-site status, upload resolution proof & submit for audit",
  },
  {
    id: "ADM-001",
    email: "admin@civic.gov.in",
    phone: "9876543212",
    password: "admin123",
    name: "Rajesh Sharma",
    roleTitle: "Panchayat Secretary / Operations Lead",
    role: "admin",
    jurisdiction: "Shyampet Gram Panchayat (Wards 1-6)",
    badge: "Admin & Command",
    badgeColor: "bg-indigo-100 text-indigo-900 border-indigo-300",
    redirectUrl: "/admin/dashboard",
    description: "AI triage review, employee workload recommendation, assignment overrides & proof verification",
  },
];

export const DEMO_CITIZEN: DemoVillager = {
  id: DEMO_ACCOUNTS[0].id,
  name: DEMO_ACCOUNTS[0].name,
  role: "citizen",
  village: DEMO_ACCOUNTS[0].village || "Shyampet",
  email: DEMO_ACCOUNTS[0].email,
};

export const DEMO_VILLAGER = DEMO_CITIZEN;

export const DEMO_EMPLOYEE: DemoEmployee = {
  id: DEMO_ACCOUNTS[1].id,
  name: DEMO_ACCOUNTS[1].name,
  role: "employee",
  department: DEMO_ACCOUNTS[1].department || "Roads & Infrastructure",
  role_title: DEMO_ACCOUNTS[1].roleTitle,
  email: DEMO_ACCOUNTS[1].email,
};

export const DEMO_ADMIN: DemoAdmin = {
  id: DEMO_ACCOUNTS[2].id,
  name: DEMO_ACCOUNTS[2].name,
  role: "admin",
  jurisdiction: DEMO_ACCOUNTS[2].jurisdiction || "Shyampet Gram Panchayat",
  email: DEMO_ACCOUNTS[2].email,
};

// ── Authentication & Session Helpers ────────────────────────────────────────

const RAW_API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export async function loginWithCredentialsAsync(
  identifier: string,
  pass: string,
  role?: string
): Promise<{ success: true; redirectUrl: string; session: DemoSession } | { success: false; error: string }> {
  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = pass.trim();

  if (!cleanId || !cleanPass) {
    return { success: false, error: "Please enter both identifier and password." };
  }

  // Attempt server-side login first
  try {
    const res = await fetch(`${RAW_API_URL}/api/demo/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: cleanId, password: cleanPass, role }),
    });

    if (res.ok) {
      const result = await res.json();
      const user = result.data;
      const userRole = result.role as UserRole;
      let sessionData: DemoSession;

      if (userRole === "employee") {
        sessionData = {
          id: user.id || "EMP-001",
          name: user.name || "Field Employee",
          role: "employee",
          department: user.department || "Field Team",
          role_title: user.role_title,
          email: user.email,
        };
      } else if (userRole === "admin") {
        sessionData = {
          id: user.id || "ADM-001",
          name: user.name || "Admin Official",
          role: "admin",
          jurisdiction: user.jurisdiction || "Gram Panchayat",
          email: user.email,
        };
      } else {
        sessionData = {
          id: user.id || "demo-villager-001",
          name: user.name || "Ramesh Kumar",
          role: "citizen",
          village: user.village || "Shyampet",
          email: user.email,
        };
      }

      if (typeof window !== "undefined") {
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      }

      const redirectUrl =
        userRole === "employee"
          ? "/employee/dashboard"
          : userRole === "admin"
          ? "/admin/dashboard"
          : "/citizen/dashboard";

      return { success: true, redirectUrl, session: sessionData };
    } else if (res.status === 401 || res.status === 403) {
      const err = await res.json().catch(() => ({ detail: "Invalid credentials" }));
      return { success: false, error: err.detail || "Invalid credentials." };
    }
  } catch {
    // Backend offline; proceed with offline local fallback
  }

  // Fallback to local accounts
  return loginWithCredentials(identifier, pass, role);
}

export function loginWithCredentials(
  identifier: string,
  pass: string,
  preferredRole?: string
): { success: true; redirectUrl: string; session: DemoSession } | { success: false; error: string } {
  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = pass.trim();

  if (!cleanId || !cleanPass) {
    return { success: false, error: "Please enter both identifier (email/phone/ID) and password." };
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
      return { success: false, error: "Invalid password for this account." };
    }
    return {
      success: false,
      error: "Account not found. For demo, use citizen@civic.gov.in, employee@civic.gov.in, or admin@civic.gov.in",
    };
  }

  if (preferredRole && preferredRole !== "all") {
    const pRole = preferredRole.toLowerCase();
    const mRole = matched.role.toLowerCase();
    const isCitizenMatch = (pRole === "villager" || pRole === "citizen") && (mRole === "villager" || mRole === "citizen");
    if (!isCitizenMatch && pRole !== mRole) {
      return {
        success: false,
        error: `Role mismatch: This account is registered for the ${matched.roleTitle} portal.`,
      };
    }
  }

  let sessionData: DemoSession;
  if (matched.role === "employee") {
    sessionData = {
      id: matched.id,
      name: matched.name,
      role: "employee",
      department: matched.department || "Operations",
      role_title: matched.roleTitle,
      email: matched.email,
    };
  } else if (matched.role === "admin") {
    sessionData = {
      id: matched.id,
      name: matched.name,
      role: "admin",
      jurisdiction: matched.jurisdiction || "Gram Panchayat",
      email: matched.email,
    };
  } else {
    sessionData = {
      id: matched.id,
      name: matched.name,
      role: "citizen",
      village: matched.village || "Shyampet",
      email: matched.email,
    };
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  }

  return { success: true, redirectUrl: matched.redirectUrl, session: sessionData };
}

export function setCitizenSession(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(DEMO_CITIZEN));
}

export function setVillagerSession(): void {
  setCitizenSession();
}

export function setEmployeeSession(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(DEMO_EMPLOYEE));
}

export function setAdminSession(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(DEMO_ADMIN));
}

export function setSessionByAccount(account: DemoAccount): void {
  if (typeof window === "undefined") return;
  let sessionData: DemoSession;

  if (account.role === "employee") {
    sessionData = {
      id: account.id,
      name: account.name,
      role: "employee",
      department: account.department || "Operations",
      role_title: account.roleTitle,
      email: account.email,
    };
  } else if (account.role === "admin") {
    sessionData = {
      id: account.id,
      name: account.name,
      role: "admin",
      jurisdiction: account.jurisdiction || "Gram Panchayat",
      email: account.email,
    };
  } else {
    sessionData = {
      id: account.id,
      name: account.name,
      role: "citizen",
      village: account.village || "Shyampet",
      email: account.email,
    };
  }

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

export function isCitizen(session: DemoSession | null): session is DemoVillager {
  return session?.role === "citizen" || session?.role === "villager";
}

export function isVillager(session: DemoSession | null): session is DemoVillager {
  return isCitizen(session);
}

export function isEmployee(session: DemoSession | null): session is DemoEmployee {
  return session?.role === "employee";
}

export function isAdmin(session: DemoSession | null): session is DemoAdmin {
  return session?.role === "admin";
}

