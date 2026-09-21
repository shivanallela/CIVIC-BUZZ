"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  getSession,
  isEmployee,
  clearSession,
  setEmployeeSession,
  DEMO_EMPLOYEE,
} from "@/services/demoSession";
import type { DemoEmployee } from "@/types";
import { CivicLogo } from "@/components/CivicLogo";
import IndianNationalEmblem from "@/components/IndianNationalEmblem";
import {
  fetchEmployeeTasksApi,
  fetchComplaintsApi,
  updateTaskProgressApi,
  Complaint,
} from "@/services/complaintsApi";
import {
  HardHat,
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  RefreshCw,
  LogOut,
  ArrowRight,
  Camera,
  UploadCloud,
  Check,
  X,
  Play,
  FileCheck2,
  Calendar,
  Send,
  Sparkles,
  Phone,
  Building2,
  Navigation,
} from "lucide-react";

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const [employeeUser, setEmployeeUser] = useState<DemoEmployee | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Tasks state
  const [tasks, setTasks] = useState<Complaint[]>([]);
  const [selectedTask, setSelectedTask] = useState<Complaint | null>(null);

  // Execution & Resolution state
  const [progressNotes, setProgressNotes] = useState("");
  const [resolutionImageUrl, setResolutionImageUrl] = useState("");
  const [resolutionImagePreview, setResolutionImagePreview] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      setEmployeeSession();
      setEmployeeUser(DEMO_EMPLOYEE);
    } else if (isEmployee(s)) {
      setEmployeeUser(s);
    } else {
      setEmployeeSession();
      setEmployeeUser(DEMO_EMPLOYEE);
    }
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const empId = employeeUser?.id || "EMP-001";
      let empTasks = await fetchEmployeeTasksApi(empId).catch(() => []);

      // If no tasks specifically assigned to this ID, fetch general complaints and include assigned ones
      if (empTasks.length === 0) {
        const allComplaints = await fetchComplaintsApi().catch(() => []);
        empTasks = allComplaints.filter(
          (c) =>
            c.assigned_employee_id === empId ||
            c.assigned_employee_id === "EMP-001" ||
            c.status === "in_progress" ||
            c.status === "assigned"
        );
        // If still empty, present open complaints for demonstration
        if (empTasks.length === 0) {
          empTasks = allComplaints.slice(0, 4);
        }
      }

      setTasks(empTasks);
    } catch (err) {
      console.error("Failed to load employee tasks", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
  };

  const handleLogout = () => {
    clearSession();
    router.push("/");
  };

  // Status progression action: Accept / Start Work
  const handleStartWork = async (task: Complaint) => {
    setIsUpdating(true);
    try {
      await updateTaskProgressApi(task.id, {
        employee_id: employeeUser?.id || "EMP-001",
        status: "in_progress",
        notes: `Work initiated on site by ${employeeUser?.name || "Field Team"}.`,
      });
      setActionSuccessMessage("Task accepted! Work status changed to IN PROGRESS.");
      setTimeout(() => setActionSuccessMessage(null), 4000);
      setSelectedTask(null);
      await loadTasks();
    } catch (err: any) {
      alert(`Failed to update task: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Submit Resolution Evidence
  const handleSubmitResolution = async () => {
    if (!selectedTask) return;
    if (!resolutionImageUrl && !resolutionImagePreview) {
      alert("Please upload or attach completion photo evidence before submitting.");
      return;
    }

    setIsUpdating(true);
    try {
      const finalImage = resolutionImagePreview || resolutionImageUrl;
      await updateTaskProgressApi(selectedTask.id, {
        employee_id: employeeUser?.id || "EMP-001",
        status: "resolution_submitted",
        notes: progressNotes || "Field repair completed. Submitted for supervisor verification.",
        resolution_image_url: finalImage,
      });
      setActionSuccessMessage(
        "Proof of resolution submitted! Supervisor has been notified for audit approval."
      );
      setTimeout(() => setActionSuccessMessage(null), 4000);
      setSelectedTask(null);
      setProgressNotes("");
      setResolutionImageUrl("");
      setResolutionImagePreview(null);
      await loadTasks();
    } catch (err: any) {
      alert(`Failed to submit resolution: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle local file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setResolutionImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Sample photo attachment for quick testing
  const handleUseSamplePhoto = () => {
    const sampleProof =
      "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80";
    setResolutionImagePreview(sampleProof);
    setProgressNotes("Road pothole filled with asphalt aggregate and steam-rolled flush with pavement.");
  };

  // Computed KPIs
  const kpis = useMemo(() => {
    const total = tasks.length;
    const assigned = tasks.filter((t) => t.status === "assigned" || t.status === "pending").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress" && !t.resolution_image_url)
      .length;
    const submitted = tasks.filter(
      (t) => t.status === "resolution_submitted" || (t.status === "in_progress" && t.resolution_image_url)
    ).length;
    const completed = tasks.filter((t) => t.status === "resolved").length;

    return { total, assigned, inProgress, submitted, completed };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    if (statusFilter === "ALL") return tasks;
    if (statusFilter === "assigned")
      return tasks.filter((t) => t.status === "assigned" || t.status === "pending");
    if (statusFilter === "in_progress")
      return tasks.filter((t) => t.status === "in_progress" && !t.resolution_image_url);
    if (statusFilter === "submitted")
      return tasks.filter(
        (t) => t.status === "resolution_submitted" || (t.status === "in_progress" && t.resolution_image_url)
      );
    if (statusFilter === "resolved") return tasks.filter((t) => t.status === "resolved");
    return tasks;
  }, [tasks, statusFilter]);

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
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                    Field Operations
                  </span>
                </span>
                <p className="text-[10px] text-slate-500 hidden sm:block">
                  Field Engineer Task Dispatch & Resolution Verification
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-all cursor-pointer"
              title="Refresh assigned tasks"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-amber-600" : ""}`} />
            </button>

            <div className="h-8 w-px bg-slate-200" />

            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-amber-800 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                {employeeUser?.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("") || "RK"}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {employeeUser?.name || "Ravi Kumar"}
                </p>
                <p className="text-[10px] text-slate-500">
                  {employeeUser?.department || "Roads & Infrastructure"}
                </p>
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

      {/* ── Main Dashboard Body ─────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banner Greeting */}
        <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Field Shift Active
                </span>
                <span className="text-xs text-slate-300">
                  ID: {employeeUser?.id || "EMP-001"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Namaste, {employeeUser?.name || "Field Officer"}
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
                Here are your assigned civic maintenance and hazard repair tasks. Accept incoming assignments, inspect geotagged coordinates, and capture after-repair evidence for verification.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 text-center border border-white/10 min-w-[100px]">
                <p className="text-2xl font-black text-amber-400">{kpis.inProgress}</p>
                <p className="text-[10px] uppercase font-bold text-slate-300 mt-0.5">
                  On Site Now
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 text-center border border-white/10 min-w-[100px]">
                <p className="text-2xl font-black text-emerald-400">{kpis.completed}</p>
                <p className="text-[10px] uppercase font-bold text-slate-300 mt-0.5">
                  Completed
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Task KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div
            onClick={() => setStatusFilter("assigned")}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === "assigned"
                ? "bg-white border-amber-400 shadow-md ring-2 ring-amber-400/20"
                : "bg-white border-slate-200 shadow-2xs hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider">New Assigned</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">{kpis.assigned}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Awaiting start</p>
          </div>

          <div
            onClick={() => setStatusFilter("in_progress")}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === "in_progress"
                ? "bg-white border-blue-400 shadow-md ring-2 ring-blue-400/20"
                : "bg-white border-slate-200 shadow-2xs hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between text-blue-600 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider">In Progress</span>
              <HardHat className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-black text-blue-600">{kpis.inProgress}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Active on field</p>
          </div>

          <div
            onClick={() => setStatusFilter("submitted")}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === "submitted"
                ? "bg-white border-amber-500 shadow-md ring-2 ring-amber-500/20"
                : "bg-white border-slate-200 shadow-2xs hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between text-amber-700 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider">Awaiting Audit</span>
              <FileCheck2 className="h-4 w-4 text-amber-700" />
            </div>
            <p className="text-2xl font-black text-amber-800">{kpis.submitted}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Proof submitted</p>
          </div>

          <div
            onClick={() => setStatusFilter("resolved")}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === "resolved"
                ? "bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                : "bg-white border-slate-200 shadow-2xs hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between text-emerald-700 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider">Verified Closed</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            </div>
            <p className="text-2xl font-black text-emerald-800">{kpis.completed}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Approved by admin</p>
          </div>
        </div>

        {/* Task Management Section */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">Assigned Task Roster</h2>
              <p className="text-xs text-slate-500">
                Click any task to inspect details, navigate to site coords, or upload resolution photos.
              </p>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {["ALL", "assigned", "in_progress", "submitted", "resolved"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                    statusFilter === s
                      ? "bg-amber-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s === "ALL" ? "All Tasks" : s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500 font-bold">
              Loading your tasks...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-16 text-center bg-slate-50 rounded-2xl border border-slate-100">
              <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">No tasks in this view.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Switch filters above or refresh the roster.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTasks.map((task) => {
                const isCritical = task.priority_tier === "CRITICAL" || task.urgency === "High";
                const isSubmitted =
                  task.status === "resolution_submitted" ||
                  (task.resolution_image_url && task.status !== "resolved");

                return (
                  <div
                    key={task.id}
                    className="p-5 rounded-3xl border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between gap-4 bg-white"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {task.complaint_id_code || task.id.slice(0, 8)}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                            isCritical
                              ? "bg-rose-100 text-rose-900 border-rose-200"
                              : "bg-blue-100 text-blue-900 border-blue-200"
                          }`}
                        >
                          {task.priority_tier || task.urgency}
                        </span>
                      </div>

                      {task.imageUrl && (
                        <img
                          src={task.imageUrl}
                          alt=""
                          className="h-32 w-full object-cover rounded-2xl border border-slate-100"
                        />
                      )}

                      <div>
                        <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                          {task.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{task.location}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          task.status === "resolved"
                            ? "bg-emerald-100 text-emerald-900"
                            : isSubmitted
                            ? "bg-amber-100 text-amber-900"
                            : task.status === "in_progress"
                            ? "bg-blue-100 text-blue-900"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {isSubmitted ? "Audit Pending" : task.status.replace("_", " ")}
                      </span>

                      <button
                        onClick={() => setSelectedTask(task)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                      >
                        <span>Manage Task</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── MODAL: FIELD TASK EXECUTION & EVIDENCE UPLOAD ───────────────────── */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-scaleUp">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  {selectedTask.complaint_id_code || selectedTask.id}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {selectedTask.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Location: {selectedTask.location} · {selectedTask.village || "Shyampet"}
                </p>
              </div>

              <button
                onClick={() => setSelectedTask(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Current State & Progress Action */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase">Work Status:</span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800">
                  {selectedTask.status.replace("_", " ").toUpperCase()}
                </span>
              </div>

              {selectedTask.status === "assigned" || selectedTask.status === "pending" ? (
                <button
                  onClick={() => handleStartWork(selectedTask)}
                  disabled={isUpdating}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Play className="h-4 w-4 fill-white" />
                  <span>Accept Assignment & Start On-Site Work</span>
                </button>
              ) : selectedTask.status === "in_progress" ? (
                <p className="text-xs text-blue-900 font-bold bg-blue-50 p-2 rounded-xl border border-blue-200 flex items-center gap-2">
                  <HardHat className="h-4 w-4" />
                  <span>Work is active on site. Upload repair proof below when complete.</span>
                </p>
              ) : selectedTask.status === "resolution_submitted" ? (
                <p className="text-xs text-amber-900 font-bold bg-amber-50 p-2 rounded-xl border border-amber-200 flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4" />
                  <span>Resolution submitted. Awaiting supervisor audit approval.</span>
                </p>
              ) : (
                <p className="text-xs text-emerald-900 font-bold bg-emerald-50 p-2 rounded-xl border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Officially resolved and verified by Panchayat Admin.</span>
                </p>
              )}
            </div>

            {/* Evidence Upload Section */}
            {selectedTask.status !== "resolved" && (
              <div className="space-y-4 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      Upload Completion Photo Evidence
                    </label>
                    <button
                      type="button"
                      onClick={handleUseSamplePhoto}
                      className="text-[11px] text-amber-800 font-bold hover:underline cursor-pointer"
                    >
                      Attach Sample Proof Photo
                    </button>
                  </div>

                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:border-amber-400 bg-slate-50/60 transition-all">
                    {resolutionImagePreview ? (
                      <div className="space-y-2">
                        <img
                          src={resolutionImagePreview}
                          alt="Preview"
                          className="h-40 w-full object-cover rounded-xl border border-emerald-300"
                        />
                        <button
                          type="button"
                          onClick={() => setResolutionImagePreview(null)}
                          className="text-xs text-rose-600 font-bold hover:underline"
                        >
                          Remove Photo
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center gap-2">
                        <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                          <Camera className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            Tap to take picture or browse files
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Clear proof of resolved road, pipe or wire
                          </p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Progress / Completion Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Field Completion Notes & Work Summary:
                  </label>
                  <textarea
                    value={progressNotes}
                    onChange={(e) => setProgressNotes(e.target.value)}
                    placeholder="Describe what was repaired, materials used, or tests conducted..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none h-20 resize-none"
                  />
                </div>

                <button
                  onClick={handleSubmitResolution}
                  disabled={isUpdating}
                  className="w-full py-3 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Submit Resolution Evidence for Audit</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
