"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  getSession,
  isAdmin,
  clearSession,
  setAdminSession,
  DEMO_ADMIN,
} from "@/services/demoSession";
import type { DemoAdmin, EmployeeProfile, EmployeeRecommendation, AuditEvent } from "@/types";
import { CivicLogo } from "@/components/CivicLogo";
import IndianNationalEmblem from "@/components/IndianNationalEmblem";
import {
  fetchComplaintsApi,
  fetchEmployeesApi,
  fetchEmployeeRecommendationsApi,
  assignComplaintApi,
  verifyResolutionApi,
  fetchAuditLogsApi,
  Complaint,
} from "@/services/complaintsApi";
import {
  LayoutDashboard,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  RefreshCw,
  LogOut,
  ChevronRight,
  Sparkles,
  Check,
  X,
  FileCheck2,
  RotateCcw,
  History,
  HardHat,
  Phone,
  ArrowRight,
} from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<DemoAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "complaints" | "verification" | "workforce" | "audit"
  >("overview");

  // Data state
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Modals & Drawers
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [recommendations, setRecommendations] = useState<EmployeeRecommendation[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [assigneeNotes, setAssigneeNotes] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Verification modal state
  const [verifyingComplaint, setVerifyingComplaint] = useState<Complaint | null>(null);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [isSubmittingVerify, setIsSubmittingVerify] = useState(false);

  // Session check
  useEffect(() => {
    const s = getSession();
    if (!s) {
      setAdminSession();
      setAdminUser(DEMO_ADMIN);
    } else if (isAdmin(s)) {
      setAdminUser(s);
    } else {
      setAdminSession();
      setAdminUser(DEMO_ADMIN);
    }
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [cData, empData, logsData] = await Promise.all([
        fetchComplaintsApi().catch(() => []),
        fetchEmployeesApi().catch(() => []),
        fetchAuditLogsApi().catch(() => []),
      ]);
      setComplaints(cData);
      setEmployees(empData);
      setAuditLogs(logsData);
    } catch (err) {
      console.error("Error loading admin dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
  };

  const handleLogout = () => {
    clearSession();
    router.push("/");
  };

  // Open complaint detail drawer and load AI recommendations
  const handleOpenComplaint = async (c: Complaint) => {
    setSelectedComplaint(c);
    setRecommendations([]);
    setAssigneeNotes("");
    setRecLoading(true);
    try {
      const res = await fetchEmployeeRecommendationsApi(c.id);
      if (res.success && res.recommendations) {
        setRecommendations(res.recommendations);
      }
    } catch (err) {
      console.warn("Failed to fetch AI employee recommendations", err);
    } finally {
      setRecLoading(false);
    }
  };

  // Assign complaint
  const handleAssign = async (employeeId: string, employeeName?: string) => {
    if (!selectedComplaint) return;
    setIsAssigning(true);
    try {
      await assignComplaintApi(selectedComplaint.id, {
        employee_id: employeeId,
        department: selectedComplaint.recommended_department,
        admin_notes: assigneeNotes,
        admin_name: adminUser?.name || "Panchayat Secretary",
      });
      setActionSuccessMessage(`Successfully assigned task to ${employeeName || employeeId}!`);
      setTimeout(() => setActionSuccessMessage(null), 4000);
      setSelectedComplaint(null);
      await loadAllData();
    } catch (err: any) {
      alert(`Assignment failed: ${err.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  // Verify resolution
  const handleVerify = async (approved: boolean) => {
    if (!verifyingComplaint) return;
    setIsSubmittingVerify(true);
    try {
      await verifyResolutionApi(verifyingComplaint.id, {
        approved,
        admin_notes: verificationNotes,
        admin_name: adminUser?.name || "Panchayat Secretary",
      });
      setActionSuccessMessage(
        approved
          ? "Resolution approved! Complaint is now officially marked RESOLVED."
          : "Rework requested. Task sent back to field engineer."
      );
      setTimeout(() => setActionSuccessMessage(null), 4000);
      setVerifyingComplaint(null);
      setVerificationNotes("");
      await loadAllData();
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    } finally {
      setIsSubmittingVerify(false);
    }
  };

  // Computed KPIs
  const kpis = useMemo(() => {
    const total = complaints.length;
    const pendingTriage = complaints.filter(
      (c) => c.status === "pending" || !c.assigned_employee_id
    ).length;
    const inProgress = complaints.filter(
      (c) => c.status === "in_progress" || c.status === "assigned"
    ).length;
    const awaitingVerify = complaints.filter(
      (c) => c.status === "resolution_submitted" || (c.status === "in_progress" && c.resolution_image_url)
    ).length;
    const resolved = complaints.filter((c) => c.status === "resolved").length;
    const critical = complaints.filter(
      (c) => c.priority_tier === "CRITICAL" || c.urgency === "High"
    ).length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 100;

    return { total, pendingTriage, inProgress, awaitingVerify, resolved, critical, resolutionRate };
  }, [complaints]);

  // Filtered complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.complaint_id_code || c.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.villager_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.location || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "pending" && (c.status === "pending" || !c.assigned_employee_id)) ||
        (statusFilter === "assigned" && c.status === "assigned") ||
        (statusFilter === "in_progress" && c.status === "in_progress") ||
        (statusFilter === "resolution_submitted" &&
          (c.status === "resolution_submitted" || c.resolution_image_url)) ||
        (statusFilter === "resolved" && c.status === "resolved");

      const matchesPriority =
        priorityFilter === "ALL" ||
        (c.priority_tier && c.priority_tier.toUpperCase() === priorityFilter.toUpperCase()) ||
        (!c.priority_tier && c.urgency && c.urgency.toUpperCase() === priorityFilter.toUpperCase());

      const matchesCategory =
        categoryFilter === "ALL" ||
        (c.category && c.category.toLowerCase() === categoryFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });
  }, [complaints, searchTerm, statusFilter, priorityFilter, categoryFilter]);

  // Awaiting verification items
  const verificationList = useMemo(() => {
    return complaints.filter(
      (c) =>
        c.status === "resolution_submitted" ||
        (c.resolution_image_url && c.status !== "resolved")
    );
  }, [complaints]);

  return (
    <div className="min-h-screen bg-slate-50/80 flex flex-col font-sans text-slate-900">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <CivicLogo size="sm" />
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <IndianNationalEmblem className="h-6 w-6 text-slate-700 hidden sm:inline-block" />
              <div>
                <span className="font-black text-slate-900 text-sm sm:text-base tracking-tight flex items-center gap-2">
                  Civic Catalyst
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200">
                    Admin Command
                  </span>
                </span>
                <p className="text-[10px] text-slate-500 hidden sm:block">
                  Panchayat Operations & Field Dispatch Center
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-all cursor-pointer"
              title="Refresh live feeds"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            </button>

            <div className="h-8 w-px bg-slate-200" />

            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-indigo-900 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                {adminUser?.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("") || "AD"}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {adminUser?.name || "Rajesh Sharma"}
                </p>
                <p className="text-[10px] text-slate-500">{adminUser?.jurisdiction || "Shyampet GP"}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-600 transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Success Alert Banner ────────────────────────────────────────────── */}
      {actionSuccessMessage && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* ── Navigation Tabs ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2">
            {[
              { id: "overview", label: "Operations Hub", icon: LayoutDashboard },
              {
                id: "complaints",
                label: "All Complaints",
                icon: ClipboardList,
                badge: complaints.length,
              },
              {
                id: "verification",
                label: "Resolution Verification",
                icon: FileCheck2,
                badge: verificationList.length,
                badgeColor: "bg-amber-100 text-amber-900",
              },
              {
                id: "workforce",
                label: "Field Workforce",
                icon: HardHat,
                badge: employees.length,
              },
              { id: "audit", label: "Audit Trail", icon: History },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? "bg-white/20 text-white"
                          : tab.badgeColor || "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── Main Content Area ───────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-10 h-10 border-4 border-emerald-800 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-600">Loading civic operations data...</p>
          </div>
        ) : (
          <>
            {/* ══════════════════════════════════════════════════════════════════
                TAB 1: OPERATIONS HUB (OVERVIEW)
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Hero Greeting & Status */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          Live Operations Active
                        </span>
                        <span className="text-xs text-slate-300">
                          Shyampet Gram Panchayat
                        </span>
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                        Good day, {adminUser?.name || "Admin"}
                      </h1>
                      <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
                        AI-assisted civic dispatch center. Review incoming reports, assign skilled field teams, and verify completion evidence before marking issues resolved.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 text-center border border-white/10 min-w-[90px]">
                        <p className="text-2xl font-black text-white">{kpis.resolutionRate}%</p>
                        <p className="text-[10px] uppercase font-bold text-slate-300 mt-0.5">
                          Resolved
                        </p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 text-center border border-white/10 min-w-[90px]">
                        <p className="text-2xl font-black text-amber-400">{kpis.awaitingVerify}</p>
                        <p className="text-[10px] uppercase font-bold text-slate-300 mt-0.5">
                          For Audit
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* KPI Metrics Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">Total</span>
                      <ClipboardList className="h-4 w-4" />
                    </div>
                    <p className="text-2xl font-black text-slate-900">{kpis.total}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Logged complaints</p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between text-rose-600 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">Critical</span>
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <p className="text-2xl font-black text-rose-600">{kpis.critical}</p>
                    <p className="text-[11px] text-slate-500 mt-1">High/Emergency SLA</p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between text-amber-600 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">Needs Assignment</span>
                      <Clock className="h-4 w-4" />
                    </div>
                    <p className="text-2xl font-black text-amber-600">{kpis.pendingTriage}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Pending dispatch</p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between text-blue-600 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">On Field</span>
                      <HardHat className="h-4 w-4" />
                    </div>
                    <p className="text-2xl font-black text-blue-600">{kpis.inProgress}</p>
                    <p className="text-[11px] text-slate-500 mt-1">In progress work</p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-2xs">
                    <div className="flex items-center justify-between text-amber-800 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">Verification</span>
                      <FileCheck2 className="h-4 w-4" />
                    </div>
                    <p className="text-2xl font-black text-amber-900">{kpis.awaitingVerify}</p>
                    <p className="text-[11px] text-amber-700 mt-1">Proof uploaded</p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-2xs">
                    <div className="flex items-center justify-between text-emerald-800 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">Resolved</span>
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <p className="text-2xl font-black text-emerald-900">{kpis.resolved}</p>
                    <p className="text-[11px] text-emerald-700 mt-1">Verified & closed</p>
                  </div>
                </div>

                {/* Quick Action Alerts: Awaiting Verification & Urgent Issues */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Pending Verifications */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCheck2 className="h-5 w-5 text-amber-600" />
                        <h2 className="font-extrabold text-slate-900 text-base">
                          Awaiting Resolution Verification
                        </h2>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                        {verificationList.length} Ready
                      </span>
                    </div>

                    {verificationList.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                        <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700">All caught up!</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          No pending field work submissions awaiting administrative audit.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {verificationList.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/30 hover:bg-amber-50/60 transition-all flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-900 truncate">
                                  {item.title}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-200 text-amber-950">
                                  {item.complaint_id_code || item.id}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                                Assigned to: <strong>{item.assigned_employee_name || "Field Team"}</strong> · {item.location}
                              </p>
                            </div>

                            <button
                              onClick={() => setVerifyingComplaint(item)}
                              className="px-3 py-1.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold shrink-0 flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <span>Audit Proof</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: Unassigned / New Complaints */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-indigo-600" />
                        <h2 className="font-extrabold text-slate-900 text-base">
                          AI Triage & Needs Dispatch
                        </h2>
                      </div>
                      <button
                        onClick={() => {
                          setStatusFilter("pending");
                          setActiveTab("complaints");
                        }}
                        className="text-xs font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                      >
                        View All
                      </button>
                    </div>

                    <div className="space-y-3">
                      {complaints
                        .filter((c) => !c.assigned_employee_id && c.status !== "resolved")
                        .slice(0, 3)
                        .map((item) => (
                          <div
                            key={item.id}
                            className="p-3.5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-slate-50 transition-all flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-900 truncate">
                                  {item.title}
                                </span>
                                <span
                                  className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                                    item.priority_tier === "CRITICAL"
                                      ? "bg-rose-100 text-rose-900"
                                      : item.priority_tier === "HIGH"
                                      ? "bg-amber-100 text-amber-900"
                                      : "bg-blue-100 text-blue-900"
                                  }`}
                                >
                                  {item.priority_tier || item.urgency}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                Recommended Dept: <strong>{item.recommended_department || item.category}</strong> · {item.location}
                              </p>
                            </div>

                            <button
                              onClick={() => handleOpenComplaint(item)}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shrink-0 flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <span>Assign</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB 2: ALL COMPLAINTS CENTER
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === "complaints" && (
              <div className="space-y-4">
                {/* Search & Filter Header Bar */}
                <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div className="relative w-full sm:w-80">
                      <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by ID, title, citizen, location..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-slate-900 outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="pending">Needs Assignment</option>
                        <option value="assigned">Assigned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolution_submitted">Awaiting Verification</option>
                        <option value="resolved">Resolved</option>
                      </select>

                      <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
                      >
                        <option value="ALL">All Priorities</option>
                        <option value="CRITICAL">Critical</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                      </select>

                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
                      >
                        <option value="ALL">All Categories</option>
                        <option value="Roads & Transport">Roads</option>
                        <option value="Electricity & Power">Electricity</option>
                        <option value="Water Supply">Water</option>
                        <option value="Sanitation">Sanitation</option>
                        <option value="Health & Safety">Health</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Complaints Table / List */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3.5">ID / Date</th>
                          <th className="px-4 py-3.5">Issue Details</th>
                          <th className="px-4 py-3.5">AI Priority / Score</th>
                          <th className="px-4 py-3.5">Department</th>
                          <th className="px-4 py-3.5">Assigned Employee</th>
                          <th className="px-4 py-3.5">Status</th>
                          <th className="px-4 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredComplaints.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                              No complaints matched your search filters.
                            </td>
                          </tr>
                        ) : (
                          filteredComplaints.map((c) => {
                            const isCritical = c.priority_tier === "CRITICAL" || c.urgency === "High";
                            const isAwaiting = c.status === "resolution_submitted" || c.resolution_image_url;

                            return (
                              <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <p className="font-mono font-bold text-slate-900">
                                    {c.complaint_id_code || c.id.slice(0, 8)}
                                  </p>
                                  <p className="text-[10px] text-slate-400">{c.date || "Today"}</p>
                                </td>

                                <td className="px-4 py-3 max-w-xs">
                                  <div className="flex items-center gap-2.5">
                                    {c.imageUrl && (
                                      <img
                                        src={c.imageUrl}
                                        alt=""
                                        className="h-9 w-9 rounded-lg object-cover border border-slate-200 shrink-0"
                                      />
                                    )}
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-900 truncate">{c.title}</p>
                                      <p className="text-[11px] text-slate-500 truncate">
                                        {c.villager_name} · {c.location}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                        isCritical
                                          ? "bg-rose-100 text-rose-900 border-rose-200"
                                          : c.priority_tier === "HIGH"
                                          ? "bg-amber-100 text-amber-900 border-amber-200"
                                          : "bg-blue-100 text-blue-900 border-blue-200"
                                      }`}
                                    >
                                      {c.priority_tier || c.urgency}
                                    </span>
                                    {c.priority_score !== undefined && (
                                      <span className="text-[11px] font-bold text-slate-600 font-mono">
                                        {c.priority_score}/100
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                                  {c.assigned_department || c.recommended_department || c.category}
                                </td>

                                <td className="px-4 py-3 whitespace-nowrap">
                                  {c.assigned_employee_name ? (
                                    <div className="flex items-center gap-1.5">
                                      <div className="h-5 w-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                                        {c.assigned_employee_name[0]}
                                      </div>
                                      <span className="font-bold text-slate-800">
                                        {c.assigned_employee_name}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                      Unassigned
                                    </span>
                                  )}
                                </td>

                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${
                                      c.status === "resolved"
                                        ? "bg-emerald-100 text-emerald-900"
                                        : isAwaiting
                                        ? "bg-amber-100 text-amber-900 animate-pulse"
                                        : c.status === "in_progress"
                                        ? "bg-blue-100 text-blue-900"
                                        : "bg-slate-100 text-slate-700"
                                    }`}
                                  >
                                    {isAwaiting ? "Awaiting Audit" : c.status.replace("_", " ")}
                                  </span>
                                </td>

                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                  <button
                                    onClick={() => handleOpenComplaint(c)}
                                    className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 text-xs font-bold transition-all cursor-pointer"
                                  >
                                    Manage
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB 3: RESOLUTION VERIFICATION
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === "verification" && (
              <div className="space-y-4">
                <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
                  <h2 className="text-lg font-black text-slate-900">
                    Resolution Verification Center
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Field employees upload on-site evidence photos and progress notes. Compare before/after evidence to approve closure or request rework.
                  </p>
                </div>

                {verificationList.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
                    <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
                    <h3 className="font-extrabold text-slate-900 text-base">No tasks waiting for verification</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Whenever field workers upload completion evidence, they will appear here for supervisor sign-off.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {verificationList.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white rounded-3xl border border-amber-200 shadow-md p-5 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {item.complaint_id_code || item.id}
                            </span>
                            <h3 className="font-black text-slate-900 text-base mt-1">{item.title}</h3>
                            <p className="text-xs text-slate-500">{item.location} · {item.category}</p>
                          </div>
                          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                            Awaiting Sign-off
                          </span>
                        </div>

                        {/* Evidence Comparison Grid */}
                        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                          <div>
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                              Before (Citizen Report)
                            </p>
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt="Before evidence"
                                className="h-32 w-full object-cover rounded-xl border border-slate-200"
                              />
                            ) : (
                              <div className="h-32 rounded-xl bg-slate-200 flex items-center justify-center text-xs text-slate-400 font-bold">
                                No Photo
                              </div>
                            )}
                          </div>

                          <div>
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 mb-1">
                              After (Field Resolution)
                            </p>
                            {item.resolution_image_url ? (
                              <img
                                src={item.resolution_image_url}
                                alt="After evidence"
                                className="h-32 w-full object-cover rounded-xl border border-emerald-300"
                              />
                            ) : (
                              <div className="h-32 rounded-xl bg-amber-100/60 border border-amber-200 flex items-center justify-center text-xs text-amber-800 font-bold p-2 text-center">
                                Pending After Photo
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Field Engineer Notes */}
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                            Engineer Notes & Proof:
                          </p>
                          <p className="text-slate-800 font-medium mt-1">
                            {item.resolution_notes || "Field engineer submitted resolution for verification."}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1">
                            Engineer: <strong>{item.assigned_employee_name || "Field Team"}</strong>
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => {
                              setVerifyingComplaint(item);
                              handleVerify(true);
                            }}
                            className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Check className="h-4 w-4" />
                            <span>Approve & Mark Resolved</span>
                          </button>

                          <button
                            onClick={() => setVerifyingComplaint(item)}
                            className="py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                          >
                            <span>Inspect / Rework</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB 4: FIELD WORKFORCE
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === "workforce" && (
              <div className="space-y-4">
                <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
                  <h2 className="text-lg font-black text-slate-900">
                    Field Workforce & Dispatch Roster
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live availability, skill certifications, current assigned workload and jurisdiction of panchayat personnel.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {employees.map((emp) => (
                    <div
                      key={emp.id}
                      className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-2xl bg-slate-900 text-white font-extrabold text-sm flex items-center justify-center">
                            {emp.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-slate-900 text-sm leading-tight">
                              {emp.name}
                            </h3>
                            <p className="text-xs text-slate-500 font-semibold">{emp.role_title}</p>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                            emp.status === "AVAILABLE"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {emp.status}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Department:</span>
                          <span className="font-bold text-slate-800">{emp.department}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Active Tasks:</span>
                          <span className="font-mono font-bold text-slate-900">
                            {emp.current_tasks_count} tasks
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Jurisdiction:</span>
                          <span className="font-semibold text-slate-700">{emp.jurisdiction}</span>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center gap-2">
                        {emp.phone && (
                          <a
                            href={`tel:${emp.phone}`}
                            className="flex-1 py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            <span>{emp.phone}</span>
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setSearchTerm(emp.name);
                            setActiveTab("complaints");
                          }}
                          className="py-1.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs"
                        >
                          View Tasks
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB 5: AUDIT TRAIL & SYSTEM LOGS
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === "audit" && (
              <div className="space-y-4">
                <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
                  <h2 className="text-lg font-black text-slate-900">
                    Immutable System Audit Trail
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Complete verifiable chronological history of civic submissions, AI classification events, administrative assignments, human overrides, and resolution sign-offs.
                  </p>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
                  {auditLogs.length === 0 ? (
                    <p className="text-xs text-slate-400 py-8 text-center">
                      No audit events logged yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {auditLogs.map((log) => {
                        const eventName = (log.event || log.action || "SYSTEM_EVENT").replace(/_/g, " ");
                        const actorName = log.actor || log.actor_name || log.actor_role || "System";
                        const timeStr = log.timestamp || log.created_at;
                        const noteText = log.notes || (typeof log.details === "string" ? log.details : null);

                        return (
                          <div key={log.id} className="py-3.5 flex items-start gap-3">
                            <div className="h-8 w-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 mt-0.5">
                              <History className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-900">
                                  {eventName}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500">
                                  ID: {log.complaint_id}
                                </span>
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                  Actor: {actorName}
                                </span>
                              </div>
                              {noteText && (
                                <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                  {noteText}
                                </p>
                              )}
                              {timeStr && (
                                <p className="text-[10px] text-slate-400 mt-1 font-mono">
                                  {new Date(timeStr).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── MODAL: AI ASSISTED COMPLAINT ASSIGNMENT DRAWER ──────────────────── */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-scaleUp">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
                    {selectedComplaint.complaint_id_code || selectedComplaint.id}
                  </span>
                  <span
                    className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${
                      selectedComplaint.priority_tier === "CRITICAL"
                        ? "bg-rose-100 text-rose-900 border-rose-200"
                        : "bg-blue-100 text-blue-900 border-blue-200"
                    }`}
                  >
                    {selectedComplaint.priority_tier || selectedComplaint.urgency}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1.5">
                  {selectedComplaint.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Reported by {selectedComplaint.villager_name} · {selectedComplaint.location}
                </p>
              </div>

              <button
                onClick={() => setSelectedComplaint(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Description & Photo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {selectedComplaint.imageUrl && (
                <div className="sm:col-span-1">
                  <img
                    src={selectedComplaint.imageUrl}
                    alt=""
                    className="w-full h-36 object-cover rounded-2xl border border-slate-200"
                  />
                </div>
              )}
              <div className={selectedComplaint.imageUrl ? "sm:col-span-2" : "sm:col-span-3"}>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Citizen Description
                </p>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  {selectedComplaint.description}
                </p>

                {selectedComplaint.explanation_bullets && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase">
                      AI Triage Context:
                    </p>
                    {selectedComplaint.explanation_bullets.map((b, idx) => (
                      <p key={idx} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                        <span>{b}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* AI Employee Recommendation Box */}
            <div className="bg-indigo-50/50 border border-indigo-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-700" />
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-950">
                    AI Employee Recommendations
                  </h4>
                </div>
                <span className="text-[10px] text-indigo-700 font-bold">
                  Matched on Skills, Jurisdiction & Workload
                </span>
              </div>

              {recLoading ? (
                <div className="py-6 text-center text-xs text-indigo-600 flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Evaluating field engineers...</span>
                </div>
              ) : recommendations.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">
                  No automated recommendations generated. Choose from available personnel below.
                </div>
              ) : (
                <div className="space-y-2">
                  {recommendations.slice(0, 3).map((rec) => (
                    <div
                      key={rec.employee.id}
                      className="p-3 bg-white rounded-xl border border-indigo-100 flex items-center justify-between gap-3 shadow-2xs hover:border-indigo-300 transition-all"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {rec.employee.name}
                          </span>
                          <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-indigo-100 text-indigo-900">
                            Match: {Math.round(rec.match_score)}%
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{rec.reason}</p>
                      </div>

                      <button
                        onClick={() => handleAssign(rec.employee.id, rec.employee.name)}
                        disabled={isAssigning}
                        className="px-3 py-1.5 rounded-xl bg-indigo-900 hover:bg-indigo-950 text-white font-bold text-xs shrink-0 flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Assign</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Assignment */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Or Assign Any Field Staff:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => handleAssign(emp.id, emp.name)}
                    disabled={isAssigning}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-400 text-left transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">{emp.name}</p>
                      <p className="text-[10px] text-slate-500">{emp.department} · {emp.current_tasks_count} tasks</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supervisor Instructions / Admin Notes:
                </label>
                <input
                  type="text"
                  value={assigneeNotes}
                  onChange={(e) => setAssigneeNotes(e.target.value)}
                  placeholder="e.g. Bring replacement 4-inch PVC pipe; check junction box"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: RESOLUTION VERIFICATION & REWORK ─────────────────────────── */}
      {verifyingComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">
                Audit Resolution Evidence
              </h3>
              <button
                onClick={() => setVerifyingComplaint(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-900">{verifyingComplaint.title}</p>
              <p className="text-[11px] text-slate-500">
                Location: {verifyingComplaint.location} · Assigned to: {verifyingComplaint.assigned_employee_name}
              </p>
            </div>

            {/* Side-by-side Before / After */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase">Before:</span>
                {verifyingComplaint.imageUrl ? (
                  <img
                    src={verifyingComplaint.imageUrl}
                    alt="Before"
                    className="h-36 w-full object-cover rounded-xl border border-slate-200"
                  />
                ) : (
                  <div className="h-36 bg-slate-100 rounded-xl flex items-center justify-center text-xs text-slate-400">
                    No Before Photo
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-emerald-800 uppercase">After Proof:</span>
                {verifyingComplaint.resolution_image_url ? (
                  <img
                    src={verifyingComplaint.resolution_image_url}
                    alt="After"
                    className="h-36 w-full object-cover rounded-xl border border-emerald-300"
                  />
                ) : (
                  <div className="h-36 bg-amber-50 rounded-xl flex items-center justify-center text-xs text-amber-700 p-2 text-center">
                    No After Photo
                  </div>
                )}
              </div>
            </div>

            {/* Verification feedback note */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Audit Notes / Feedback for Field Team:
              </label>
              <textarea
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Optional comments regarding the quality of repair..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none h-20 resize-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => handleVerify(true)}
                disabled={isSubmittingVerify}
                className="flex-1 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>Approve & Mark Resolved</span>
              </button>

              <button
                onClick={() => handleVerify(false)}
                disabled={isSubmittingVerify}
                className="px-4 py-3 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Request Rework</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
