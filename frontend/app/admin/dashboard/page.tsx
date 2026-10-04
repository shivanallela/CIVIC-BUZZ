"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getSession,
  isAdmin,
  clearSession,
  setAdminSession,
  DEMO_ADMIN,
} from "@/services/demoSession";
import type { DemoAdmin, EmployeeProfile, EmployeeRecommendation } from "@/types";
import { CivicLogo } from "@/components/CivicLogo";
import IndianNationalEmblem from "@/components/IndianNationalEmblem";
import {
  fetchComplaintsApi,
  fetchEmployeesApi,
  fetchEmployeeRecommendationsApi,
  assignComplaintApi,
  verifyResolutionApi,
  updateTaskProgressApi,
  Complaint,
  formatSla,
} from "@/services/complaintsApi";
import {
  Home,
  ClipboardList,
  Activity,
  Users,
  FileCheck2,
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
  RotateCcw,
  HardHat,
  Phone,
  ArrowRight,
  Upload,
  UserPlus,
  ShieldCheck,
  Zap,
  MapPin,
  Calendar,
  Eye,
  Filter,
  Flame,
} from "lucide-react";

// Fallback employees roster in case backend is offline
const DEFAULT_EMPLOYEES: EmployeeProfile[] = [
  {
    id: "EMP-001",
    name: "Ravi Kumar",
    role_title: "Senior Field Engineer",
    department: "Roads & Infrastructure Department",
    jurisdiction: "Shyampet (Wards 1, 2, 3, 4)",
    status: "AVAILABLE",
    current_tasks_count: 2,
    phone: "+91-9876543220",
    email: "ravi.kumar@civic.gov.in",
  },
  {
    id: "EMP-002",
    name: "Suresh Rao",
    role_title: "Pavement & Asphalt Supervisor",
    department: "Roads & Infrastructure Department",
    jurisdiction: "Shyampet (Wards 3, 4, 5)",
    status: "ON_FIELD",
    current_tasks_count: 3,
    phone: "+91-9876543221",
    email: "suresh.rao@civic.gov.in",
  },
  {
    id: "EMP-003",
    name: "Arun Kumar",
    role_title: "Junior Road Maintenance Tech",
    department: "Roads & Infrastructure Department",
    jurisdiction: "Shyampet (Wards 1, 6)",
    status: "AVAILABLE",
    current_tasks_count: 1,
    phone: "+91-9876543222",
    email: "arun.kumar@civic.gov.in",
  },
  {
    id: "EMP-004",
    name: "Priya Sharma",
    role_title: "Pipeline Operations Specialist",
    department: "Water Supply & Sanitation Board",
    jurisdiction: "Shyampet (All Wards)",
    status: "AVAILABLE",
    current_tasks_count: 1,
    phone: "+91-9876543223",
    email: "priya.sharma@civic.gov.in",
  },
  {
    id: "EMP-005",
    name: "Manjunath Reddy",
    role_title: "Senior DISCOM Lineman",
    department: "Electrical & Street Lighting Dept",
    jurisdiction: "Shyampet (All Wards)",
    status: "ON_FIELD",
    current_tasks_count: 2,
    phone: "+91-9876543224",
    email: "manjunath.reddy@civic.gov.in",
  },
  {
    id: "EMP-006",
    name: "Rajesh Varma",
    role_title: "Chief Sanitary Inspector",
    department: "Sanitation & Waste Management",
    jurisdiction: "Shyampet (Wards 1-5)",
    status: "AVAILABLE",
    current_tasks_count: 2,
    phone: "+91-9876543225",
    email: "rajesh.varma@civic.gov.in",
  },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<DemoAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  // 5 Dedicated Tabs Requested by User
  const [activeTab, setActiveTab] = useState<
    "home" | "complaints" | "status" | "employees" | "verification"
  >("home");

  // Core Data
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Assign Modal State
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [recommendations, setRecommendations] = useState<EmployeeRecommendation[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [assigneeNotes, setAssigneeNotes] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Verification Audit Modal State
  const [verifyingComplaint, setVerifyingComplaint] = useState<Complaint | null>(null);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [isSubmittingVerify, setIsSubmittingVerify] = useState(false);

  // Lightbox Preview Modal State
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Direct Image Upload in "Resolved & Verification"
  const [uploadSelectedComplaintId, setUploadSelectedComplaintId] = useState<string>("");
  const [uploadedProofImage, setUploadedProofImage] = useState<string | null>(null);
  const [uploadProofNotes, setUploadProofNotes] = useState<string>("");
  const [isSubmittingProof, setIsSubmittingProof] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const [cData, empData] = await Promise.all([
        fetchComplaintsApi().catch(() => []),
        fetchEmployeesApi().catch(() => []),
      ]);
      setComplaints(cData || []);
      setEmployees(empData && empData.length > 0 ? empData : DEFAULT_EMPLOYEES);
    } catch (err) {
      console.error("Error loading admin dashboard data:", err);
      setEmployees(DEFAULT_EMPLOYEES);
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

  // Open assignment drawer and fetch AI recommendations
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

  // Assign complaint to an employee
  const handleAssign = async (employeeId: string, employeeName?: string) => {
    if (!selectedComplaint) return;
    setIsAssigning(true);
    try {
      await assignComplaintApi(selectedComplaint.id, {
        employee_id: employeeId,
        department: selectedComplaint.recommended_department || selectedComplaint.category,
        admin_notes: assigneeNotes,
        admin_name: adminUser?.name || "Panchayat Secretary",
      });
      setActionSuccessMessage(`Successfully assigned work order to ${employeeName || employeeId}!`);
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
          ? "Resolution approved! Complaint is now officially verified & closed."
          : "Rework requested. Work order returned to field engineer."
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

  // Handle direct file upload for proof in "Resolved & Verification"
  const handleProofImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setUploadedProofImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit resolution image directly and mark complaint resolved
  const handleSubmitResolutionProof = async () => {
    if (!uploadSelectedComplaintId) {
      alert("Please select a complaint to attach resolution proof to.");
      return;
    }
    if (!uploadedProofImage) {
      alert("Please upload an image showing the resolved complaint issue.");
      return;
    }

    setIsSubmittingProof(true);
    try {
      // Update task progress with resolution image
      await updateTaskProgressApi(uploadSelectedComplaintId, {
        employee_id: adminUser?.id || "ADMIN-01",
        status: "resolved",
        notes: uploadProofNotes || "Field resolution photo verified by Gram Panchayat supervisor.",
        resolution_image_url: uploadedProofImage,
      });

      // Verify and mark resolved
      await verifyResolutionApi(uploadSelectedComplaintId, {
        approved: true,
        admin_notes: uploadProofNotes || "Direct photographic proof verified by Panchayat Administrator.",
        admin_name: adminUser?.name || "Panchayat Secretary",
      });

      setActionSuccessMessage("Proof photo uploaded and issue officially marked RESOLVED!");
      setTimeout(() => setActionSuccessMessage(null), 4000);

      // Reset upload form
      setUploadSelectedComplaintId("");
      setUploadedProofImage(null);
      setUploadProofNotes("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      await loadAllData();
    } catch (err: any) {
      alert(`Failed to save proof: ${err.message}`);
    } finally {
      setIsSubmittingProof(false);
    }
  };

  // Computed data calculations
  const assignedComplaints = useMemo(() => {
    return complaints.filter((c) => Boolean(c.assigned_employee_id) || c.status === "in_progress" || c.status === "assigned" || c.status === "resolution_submitted");
  }, [complaints]);

  const verificationList = useMemo(() => {
    return complaints.filter(
      (c) =>
        c.status === "resolution_submitted" ||
        (c.resolution_image_url && c.status !== "resolved")
    );
  }, [complaints]);

  const resolvedComplaints = useMemo(() => {
    return complaints.filter((c) => c.status === "resolved");
  }, [complaints]);

  // Filtered complaints for "All Complaints"
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const s = searchTerm.toLowerCase();
      const matchesSearch =
        !s ||
        (c.title || "").toLowerCase().includes(s) ||
        (c.description || "").toLowerCase().includes(s) ||
        (c.complaint_id_code || c.id || "").toLowerCase().includes(s) ||
        (c.villager_name || "").toLowerCase().includes(s) ||
        (c.location || "").toLowerCase().includes(s) ||
        (c.category || "").toLowerCase().includes(s);

      if (!matchesSearch) return false;

      if (statusFilter !== "ALL") {
        if (statusFilter === "unassigned" && (c.assigned_employee_id || c.status === "resolved")) return false;
        if (statusFilter === "assigned" && !c.assigned_employee_id) return false;
        if (statusFilter === "in_progress" && c.status !== "in_progress") return false;
        if (statusFilter === "resolved" && c.status !== "resolved") return false;
      }

      if (priorityFilter !== "ALL") {
        const tier = (c.priority_tier || c.urgency || "").toUpperCase();
        if (tier !== priorityFilter.toUpperCase()) return false;
      }

      if (categoryFilter !== "ALL") {
        if (!(c.category || "").toLowerCase().includes(categoryFilter.toLowerCase())) return false;
      }

      return true;
    });
  }, [complaints, searchTerm, statusFilter, priorityFilter, categoryFilter]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Background Indian National Emblem Watermark */}
      <IndianNationalEmblem opacity={0.03} className="emblem-watermark pointer-events-none fixed inset-0 m-auto" />

      {/* ── TOPBAR NAVIGATION BAR ────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo & Name */}
          <div
            className="flex items-center gap-3 cursor-pointer shrink-0"
            onClick={() => setActiveTab("home")}
            title="Civic Buzz Admin Command"
          >
            <CivicLogo size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 text-sm sm:text-base tracking-tight">
                  Civic Buzz
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                  Admin Command
                </span>
              </div>
              <div className="text-[10px] text-slate-500 hidden sm:block">
                Panchayat Operations & Field Dispatch Center
              </div>
            </div>
          </div>

          {/* Top Horizontal Navigation Links (5 Dedicated Tabs) */}
          <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {/* 1. Home */}
            <button
              onClick={() => setActiveTab("home")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "home"
                  ? "bg-emerald-800 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Home size={15} />
              <span>Home</span>
            </button>

            {/* 2. All Complaints */}
            <button
              onClick={() => setActiveTab("complaints")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "complaints"
                  ? "bg-emerald-800 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <ClipboardList size={15} />
              <span>All Complaints</span>
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                  activeTab === "complaints"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {complaints.length}
              </span>
            </button>

            {/* 3. Status */}
            <button
              onClick={() => setActiveTab("status")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "status"
                  ? "bg-emerald-800 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Activity size={15} />
              <span>Status</span>
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                  activeTab === "status"
                    ? "bg-white/20 text-white"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {assignedComplaints.length}
              </span>
            </button>

            {/* 4. Employees */}
            <button
              onClick={() => setActiveTab("employees")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "employees"
                  ? "bg-emerald-800 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Users size={15} />
              <span>Employees</span>
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                  activeTab === "employees"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {employees.length}
              </span>
            </button>

            {/* 5. Resolved & Verification */}
            <button
              onClick={() => setActiveTab("verification")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "verification"
                  ? "bg-emerald-800 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <FileCheck2 size={15} />
              <span>Resolved & Verification</span>
              {verificationList.length > 0 && (
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-950">
                  {verificationList.length}
                </span>
              )}
            </button>
          </nav>

          {/* Right: Refresh, Admin Profile & Logout */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-all cursor-pointer"
              title="Refresh live complaints feed"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-emerald-700" : ""}`} />
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="h-9 w-9 rounded-xl bg-emerald-900 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                {adminUser?.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("") || "AD"}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {adminUser?.name || "Rajesh Sharma"}
                </p>
                <p className="text-[10px] text-emerald-800 font-semibold">
                  {adminUser?.jurisdiction || "Shyampet Gram Panchayat"}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-600 transition-all cursor-pointer"
              title="Sign Out from Civic Buzz"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Action Success Alert ──────────────────────────────────────── */}
      {actionSuccessMessage && (
        <div className="bg-emerald-700 text-white px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* ── MAIN WORKSPACE ────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-3">
            <div className="w-10 h-10 border-4 border-emerald-800 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-600">Loading Civic Buzz Command data...</p>
          </div>
        ) : (
          <>
            {/* ══════════════════════════════════════════════════════════════════
                TAB 1: HOME (Welcome Message & About This Application Only)
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === "home" && (
              <div className="space-y-6 animate-fadeIn">
                {/* 1. Welcome Card */}
                <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Panchayat Admin Command &middot; Shyampet
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live Governance Active
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Welcome, {adminUser?.name || "Rajesh Sharma"}!
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                    Panchayat Secretary & Operations Dispatcher &middot; Shyampet Gram Panchayat (Wards 1–6).
                  </p>
                </div>

                {/* 2. About This Application Hero Presentation */}
                <div className="bg-gradient-to-br from-emerald-950 via-[#042d20] to-emerald-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-800/40 relative overflow-hidden">
                  <div className="relative z-10 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs font-extrabold">
                      <Sparkles size={14} className="text-emerald-300" />
                      <span>About Civic Buzz Platform</span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white max-w-2xl">
                      Empowering Transparent Rural Administration & Instant Field Dispatch.
                    </h2>

                    <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed max-w-3xl">
                      Civic Buzz is an AI-assisted rural and civic intelligence governance system bridging citizens, Gram Panchayat administrators, and field technician units. Designed for maximum transparency, speed, and accountability across rural and municipal jurisdictions.
                    </p>

                    {/* 4 Pillars of the Application */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                      {/* Pillar 1 */}
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-2">
                        <div className="w-9 h-9 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center font-black">
                          <Flame size={18} />
                        </div>
                        <h3 className="font-black text-white text-sm">1. AI Vision Triage</h3>
                        <p className="text-emerald-100/80 text-xs leading-relaxed">
                          Groq AI vision analyzes citizen photos, calculates deterministic 0-100 priority scores, and enforces 30-minute rapid emergency SLAs for life hazards.
                        </p>
                      </div>

                      {/* Pillar 2 */}
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-2">
                        <div className="w-9 h-9 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center font-black">
                          <UserPlus size={18} />
                        </div>
                        <h3 className="font-black text-white text-sm">2. Smart Dispatch</h3>
                        <p className="text-emerald-100/80 text-xs leading-relaxed">
                          Skill and jurisdiction-based assignment of certified village linemen, plumbers, and road engineers with live workload tracking.
                        </p>
                      </div>

                      {/* Pillar 3 */}
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-2">
                        <div className="w-9 h-9 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center font-black">
                          <Activity size={18} />
                        </div>
                        <h3 className="font-black text-white text-sm">3. Status Tracking</h3>
                        <p className="text-emerald-100/80 text-xs leading-relaxed">
                          Real-time 5-stage progress monitoring from submission, technician arrival on site, repair execution, to final administrative sign-off.
                        </p>
                      </div>

                      {/* Pillar 4 */}
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-2">
                        <div className="w-9 h-9 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center font-black">
                          <ShieldCheck size={18} />
                        </div>
                        <h3 className="font-black text-white text-sm">4. Photo Verification</h3>
                        <p className="text-emerald-100/80 text-xs leading-relaxed">
                          Mandatory photographic before-and-after proof audit. Field work must be validated by photo proof before marking issues officially resolved.
                        </p>
                      </div>
                    </div>

                    {/* Quick Navigation Jump Buttons */}
                    <div className="pt-4 flex items-center gap-3 flex-wrap">
                      <button
                        onClick={() => setActiveTab("complaints")}
                        className="px-4 py-2.5 rounded-xl bg-white text-emerald-950 font-black text-xs hover:bg-emerald-50 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <ClipboardList size={14} />
                        <span>All Complaints ({complaints.length})</span>
                      </button>

                      <button
                        onClick={() => setActiveTab("status")}
                        className="px-4 py-2.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-800 text-white font-bold text-xs transition-all flex items-center gap-1.5 border border-emerald-700/60 cursor-pointer"
                      >
                        <Activity size={14} />
                        <span>Work Status ({assignedComplaints.length})</span>
                      </button>

                      <button
                        onClick={() => setActiveTab("employees")}
                        className="px-4 py-2.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-800 text-white font-bold text-xs transition-all flex items-center gap-1.5 border border-emerald-700/60 cursor-pointer"
                      >
                        <Users size={14} />
                        <span>Field Employees ({employees.length})</span>
                      </button>

                      <button
                        onClick={() => setActiveTab("verification")}
                        className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <FileCheck2 size={14} />
                        <span>Resolved & Verification</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB 2: ALL COMPLAINTS (Citizen Complaints with Assign Button)
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === "complaints" && (
              <div className="space-y-5 animate-fadeIn">
                {/* Header & Filter Controls */}
                <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black text-slate-900">
                        All Citizen Complaints ({complaints.length})
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Incoming reports logged by citizens. Review details, AI severity scoring, and assign field personnel.
                      </p>
                    </div>

                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
                      {complaints.filter((c) => !c.assigned_employee_id && c.status !== "resolved").length} Pending Assignment
                    </span>
                  </div>

                  {/* Search and Filters Bar */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2 border-t border-slate-100">
                    <div className="relative w-full sm:w-80">
                      <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by ID, title, citizen, location..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-700 outline-none bg-slate-50 focus:bg-white"
                      />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="unassigned">Needs Assignment</option>
                        <option value="assigned">Assigned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>

                      <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
                      >
                        <option value="ALL">All Priorities</option>
                        <option value="CRITICAL">Critical Priority</option>
                        <option value="HIGH">High Priority</option>
                        <option value="MEDIUM">Medium Priority</option>
                        <option value="LOW">Low Priority</option>
                      </select>

                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
                      >
                        <option value="ALL">All Categories</option>
                        <option value="Roads">Roads & Transport</option>
                        <option value="Electricity">Electricity & Power</option>
                        <option value="Water">Water Supply</option>
                        <option value="Sanitation">Sanitation</option>
                        <option value="Health">Health & Safety</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Complaints List Cards */}
                {filteredComplaints.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
                    <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <h3 className="font-extrabold text-slate-800 text-base">No complaints match your filters</h3>
                    <p className="text-xs text-slate-400 mt-1">Try resetting search keywords or category filters.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {filteredComplaints.map((c) => {
                      const isCritical = c.priority_tier === "CRITICAL" || c.urgency === "High";
                      const isAssigned = Boolean(c.assigned_employee_id);
                      const isAwaitingAudit = c.status === "resolution_submitted" || Boolean(c.resolution_image_url && c.status !== "resolved");

                      return (
                        <div
                          key={c.id}
                          className="bg-white rounded-3xl border border-slate-200 hover:border-emerald-300 p-5 shadow-xs hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                        >
                          {/* Left: Thumbnail & Details */}
                          <div className="flex items-start gap-4 min-w-0 flex-1">
                            {/* Evidence Photo */}
                            {c.imageUrl ? (
                              <div
                                onClick={() => setPreviewImageUrl(c.imageUrl || null)}
                                className="relative h-20 w-20 rounded-2xl overflow-hidden border border-slate-200 shrink-0 cursor-pointer group"
                                title="Click to enlarge citizen photo"
                              >
                                <img
                                  src={c.imageUrl}
                                  alt="Citizen report"
                                  className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye size={16} />
                                </div>
                              </div>
                            ) : (
                              <div className="h-20 w-20 rounded-2xl bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-slate-400 text-xs font-bold text-center p-2">
                                No Photo
                              </div>
                            )}

                            {/* Complaint Information */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                                  {c.complaint_id_code || c.id}
                                </span>

                                <span
                                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                    isCritical
                                      ? "bg-rose-50 text-rose-800 border-rose-200"
                                      : c.priority_tier === "HIGH"
                                      ? "bg-amber-50 text-amber-800 border-amber-200"
                                      : "bg-blue-50 text-blue-800 border-blue-200"
                                  }`}
                                >
                                  {c.priority_tier || c.urgency} ({c.priority_score || 50}/100)
                                </span>

                                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                  {c.category}
                                </span>

                                <span className="text-[11px] text-slate-400">
                                  {c.date || "Today"}
                                </span>
                              </div>

                              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug">
                                {c.title}
                              </h3>

                              <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                                {c.description}
                              </p>

                              <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <MapPin size={12} className="text-slate-400" />
                                  <strong className="text-slate-700">{c.location}</strong>
                                </span>
                                <span>&middot;</span>
                                <span>
                                  Citizen: <strong className="text-slate-700">{c.villager_name}</strong>
                                </span>
                                <span>&middot;</span>
                                <span className="text-emerald-800 font-semibold">
                                  SLA: {formatSla(c.recommended_sla_hours)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: ASSIGN BUTTON by side of complaint */}
                          <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between lg:justify-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                            {/* Current Status Pill */}
                            <div>
                              <span
                                className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full capitalize inline-flex items-center gap-1.5 ${
                                  c.status === "resolved"
                                    ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                    : isAwaitingAudit
                                    ? "bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
                                    : isAssigned
                                    ? "bg-blue-100 text-blue-900 border border-blue-200"
                                    : "bg-slate-100 text-slate-700 border border-slate-300"
                                }`}
                              >
                                {c.status === "resolved" ? (
                                  <>
                                    <CheckCircle2 size={12} />
                                    <span>Resolved</span>
                                  </>
                                ) : isAwaitingAudit ? (
                                  <>
                                    <FileCheck2 size={12} />
                                    <span>Awaiting Audit</span>
                                  </>
                                ) : isAssigned ? (
                                  <>
                                    <HardHat size={12} />
                                    <span>Assigned</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock size={12} />
                                    <span>Needs Assignment</span>
                                  </>
                                )}
                              </span>
                            </div>

                            {/* Assigned Employee Info if assigned */}
                            {isAssigned && (
                              <p className="text-[11px] text-slate-500">
                                Assigned to: <strong className="text-slate-900">{c.assigned_employee_name}</strong>
                              </p>
                            )}

                            {/* ASSIGN / REASSIGN ACTION BUTTON */}
                            {c.status !== "resolved" && (
                              <button
                                onClick={() => handleOpenComplaint(c)}
                                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                                  !isAssigned
                                    ? "bg-emerald-800 hover:bg-emerald-900 text-white shadow-emerald-900/10"
                                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                                }`}
                              >
                                {isAssigned ? (
                                  <>
                                    <RotateCcw size={13} />
                                    <span>Reassign Staff</span>
                                  </>
                                ) : (
                                  <>
                                    <UserPlus size={14} />
                                    <span>Assign Employee</span>
                                  </>
                                )}
                              </button>
                            )}

                            {c.status === "resolved" && (
                              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 flex items-center gap-1">
                                <Check size={13} />
                                <span>Closed & Verified</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB 3: STATUS (Assigned Complaints & Live Status)
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === "status" && (
              <div className="space-y-5 animate-fadeIn">
                {/* Header & Status Summary Counters */}
                <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black text-slate-900">
                        Assigned Complaints & Live Status
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Track which field technician is assigned to each civic work order and observe real-time status.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                        {assignedComplaints.length} Total Dispatches
                      </span>
                    </div>
                  </div>

                  {/* Quick Status KPI Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                      <p className="text-[10px] font-bold uppercase text-slate-500">Total Assigned</p>
                      <p className="text-xl font-black text-slate-900 mt-0.5">{assignedComplaints.length}</p>
                    </div>

                    <div className="bg-blue-50/60 p-3 rounded-2xl border border-blue-200">
                      <p className="text-[10px] font-bold uppercase text-blue-800">In Progress</p>
                      <p className="text-xl font-black text-blue-900 mt-0.5">
                        {assignedComplaints.filter((c) => c.status === "in_progress").length}
                      </p>
                    </div>

                    <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-200">
                      <p className="text-[10px] font-bold uppercase text-amber-800">Proof Submitted</p>
                      <p className="text-xl font-black text-amber-900 mt-0.5">
                        {verificationList.length}
                      </p>
                    </div>

                    <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200">
                      <p className="text-[10px] font-bold uppercase text-emerald-800">Verified Closed</p>
                      <p className="text-xl font-black text-emerald-900 mt-0.5">
                        {resolvedComplaints.length}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Assigned Complaints Grid */}
                {assignedComplaints.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
                    <Activity className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <h3 className="font-extrabold text-slate-800 text-base">No complaints currently assigned</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Go to the &quot;All Complaints&quot; tab to assign incoming reports to field employees.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {assignedComplaints.map((item) => {
                      const emp = employees.find((e) => e.id === item.assigned_employee_id);
                      const isReadyAudit = item.status === "resolution_submitted" || Boolean(item.resolution_image_url && item.status !== "resolved");

                      return (
                        <div
                          key={item.id}
                          className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between space-y-4"
                        >
                          <div>
                            {/* Card Header: ID & Status */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-black text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full">
                                {item.complaint_id_code || item.id}
                              </span>

                              <span
                                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border ${
                                  item.status === "resolved"
                                    ? "bg-emerald-100 text-emerald-900 border-emerald-200"
                                    : isReadyAudit
                                    ? "bg-amber-100 text-amber-900 border-amber-300 animate-pulse"
                                    : "bg-blue-100 text-blue-900 border-blue-200"
                                }`}
                              >
                                {item.status === "resolved" ? "Resolved" : isReadyAudit ? "Resolution Submitted" : "In Progress"}
                              </span>
                            </div>

                            {/* Complaint Title & Location */}
                            <h3 className="font-extrabold text-slate-900 text-base mt-2">
                              {item.title}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {item.location} &middot; Citizen: <strong>{item.villager_name}</strong>
                            </p>

                            {/* Assigned Employee Box */}
                            <div className="mt-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                  Assigned Field Technician:
                                </span>
                                {emp?.status && (
                                  <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                                    {emp.status}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                                    {(item.assigned_employee_name || "E")[0]}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900 text-xs leading-tight">
                                      {item.assigned_employee_name || "Field Engineer"}
                                    </p>
                                    <p className="text-[10px] text-slate-500">
                                      {item.assigned_department || emp?.department || "Civic Works"}
                                    </p>
                                  </div>
                                </div>

                                {emp?.phone && (
                                  <a
                                    href={`tel:${emp.phone}`}
                                    className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs font-bold flex items-center gap-1 transition-all"
                                    title="Call Technician"
                                  >
                                    <Phone size={13} />
                                    <span className="hidden sm:inline">Call</span>
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Work Notes / Details */}
                            {item.admin_notes && (
                              <p className="text-[11px] text-slate-600 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 mt-2">
                                <strong>Instructions:</strong> {item.admin_notes}
                              </p>
                            )}

                            {item.resolution_notes && (
                              <p className="text-[11px] text-amber-900 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 mt-2">
                                <strong>Technician Notes:</strong> {item.resolution_notes}
                              </p>
                            )}
                          </div>

                          {/* Bottom Card Actions */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-slate-500">
                              SLA: {formatSla(item.recommended_sla_hours)}
                            </span>

                            <div className="flex items-center gap-2">
                              {isReadyAudit && (
                                <button
                                  onClick={() => setVerifyingComplaint(item)}
                                  className="px-3 py-1.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                                >
                                  <FileCheck2 size={13} />
                                  <span>Audit Proof</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenComplaint(item)}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                              >
                                <RotateCcw size={12} />
                                <span>Reassign</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB 4: EMPLOYEES (Field Workforce Data & Work Assigned)
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === "employees" && (
              <div className="space-y-5 animate-fadeIn">
                {/* Header */}
                <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black text-slate-900">
                        Field Employees & Workforce Roster
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Technician profiles, live availability, jurisdiction city/wards, and amount of work currently assigned.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                        {employees.filter((e) => e.status === "AVAILABLE").length} Available for Dispatch
                      </span>
                    </div>
                  </div>

                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Total Workforce</p>
                      <p className="text-xl font-black text-slate-900">{employees.length} Technicians</p>
                    </div>

                    <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
                      <p className="text-[10px] font-bold uppercase text-emerald-800">Available</p>
                      <p className="text-xl font-black text-emerald-900">
                        {employees.filter((e) => e.status === "AVAILABLE").length}
                      </p>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-2xl border border-blue-200">
                      <p className="text-[10px] font-bold uppercase text-blue-800">On Field</p>
                      <p className="text-xl font-black text-blue-900">
                        {employees.filter((e) => e.status === "ON_FIELD").length}
                      </p>
                    </div>

                    <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200">
                      <p className="text-[10px] font-bold uppercase text-amber-800">Active Workloads</p>
                      <p className="text-xl font-black text-amber-900">
                        {assignedComplaints.length} Work Orders
                      </p>
                    </div>
                  </div>
                </div>

                {/* Employees Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {employees.map((emp) => {
                    // Count how many complaints are actively assigned to this specific employee
                    const empComplaints = complaints.filter(
                      (c) =>
                        c.assigned_employee_id === emp.id ||
                        c.assigned_employee_name?.toLowerCase() === emp.name.toLowerCase()
                    );
                    const activeCount = empComplaints.filter((c) => c.status !== "resolved").length;

                    // Workload capacity bar calculation (max 5 capacity)
                    const capacityPercent = Math.min(100, Math.round((activeCount / 5) * 100));

                    return (
                      <div
                        key={emp.id}
                        className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          {/* Header: Name, Avatar, Status */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-2xl bg-emerald-900 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                                {emp.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </div>
                              <div>
                                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                                  {emp.name}
                                </h3>
                                <p className="text-xs text-slate-500 font-semibold mt-0.5">{emp.role_title}</p>
                              </div>
                            </div>

                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${
                                emp.status === "AVAILABLE"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : "bg-blue-50 text-blue-800 border-blue-200"
                              }`}
                            >
                              {emp.status}
                            </span>
                          </div>

                          {/* Details: City/Jurisdiction & Department */}
                          <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 font-semibold">City / Jurisdiction:</span>
                              <span className="font-bold text-slate-800 flex items-center gap-1">
                                <MapPin size={12} className="text-emerald-700" />
                                <span>{emp.jurisdiction || "Shyampet Wards 1-4"}</span>
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 font-semibold">Department:</span>
                              <span className="font-bold text-slate-800">{emp.department}</span>
                            </div>
                          </div>

                          {/* Work Assigned Meter */}
                          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700">Work Assigned:</span>
                              <span className="font-mono font-black text-emerald-900">
                                {activeCount} Active {activeCount === 1 ? "Task" : "Tasks"}
                              </span>
                            </div>

                            {/* Capacity Progress Bar */}
                            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  capacityPercent >= 80
                                    ? "bg-rose-500"
                                    : capacityPercent >= 50
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                                style={{ width: `${capacityPercent}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>Workload Capacity</span>
                              <span>{capacityPercent}%</span>
                            </div>
                          </div>

                          {/* Active Complaints Assigned to this Employee */}
                          {empComplaints.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                Assigned Tasks:
                              </p>
                              <div className="space-y-1">
                                {empComplaints.slice(0, 2).map((item) => (
                                  <div
                                    key={item.id}
                                    className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-2"
                                  >
                                    <span className="font-bold text-slate-800 truncate">{item.title}</span>
                                    <span className="text-[9px] font-mono text-slate-500 shrink-0">
                                      {item.complaint_id_code || item.id}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Card Actions: Call & View in Status */}
                        <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                          {emp.phone && (
                            <a
                              href={`tel:${emp.phone}`}
                              className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                            >
                              <Phone size={13} />
                              <span>{emp.phone}</span>
                            </a>
                          )}

                          <button
                            onClick={() => {
                              setSearchTerm(emp.name);
                              setActiveTab("status");
                            }}
                            className="py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                            title="Filter tasks in status"
                          >
                            View Work
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB 5: RESOLVED & VERIFICATION (Upload Image of Resolution Proof)
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === "verification" && (
              <div className="space-y-6 animate-fadeIn">
                {/* Header */}
                <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-2">
                  <h2 className="text-lg font-black text-slate-900">
                    Resolution & Proof Verification Center
                  </h2>
                  <p className="text-xs text-slate-500">
                    Supervisors and engineers must upload photographic evidence showing the resolved issue before complaints can be officially closed.
                  </p>
                </div>

                {/* 1. Direct Proof Image Uploader Box */}
                <div className="bg-white rounded-3xl border-2 border-dashed border-emerald-300 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                      <Upload size={16} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-base">
                        Upload Resolution Proof Image
                      </h3>
                      <p className="text-xs text-slate-500">
                        Select a complaint, upload the photograph of the resolved site, and officially mark it resolved.
                      </p>
                    </div>
                  </div>

                  {/* Complaint Selector */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Select Complaint to Verify:
                      </label>
                      <select
                        value={uploadSelectedComplaintId}
                        onChange={(e) => setUploadSelectedComplaintId(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-emerald-700 outline-none"
                      >
                        <option value="">-- Choose a Complaint --</option>
                        {complaints
                          .filter((c) => c.status !== "resolved")
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              [{c.complaint_id_code || c.id}] {c.title} ({c.location})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Resolution & Audit Notes:
                      </label>
                      <input
                        type="text"
                        value={uploadProofNotes}
                        onChange={(e) => setUploadProofNotes(e.target.value)}
                        placeholder="e.g. Pavement patching completed, road leveled and safe for traffic."
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-700 outline-none"
                      />
                    </div>
                  </div>

                  {/* File Upload Zone */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProofImageFile}
                      className="hidden"
                      id="proof-upload-input"
                    />

                    <label
                      htmlFor="proof-upload-input"
                      className="w-full sm:w-auto px-4 py-3 rounded-xl border border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Upload size={15} />
                      <span>{uploadedProofImage ? "Change Image" : "Choose Resolution Photo"}</span>
                    </label>

                    {uploadedProofImage && (
                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-14 rounded-xl overflow-hidden border border-emerald-300">
                          <img
                            src={uploadedProofImage}
                            alt="Resolution preview"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <span className="text-xs font-bold text-emerald-800">
                          ✓ Image ready for upload
                        </span>
                      </div>
                    )}

                    <div className="sm:ml-auto w-full sm:w-auto">
                      <button
                        onClick={handleSubmitResolutionProof}
                        disabled={isSubmittingProof || !uploadSelectedComplaintId || !uploadedProofImage}
                        className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                      >
                        <CheckCircle2 size={16} />
                        <span>{isSubmittingProof ? "Saving Proof..." : "Submit Proof & Mark Resolved"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Complaints Awaiting Verification (Field Submissions) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="h-5 w-5 text-amber-600" />
                      <h3 className="font-extrabold text-slate-900 text-base">
                        Field Engineer Submissions Awaiting Audit ({verificationList.length})
                      </h3>
                    </div>
                  </div>

                  {verificationList.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
                      <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">All submissions verified!</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        No pending field work submissions awaiting supervisor sign-off right now.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                              <h4 className="font-black text-slate-900 text-base mt-1">{item.title}</h4>
                              <p className="text-xs text-slate-500">{item.location} &middot; {item.category}</p>
                            </div>
                            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              Awaiting Sign-off
                            </span>
                          </div>

                          {/* Side-by-side Before / After Photo Comparison */}
                          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                            <div>
                              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                                Before (Citizen Report)
                              </p>
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt="Before evidence"
                                  onClick={() => setPreviewImageUrl(item.imageUrl || null)}
                                  className="h-32 w-full object-cover rounded-xl border border-slate-200 cursor-pointer"
                                  title="Click to enlarge"
                                />
                              ) : (
                                <div className="h-32 rounded-xl bg-slate-200 flex items-center justify-center text-xs text-slate-400 font-bold">
                                  No Photo
                                </div>
                              )}
                            </div>

                            <div>
                              <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 mb-1">
                                After (Resolution Proof)
                              </p>
                              {item.resolution_image_url ? (
                                <img
                                  src={item.resolution_image_url}
                                  alt="After evidence"
                                  onClick={() => setPreviewImageUrl(item.resolution_image_url || null)}
                                  className="h-32 w-full object-cover rounded-xl border border-emerald-300 cursor-pointer"
                                  title="Click to enlarge"
                                />
                              ) : (
                                <div className="h-32 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-xs text-amber-800 font-bold p-2 text-center">
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

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => {
                                setVerifyingComplaint(item);
                                handleVerify(true);
                              }}
                              className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-extrabold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
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

                {/* 3. Verified Resolution Archive */}
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Verified Resolution Archive ({resolvedComplaints.length} Closed)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {resolvedComplaints.slice(0, 6).map((c) => (
                      <div
                        key={c.id}
                        className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            {c.complaint_id_code || c.id}
                          </span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 flex items-center gap-1">
                            <Check size={11} />
                            Verified Closed
                          </span>
                        </div>

                        <h4 className="font-bold text-slate-900 text-sm truncate">{c.title}</h4>
                        <p className="text-xs text-slate-500">{c.location} &middot; {c.category}</p>

                        {/* Before / After Thumbnail Comparison */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 block mb-0.5">BEFORE:</span>
                            {c.imageUrl ? (
                              <img
                                src={c.imageUrl}
                                alt="Before"
                                onClick={() => setPreviewImageUrl(c.imageUrl || null)}
                                className="h-20 w-full object-cover rounded-xl border border-slate-200 cursor-pointer"
                              />
                            ) : (
                              <div className="h-20 bg-slate-100 rounded-xl flex items-center justify-center text-[10px] text-slate-400">
                                No Photo
                              </div>
                            )}
                          </div>

                          <div>
                            <span className="text-[9px] font-bold text-emerald-700 block mb-0.5">AFTER:</span>
                            {c.resolution_image_url ? (
                              <img
                                src={c.resolution_image_url}
                                alt="After"
                                onClick={() => setPreviewImageUrl(c.resolution_image_url || null)}
                                className="h-20 w-full object-cover rounded-xl border border-emerald-300 cursor-pointer"
                              />
                            ) : (
                              <div className="h-20 bg-emerald-50 rounded-xl flex items-center justify-center text-[10px] text-emerald-700">
                                Verified
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── MODAL: ASSIGN COMPLAINT TO EMPLOYEE ───────────────────────── */}
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
                  Reported by {selectedComplaint.villager_name} &middot; {selectedComplaint.location}
                </p>
              </div>

              <button
                onClick={() => setSelectedComplaint(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Complaint Summary & Image */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {selectedComplaint.imageUrl && (
                <div className="sm:col-span-1">
                  <img
                    src={selectedComplaint.imageUrl}
                    alt="Citizen photo"
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
              </div>
            </div>

            {/* AI Employee Recommendations Box */}
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-800" />
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-950">
                    AI Employee Recommendations
                  </h4>
                </div>
                <span className="text-[10px] text-emerald-800 font-bold">
                  Matched on Skills, Jurisdiction & Workload
                </span>
              </div>

              {recLoading ? (
                <div className="py-6 text-center text-xs text-emerald-700 flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Evaluating field engineers...</span>
                </div>
              ) : recommendations.length === 0 ? (
                <div className="py-2 text-center text-xs text-slate-500">
                  No automated recommendations generated. Choose from available personnel below.
                </div>
              ) : (
                <div className="space-y-2">
                  {recommendations.slice(0, 3).map((rec) => (
                    <div
                      key={rec.employee.id}
                      className="p-3 bg-white rounded-xl border border-emerald-100 flex items-center justify-between gap-3 shadow-2xs hover:border-emerald-300 transition-all"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {rec.employee.name}
                          </span>
                          <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-900">
                            Match: {Math.round(rec.match_score)}%
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{rec.reason}</p>
                      </div>

                      <button
                        onClick={() => handleAssign(rec.employee.id, rec.employee.name)}
                        disabled={isAssigning}
                        className="px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shrink-0 flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Assign</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Select Any Employee from Roster */}
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
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50/50 hover:border-emerald-400 text-left transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">{emp.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {emp.department} &middot; {emp.jurisdiction}
                      </p>
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
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-700 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: RESOLUTION VERIFICATION & REWORK ───────────────────── */}
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

            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-900">{verifyingComplaint.title}</p>
              <p className="text-[11px] text-slate-500">
                Location: {verifyingComplaint.location} &middot; Assigned to: {verifyingComplaint.assigned_employee_name}
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
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-700 outline-none h-20 resize-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => handleVerify(true)}
                disabled={isSubmittingVerify}
                className="flex-1 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
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

      {/* ── LIGHTBOX IMAGE PREVIEW MODAL ─────────────────────────────── */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] p-2 bg-white rounded-3xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 cursor-pointer"
            >
              <X size={18} />
            </button>
            <img
              src={previewImageUrl}
              alt="Enlarged Evidence"
              className="max-h-[80vh] w-auto rounded-2xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
