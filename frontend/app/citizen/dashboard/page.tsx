"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSession,
  isVillager,
  clearSession,
  setVillagerSession,
  DEMO_VILLAGER,
} from "@/services/demoSession";
import type { DemoVillager } from "@/types";
import { CivicLogo } from "@/components/CivicLogo";
import IndianNationalEmblem from "@/components/IndianNationalEmblem";
import {
  ClipboardList,
  CloudSun,
  TrendingUp,
  LogOut,
  HelpCircle,
  MessageSquare,
  Bell,
  ChevronDown,
  Plus,
  Shield,
  AlertCircle,
  X,
  Send,
  Sparkles,
  ArrowRight,
  Camera,
  UploadCloud,
  MapPin,
  Loader2,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Clock,
  Navigation,
  Droplets,
  Flame,
  Check,
  PhoneCall,
  History,
  FileCheck2,
  ExternalLink,
  Search,
  Home,
} from "lucide-react";
import {
  analyzeIssueImage,
  reverseGeocodeLocation,
  createComplaintApi,
  fetchComplaintsApi,
  formatSla,
  type Complaint,
} from "@/services/complaintsApi";
import { fetchLiveGpsWeather, type WeatherData } from "@/services/weatherApi";
import { translations, type Language } from "@/lib/translations";
import { LanguageSelector } from "@/components/LanguageSelector";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function CitizenDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<DemoVillager | null>(null);
  const [loading, setLoading] = useState(true);

  // Redesigned Navigation Tabs matching Image 3 reference with Home option:
  // "home" (Intro to Application), "report" (Report Issue), "track" (Track Issues), "history" (History), "help" (Help Desk)
  const [currentTab, setCurrentTab] = useState<"home" | "report" | "track" | "history" | "help">("home");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDetailComplaint, setSelectedDetailComplaint] = useState<Complaint | null>(null);

  // New Complaint Form State (Both in-tab and modal support)
  const [modalOpen, setModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("Roads & Infrastructure");
  const [newLocation, setNewLocation] = useState("");
  const [urgencyLevel, setUrgencyLevel] = useState("High");
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  // Image & AI Vision state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [aiAutofilled, setAiAutofilled] = useState(false);
  const [aiModelName, setAiModelName] = useState("");

  // Location Auto-detect State
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);

  // Village Live Announcements & Notifications State
  const [villageAnnouncements, setVillageAnnouncements] = useState<any[]>([]);
  const [activeBannerAnnc, setActiveBannerAnnc] = useState<any | null>(null);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Live GPS Weather State
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState<boolean>(true);
  const [weatherLocationName, setWeatherLocationName] = useState<string>("Detecting GPS Location...");

  // Language & Translation State
  const [lang, setLang] = useState<Language>("en");

  const t = (key: string): string => {
    return translations[lang]?.[key] || translations["en"]?.[key] || key;
  };

  const loadVillageAnnouncements = () => {
    try {
      const stored = localStorage.getItem("civic_village_announcements");
      if (stored) {
        const parsed = JSON.parse(stored);
        setVillageAnnouncements(parsed);
        if (parsed.length > 0) {
          setActiveBannerAnnc(parsed[0]);
        }
      } else {
        const defaultAnnc = [
          {
            id: "ANNC-2026-001",
            title: "📢 National Pulse Polio & Health Drive Active Today!",
            category: "Public Health",
            location: "Ward 3 Primary Health Center & Door-to-Door",
            message:
              "Special Pulse Polio booth is active today. All children aged 0-5 years must receive 2 oral polio drops.",
            priority: "Urgent",
            posted_by: "Village Public Health Administration",
            created_at: "Today, 08:30 AM",
            unread: true,
          },
        ];
        localStorage.setItem("civic_village_announcements", JSON.stringify(defaultAnnc));
        setVillageAnnouncements(defaultAnnc);
        setActiveBannerAnnc(defaultAnnc[0]);
      }
    } catch (e) {
      console.warn("Announcements storage error", e);
    }
  };

  const loadWeatherForUser = async (overrideLat?: number, overrideLon?: number) => {
    setWeatherLoading(true);
    if (overrideLat && overrideLon) {
      try {
        const geoRes = await reverseGeocodeLocation(overrideLat, overrideLon);
        const locName =
          geoRes.location || `GPS (${overrideLat.toFixed(3)}°N, ${overrideLon.toFixed(3)}°E)`;
        setWeatherLocationName(locName);
        const w = await fetchLiveGpsWeather(overrideLat, overrideLon, locName);
        setWeatherData(w);
      } catch {
        const w = await fetchLiveGpsWeather(overrideLat, overrideLon, "Village Area");
        setWeatherData(w);
      } finally {
        setWeatherLoading(false);
      }
      return;
    }

    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          try {
            const geoRes = await reverseGeocodeLocation(latitude, longitude);
            const locName =
              geoRes.location || `GPS (${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E)`;
            setWeatherLocationName(locName);
            const w = await fetchLiveGpsWeather(latitude, longitude, locName);
            setWeatherData(w);
          } catch {
            const w = await fetchLiveGpsWeather(
              latitude,
              longitude,
              `GPS (${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E)`
            );
            setWeatherData(w);
          } finally {
            setWeatherLoading(false);
          }
        },
        async () => {
          const defaultLat = 17.9689;
          const defaultLon = 79.5941;
          const defName = session?.village
            ? `${session.village} (GPS Standard)`
            : "Shyampet Village, Warangal";
          setWeatherLocationName(defName);
          const w = await fetchLiveGpsWeather(defaultLat, defaultLon, defName);
          setWeatherData(w);
          setWeatherLoading(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      const defaultLat = 17.9689;
      const defaultLon = 79.5941;
      const defName = session?.village
        ? `${session.village} (GPS Standard)`
        : "Shyampet Village, Warangal";
      setWeatherLocationName(defName);
      const w = await fetchLiveGpsWeather(defaultLat, defaultLon, defName);
      setWeatherData(w);
      setWeatherLoading(false);
    }
  };

  const loadLiveComplaints = async () => {
    try {
      const data = await fetchComplaintsApi();
      setComplaints(data || []);
    } catch (err) {
      console.warn("Could not load live complaints:", err);
    }
  };

  useEffect(() => {
    let s = getSession();
    if (!s || !isVillager(s)) {
      setVillagerSession();
      s = DEMO_VILLAGER;
    }
    setSession(s as DemoVillager);
    setLoading(false);

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("citizen_lang") as Language;
      if (saved && (saved === "en" || saved === "hi" || saved === "te")) {
        setLang(saved);
      }
    }

    loadVillageAnnouncements();
    loadWeatherForUser();
    loadLiveComplaints();

    const handleSync = () => loadVillageAnnouncements();
    window.addEventListener("storage", handleSync);
    window.addEventListener("village_announcement_posted", handleSync);
    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("village_announcement_posted", handleSync);
    };
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.push("/");
  };

  // ── AI Vision Image Analyzer ──────────────────────────────────
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setAnalyzingImage(true);
    setAiAutofilled(false);

    try {
      const analysis = await analyzeIssueImage(file);

      if (analysis) {
        if (analysis.title && (!newTitle || newTitle === "")) {
          setNewTitle(analysis.title);
        }
        if (analysis.description) {
          setNewDescription(analysis.description);
        }
        if (analysis.category) {
          setNewCategory(analysis.category);
        }
        if (analysis.urgency) {
          setUrgencyLevel(analysis.urgency);
        }
        setAiAutofilled(true);
        setAiModelName(analysis.ai_model || "Groq AI (openai/gpt-oss-120b)");
      }
    } catch (err) {
      console.warn("Image analysis failed:", err);
    } finally {
      setAnalyzingImage(false);
    }
  };

  // ── GPS Geolocation Auto-Detect ───────────────────────────────
  const handleDetectLocation = () => {
    if (!("geolocation" in navigator)) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await reverseGeocodeLocation(latitude, longitude);
          if (res.success && res.location) {
            setNewLocation(res.location);
            setLocationDetected(true);
          } else {
            setNewLocation(`Ward 4, Shyampet (${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E)`);
            setLocationDetected(true);
          }
        } catch {
          setNewLocation(`Ward 4, Shyampet (${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E)`);
          setLocationDetected(true);
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        console.warn("Geolocation error:", err);
        setNewLocation("Ward 4, Shyampet Village, Warangal Rural");
        setLocationDetected(true);
        setDetectingLocation(false);
      },
      { timeout: 7000, enableHighAccuracy: true }
    );
  };

  const resetFormState = () => {
    setNewTitle("");
    setNewDescription("");
    setNewCategory("Roads & Infrastructure");
    setNewLocation("");
    setUrgencyLevel("High");
    setImageFile(null);
    setImagePreview(null);
    setAiAutofilled(false);
    setAiModelName("");
    setLocationDetected(false);
  };

  // ── Submit Complaint ──────────────────────────────────────────
  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSubmittingComplaint(true);
    try {
      const userLocation =
        newLocation.trim() || (session?.village ? `${session.village}, Ward 4` : "Ward 4, Shyampet");
      const citizenName = session?.name || "Ramesh Kumar";

      let payloadImageUrl = imagePreview || "";
      if (imageFile) {
        payloadImageUrl = imagePreview || "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600";
      }

      const descText = (newTitle + " " + newDescription + " " + newCategory).toLowerCase();
      const isFire = /(fire|flame|smoke|blaze|burn|explosion|gas leak|cylinder)/.test(descText) || newCategory.includes("Fire");
      const isShock = /(shock|current|electrocution|live wire|spark|sparking|short circuit|high voltage)/.test(descText) || newCategory.includes("Electricity");

      const created = await createComplaintApi({
        title: newTitle,
        category: isFire
          ? "Fire & Disaster Emergency"
          : isShock
          ? "Electricity-related Civic Issue"
          : newCategory,
        description: newDescription,
        location: userLocation,
        urgency: isFire || isShock ? "High" : urgencyLevel,
        imageUrl: payloadImageUrl,
        villager_name: citizenName,
        villager_id: session?.id || "CITIZEN-001",
      });

      setComplaints((prev) => [created, ...prev]);
      resetFormState();
      setModalOpen(false);
      setCurrentTab("track"); // Switch to Track tab to view newly filed ticket
    } catch (err) {
      console.error("Failed to submit complaint:", err);
      alert("Could not submit complaint. Please check connection and try again.");
    } finally {
      setSubmittingComplaint(false);
    }
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-700" size={36} />
      </div>
    );
  }

  const displayName = session.name || "Ramesh Kumar";

  // Filtered complaints calculation
  const filteredComplaints = complaints.filter((c) => {
    const textMatch =
      !searchQuery ||
      (c.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.location || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.category || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!textMatch) return false;

    if (filterCategory === "all") return true;
    if (filterCategory === "critical") {
      const descText = ((c.title || "") + " " + (c.description || "") + " " + (c.category || "")).toLowerCase();
      const isEmergency =
        /(fire|flame|smoke|blaze|burn|shock|current|electrocution|live wire)/.test(descText) ||
        (c.priority_tier || "").toUpperCase() === "CRITICAL" ||
        (c.recommended_sla_hours !== undefined && c.recommended_sla_hours <= 0.5);
      return isEmergency;
    }
    if (filterCategory === "in_progress") {
      return c.status === "in_progress" || c.status === "resolution_submitted";
    }
    if (filterCategory === "resolved") {
      return c.status === "resolved";
    }
    return (c.category || "").toLowerCase().includes(filterCategory.toLowerCase());
  });

  const resolvedComplaints = complaints.filter((c) => c.status === "resolved");
  const activeComplaintsCount = complaints.filter((c) => c.status !== "resolved").length;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Background Indian National Emblem Watermark */}
      <IndianNationalEmblem opacity={0.04} className="emblem-watermark pointer-events-none fixed inset-0 m-auto" />

      {/* ── TOPBAR NAVIGATION (Redesigned matching Image 3 Reference) ──── */}
      <header className="civic-top-nav-bar">
        <div className="civic-top-nav-inner">
          {/* Brand Logo & Name */}
          <div
            className="civic-brand-wrap"
            onClick={() => setCurrentTab("track")}
            title="Civic Buzz Citizen Intelligence"
          >
            <CivicLogo size="md" />
            <div>
              <div className="civic-brand-title">Civic Buzz</div>
              <div className="civic-brand-sub">Citizen Portal · {session.village || "Shyampet"}</div>
            </div>
          </div>

          {/* Top Horizontal Navigation Links (Image 3 layout + Home) */}
          <nav className="civic-nav-tabs">
            <button
              onClick={() => setCurrentTab("home")}
              className={`civic-nav-tab ${currentTab === "home" ? "active" : ""}`}
            >
              <Home size={16} />
              <span>Home</span>
            </button>

            <button
              onClick={() => setCurrentTab("report")}
              className={`civic-nav-tab ${currentTab === "report" ? "active" : ""}`}
            >
              <Plus size={16} />
              <span>Report Issue</span>
            </button>

            <button
              onClick={() => setCurrentTab("track")}
              className={`civic-nav-tab ${currentTab === "track" ? "active" : ""}`}
            >
              <ClipboardList size={16} />
              <span>Track Issues</span>
              {activeComplaintsCount > 0 && (
                <span className="civic-nav-tab-badge">{activeComplaintsCount}</span>
              )}
            </button>

            <button
              onClick={() => setCurrentTab("history")}
              className={`civic-nav-tab ${currentTab === "history" ? "active" : ""}`}
            >
              <History size={16} />
              <span>History</span>
              {resolvedComplaints.length > 0 && (
                <span className="civic-nav-tab-badge">{resolvedComplaints.length}</span>
              )}
            </button>

            <button
              onClick={() => setCurrentTab("help")}
              className={`civic-nav-tab ${currentTab === "help" ? "active" : ""}`}
            >
              <HelpCircle size={16} />
              <span>Help Desk</span>
            </button>
          </nav>

          {/* Right Action Tools & Profile */}
          <div className="flex items-center gap-3">
            {/* "Welcome Citizen" Profile Card */}
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-800 to-emerald-600 flex items-center justify-center text-xs font-extrabold text-white shadow-xs">
                {getInitials(displayName)}
              </div>
              <div className="text-left">
                <div className="text-xs font-black text-slate-900 leading-tight">Welcome, Citizen</div>
                <div className="text-[11px] text-emerald-700 font-semibold">{displayName}</div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer"
              title="Logout from Civic Buzz"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT WORKSPACE ────────────────────────────────────── */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">

        {/* ── TAB VIEWS (Each topic opens in its own independent clean interface) ── */}

        {/* ── TAB 0: HOME (Welcome User, Platform Banner, Announcements & Intro) ── */}
        {currentTab === "home" && (
          <div className="space-y-6 animate-fadeIn">
            {/* 1. Welcome User Header */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Citizen Portal &middot; {session.village || "Shyampet"}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5">
                Welcome, {displayName}!
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Access digital village services, report civic problems, and track municipal actions.
              </p>
            </div>


            {/* 3. AI-Powered Citizen Complaint Platform Hero Banner */}
            <section className="civic-platform-banner">
              <div className="flex items-center gap-4 flex-1">
                <div className="civic-banner-icon-box">
                  <Sparkles size={28} className="text-emerald-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                      AI-Powered Citizen Platform
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-200">
                      📍 Ward 4, {session.village || "Shyampet"}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight m-0">
                    AI-Powered Citizen Complaint Platform
                  </h2>
                  <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
                    Empowering rural &amp; civic communities with automated AI vision hazard classification, GPS
                    geotagging, deterministic 0–100 priority intelligence, and 30-minute rapid emergency SLAs.
                  </p>
                </div>
              </div>

              {/* Quick Action Buttons inside Banner */}
              <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                <button
                  onClick={() => setCurrentTab("report")}
                  className="px-4 py-2.5 rounded-xl bg-white text-emerald-950 font-bold text-xs sm:text-sm hover:bg-emerald-50 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={16} className="text-emerald-700" />
                  <span>Report Issue</span>
                </button>

                <button
                  onClick={() => setCurrentTab("track")}
                  className="px-4 py-2.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm border border-emerald-600/50 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ClipboardList size={16} />
                  <span>Track Status</span>
                </button>
              </div>
            </section>

            {/* Welcome Card & Application Introduction */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold mb-3">
                  <Sparkles size={14} className="text-emerald-600" />
                  Welcome to Civic Buzz &middot; Digital Governance Platform
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                  Empowering Every Citizen&apos;s Voice into Action.
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed">
                  Civic Buzz is an AI-assisted rural and civic intelligence governance platform designed for citizens, field engineers, and Gram Panchayat administrations. Report community hazards (potholes, live wire shocks, water leaks, garbage accumulation) with automated AI Vision classification, precise GPS geotagging, real-time weather alerts, and regional mandi market crop pricing.
                </p>

                {/* Quick CTA row */}
                <div className="flex items-center gap-3 mt-6 flex-wrap">
                  <button
                    onClick={() => setCurrentTab("report")}
                    className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>Report a Civic Issue</span>
                    <ArrowRight size={14} />
                  </button>
                  <button
                    onClick={() => setCurrentTab("track")}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm border border-slate-300 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <ClipboardList size={16} />
                    <span>Track Live Village Issues ({complaints.length})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 1: TRACK ISSUES (Visual complaint feed from previous interface) ── */}
        {currentTab === "track" && (
          <div className="space-y-4 animate-fadeIn">
            {/* Dedicated Page Header for Track Issues */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ClipboardList size={20} className="text-emerald-700" />
                  <h2 className="text-lg font-black text-slate-900">Track Civic Issues &amp; Resolution</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live monitoring of community complaints, SLA compliance, and municipal dispatch across Ward 1–4.
                </p>
              </div>
              <button
                onClick={() => setCurrentTab("report")}
                className="add-report-btn shrink-0"
              >
                <Plus size={15} />
                <span>New Complaint</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search complaints by title, ward, category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <button
                  onClick={() => setFilterCategory("all")}
                  className={`civic-filter-pill-btn ${filterCategory === "all" ? "active" : ""}`}
                >
                  All ({complaints.length})
                </button>
                <button
                  onClick={() => setFilterCategory("critical")}
                  className={`civic-filter-pill-btn ${filterCategory === "critical" ? "active" : ""}`}
                >
                  🚨 Critical / Rapid SLA
                </button>
                <button
                  onClick={() => setFilterCategory("in_progress")}
                  className={`civic-filter-pill-btn ${filterCategory === "in_progress" ? "active" : ""}`}
                >
                  ⏳ In Progress
                </button>
                <button
                  onClick={() => setFilterCategory("Roads")}
                  className={`civic-filter-pill-btn ${filterCategory === "Roads" ? "active" : ""}`}
                >
                  🛣️ Roads
                </button>
                <button
                  onClick={() => setFilterCategory("Water")}
                  className={`civic-filter-pill-btn ${filterCategory === "Water" ? "active" : ""}`}
                >
                  💧 Water
                </button>
                <button
                  onClick={() => setFilterCategory("Electricity")}
                  className={`civic-filter-pill-btn ${filterCategory === "Electricity" ? "active" : ""}`}
                >
                  ⚡ Electricity
                </button>
              </div>

              {/* Report Issue Button */}
              <button
                onClick={() => setModalOpen(true)}
                className="add-report-btn shrink-0"
              >
                <Plus size={15} />
                <span>New Complaint</span>
              </button>
            </div>

            {/* Complaints Cards List (Identical design to previous interface) */}
            <div className="complaints-card border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden">
              {filteredComplaints.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  <CheckCircle2 size={40} className="text-emerald-600 mx-auto mb-2" />
                  <div className="text-base font-bold text-slate-800">No civic complaints found</div>
                  <div className="text-xs text-slate-400 mt-1 mb-4">
                    All civic issues in this category are resolved or not yet reported.
                  </div>
                  <button
                    onClick={() => setModalOpen(true)}
                    className="add-report-btn mx-auto"
                  >
                    <Plus size={15} />
                    <span>Report a New Issue</span>
                  </button>
                </div>
              ) : (
                filteredComplaints.map((c) => {
                  const descText = (
                    (c.title || "") +
                    " " +
                    (c.description || "") +
                    " " +
                    (c.category || "")
                  ).toLowerCase();
                  const isFireOrShock =
                    /(fire|flame|smoke|blaze|burn|explosion|shock|current|electrocution|live wire|spark|short circuit)/.test(
                      descText
                    ) || (c.recommended_sla_hours !== undefined && c.recommended_sla_hours <= 0.5);

                  const pScore = c.priority_score ?? (isFireOrShock ? 100 : 50);
                  const pTier = (
                    c.priority_tier ||
                    (isFireOrShock
                      ? "CRITICAL"
                      : pScore >= 75
                      ? "CRITICAL"
                      : pScore >= 50
                      ? "HIGH"
                      : pScore >= 25
                      ? "MEDIUM"
                      : "LOW")
                  ).toUpperCase();

                  const tierColor =
                    pTier === "CRITICAL"
                      ? "#dc2626"
                      : pTier === "HIGH"
                      ? "#ea580c"
                      : pTier === "MEDIUM"
                      ? "#d97706"
                      : "#16a34a";
                  const tierBg =
                    pTier === "CRITICAL"
                      ? "#fef2f2"
                      : pTier === "HIGH"
                      ? "#fff7ed"
                      : pTier === "MEDIUM"
                      ? "#fffbeb"
                      : "#f0fdf4";
                  const tierBorder =
                    pTier === "CRITICAL"
                      ? "#fecaca"
                      : pTier === "HIGH"
                      ? "#ffedd5"
                      : pTier === "MEDIUM"
                      ? "#fef3c7"
                      : "#bbf7d0";

                  return (
                    <div
                      key={c.id}
                      className="complaint-item"
                      onClick={() => setSelectedDetailComplaint(c)}
                      style={{
                        padding: "1.1rem 1.25rem",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "1rem",
                        borderBottom: "1px solid #f1f5f9",
                        background: isFireOrShock ? "#fffbfb" : "transparent",
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                      }}
                    >
                      {c.imageUrl ? (
                        <img
                          src={c.imageUrl}
                          alt={c.title}
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 12,
                            objectFit: "cover",
                            border: isFireOrShock ? "2px solid #ef4444" : "1px solid #a7f3d0",
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          className="complaint-avatar"
                          style={{
                            background: isFireOrShock ? "#dc2626" : c.avatarBg || "#064e3b",
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            fontSize: "0.85rem",
                            flexShrink: 0,
                          }}
                        >
                          {isFireOrShock ? "🚨" : c.id}
                        </div>
                      )}

                      <div className="complaint-info" style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            flexWrap: "wrap",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <span
                            className="complaint-title"
                            style={{ fontSize: "0.95rem", fontWeight: 800 }}
                          >
                            {c.title}
                          </span>
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 900,
                              color: tierColor,
                              background: tierBg,
                              border: `1px solid ${tierBorder}`,
                              padding: "0.15rem 0.5rem",
                              borderRadius: 999,
                            }}
                          >
                            {pTier} · {pScore}/100 Score
                          </span>
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 800,
                              color: isFireOrShock ? "#b91c1c" : "#0284c7",
                              background: isFireOrShock ? "#fee2e2" : "#f0f9ff",
                              border: `1px solid ${isFireOrShock ? "#fca5a5" : "#bae6fd"}`,
                              padding: "0.15rem 0.5rem",
                              borderRadius: 999,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            <Clock size={11} /> SLA: {formatSla(c.recommended_sla_hours)}
                          </span>
                          {isFireOrShock && (
                            <span
                              style={{
                                fontSize: "0.65rem",
                                fontWeight: 900,
                                color: "#ffffff",
                                background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
                                padding: "0.15rem 0.55rem",
                                borderRadius: 999,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                                boxShadow: "0 2px 6px rgba(220,38,38,0.25)",
                              }}
                            >
                              ⚡ RAPID ACTION
                            </span>
                          )}
                        </div>

                        {c.description && (
                          <div
                            style={{
                              fontSize: "0.78rem",
                              color: "#475569",
                              marginBottom: "0.35rem",
                              lineHeight: 1.45,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {c.description}
                          </div>
                        )}

                        <div
                          className="complaint-name"
                          style={{
                            fontSize: "0.74rem",
                            color: "#64748b",
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.5rem",
                            alignItems: "center",
                          }}
                        >
                          <span>📍 {c.location}</span>
                          <span style={{ color: "#059669", fontWeight: 700 }}>
                            🏢 Dept: {c.recommended_department || c.category}
                          </span>
                          <span>🕐 {c.date}</span>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: "0.35rem",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          className={`complaint-status ${c.status}`}
                          style={{ padding: "0.35rem 0.85rem", fontSize: "0.78rem" }}
                        >
                          {c.status === "in_progress"
                            ? "In Progress"
                            : c.status === "resolution_submitted"
                            ? "Audit Pending"
                            : c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                        </span>
                        <span style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: 600 }}>
                          {c.complaint_id_code || c.id}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: REPORT ISSUE (Full in-page AI submission form) ─────── */}
        {currentTab === "report" && (
          <div className="max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-md animate-fadeIn">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Plus className="text-emerald-700" size={22} />
                  Report a Civic Problem
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Upload photos with automatic AI Vision classification or write issue details below.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Gram Panchayat Portal
              </span>
            </div>

            <form onSubmit={handleSubmitComplaint} className="space-y-5">
              {/* Photo Upload Zone */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  Photo Evidence (AI Vision Auto-Classification)
                </label>
                <div
                  style={{
                    border: "2px dashed #a7f3d0",
                    borderRadius: 16,
                    padding: "1.5rem",
                    textAlign: "center",
                    background: "#f0fdf4",
                    position: "relative",
                    cursor: "pointer",
                  }}
                  onClick={() => document.getElementById("citizen-file-input")?.click()}
                >
                  <input
                    id="citizen-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{ display: "none" }}
                  />

                  {analyzingImage ? (
                    <div className="py-4">
                      <Loader2 size={32} className="animate-spin text-emerald-700 mx-auto mb-2" />
                      <div className="text-xs font-bold text-emerald-900">
                        Analyzing photo with Groq AI Vision...
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Extracting hazard severity, category &amp; SLA urgency
                      </div>
                    </div>
                  ) : imagePreview ? (
                    <div className="space-y-2">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-44 mx-auto rounded-xl object-cover shadow-sm border border-emerald-300"
                      />
                      <div className="text-xs text-emerald-800 font-bold flex items-center justify-center gap-1">
                        <CheckCircle2 size={14} /> Photo Loaded &middot; Click to change
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                        <UploadCloud size={24} />
                      </div>
                      <div className="text-sm font-bold text-slate-800">
                        Click or drag to upload issue photo
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        AI automatically identifies potholes, pipe leaks, trash, broken streetlights &amp; live wires
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Emergency Banner alert if shock or fire */}
              {(() => {
                const combined = (newTitle + " " + newDescription + " " + newCategory).toLowerCase();
                const isFormFire = /(fire|flame|smoke|blaze|burn|explosion|gas leak|cylinder)/.test(combined);
                const isFormShock = /(shock|current|electrocution|live wire|spark|sparking|short circuit|high voltage)/.test(combined);
                const isFormEmergency = isFormFire || isFormShock || newCategory === "Fire & Disaster Emergency";

                if (!isFormEmergency) return null;

                return (
                  <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-400 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
                      <Flame size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-black text-rose-900">
                        🚨 CRITICAL LIFE SAFETY EMERGENCY DETECTED
                      </div>
                      <div className="text-[11px] text-rose-700 leading-tight mt-0.5">
                        Assigned <strong>⚡ 30-Minute Rapid Action SLA</strong> with instant notification to{" "}
                        <strong>{isFormFire ? "Fire Emergency (101)" : "Electricity Board Emergency Wing (1912)"}</strong>.
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Title Input */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Issue Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deep pothole crater in front of Primary School"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* Auto-Written Description */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Issue Description</label>
                  {aiAutofilled && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✨ AI Generated ({aiModelName || "Groq AI"})
                    </span>
                  )}
                </div>
                <textarea
                  rows={3}
                  required
                  placeholder="Upload a photo to auto-generate description or type details..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* Category & Urgency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="Roads & Infrastructure">Roads &amp; Infrastructure</option>
                    <option value="Water Supply">Water Supply</option>
                    <option value="Sanitation & Waste">Sanitation &amp; Waste</option>
                    <option value="Electricity-related Civic Issue">Electricity &amp; Streetlights</option>
                    <option value="Fire & Disaster Emergency">🔥 Fire &amp; Disaster Emergency (30m Rapid SLA)</option>
                    <option value="Electricity-related Civic Issue">⚡ Electric Shock &amp; Live Wire (30m Rapid SLA)</option>
                    <option value="Health & Other">Health &amp; Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Urgency Level</label>
                  <select
                    value={urgencyLevel}
                    onChange={(e) => setUrgencyLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="High">🔴 High Urgency</option>
                    <option value="Medium">🟡 Medium Urgency</option>
                    <option value="Low">🟢 Low Urgency</option>
                  </select>
                </div>
              </div>

              {/* Location with GPS Auto-Detect */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Location / Ward</label>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={detectingLocation}
                    className="text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {detectingLocation ? (
                      <>
                        <Loader2 size={11} className="animate-spin" /> Detecting GPS...
                      </>
                    ) : (
                      <>
                        <MapPin size={11} className="text-emerald-700" /> Auto-Detect Location (GPS)
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ward 4, Main Market Road, Shyampet"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none ${
                      locationDetected ? "border-emerald-500 bg-emerald-50/40" : "border-slate-300"
                    }`}
                  />
                  {locationDetected && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <CheckCircle2 size={11} /> GPS Verified
                    </span>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    resetFormState();
                    setCurrentTab("track");
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingComplaint}
                  className="flex-[1.5] py-2.5 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-900 hover:to-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submittingComplaint ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Submit Issue Report
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── TAB 3: HISTORY (Resolved complaints archive with evidence) ──── */}
        {currentTab === "history" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <FileCheck2 className="text-emerald-700" size={20} />
                  Resolved Complaints History
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete archive of village complaints verified and resolved by Gram Panchayat teams.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-200">
                {resolvedComplaints.length} Total Resolved
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resolvedComplaints.length === 0 ? (
                <div className="col-span-2 py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
                  <CheckCircle2 size={36} className="text-emerald-600 mx-auto mb-2" />
                  <div className="text-sm font-bold text-slate-800">No resolved history yet</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Resolved complaints with field verification photos will appear here.
                  </div>
                </div>
              ) : (
                resolvedComplaints.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedDetailComplaint(c)}
                    className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-emerald-500 transition-all shadow-xs cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {c.complaint_id_code || c.id}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <Check size={10} /> Verified &amp; Resolved
                        </span>
                      </div>

                      <h3 className="text-sm font-extrabold text-slate-900 line-clamp-1">{c.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.description}</p>

                      {/* Photo evidence preview */}
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block mb-1">Before:</span>
                          {c.imageUrl ? (
                            <img
                              src={c.imageUrl}
                              alt="Reported"
                              className="h-24 w-full object-cover rounded-lg border border-slate-200"
                            />
                          ) : (
                            <div className="h-24 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] text-slate-400">
                              No photo
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-emerald-700 block mb-1">
                            After Resolution:
                          </span>
                          {c.resolution_image_url ? (
                            <img
                              src={c.resolution_image_url}
                              alt="Resolved"
                              className="h-24 w-full object-cover rounded-lg border border-emerald-400"
                            />
                          ) : (
                            <div className="h-24 bg-emerald-50/50 rounded-lg flex items-center justify-center text-[10px] text-emerald-700 font-semibold text-center p-1">
                              Repaired &amp; Audited
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 mt-3 flex justify-between items-center text-[11px] text-slate-500">
                      <span>📍 {c.location}</span>
                      <span className="text-emerald-700 font-bold">View Audit Proof &rarr;</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── TAB 4: HELP DESK (Helplines, Village Notices, Weather & Mandi) ── */}
        {currentTab === "help" && (
          <div className="space-y-6 animate-fadeIn">
            {/* 24/7 Emergency Helplines Section */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <PhoneCall className="text-rose-600" size={20} />
                <h2 className="text-lg font-extrabold text-slate-900">
                  Emergency Helplines &amp; Panchayat Directory
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {/* Fire 101 */}
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-extrabold text-rose-900">🔥 Fire &amp; Disaster Response</div>
                    <div className="text-[11px] text-rose-700">Immediate Rapid Action</div>
                  </div>
                  <a
                    href="tel:101"
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs"
                  >
                    Call 101
                  </a>
                </div>

                {/* Electricity 1912 */}
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-extrabold text-amber-900">⚡ Electricity (TSSPDCL)</div>
                    <div className="text-[11px] text-amber-700">Live Wire Shock / Outage</div>
                  </div>
                  <a
                    href="tel:1912"
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs"
                  >
                    Call 1912
                  </a>
                </div>

                {/* Ambulance 108 */}
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-extrabold text-blue-900">🚑 Ambulance / Medical</div>
                    <div className="text-[11px] text-blue-700">Rural PHC Emergency</div>
                  </div>
                  <a
                    href="tel:108"
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs"
                  >
                    Call 108
                  </a>
                </div>

                {/* Police 100/112 */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">🚓 Police Assistance</div>
                    <div className="text-[11px] text-slate-600">Dial 100 or 112</div>
                  </div>
                  <a
                    href="tel:112"
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs"
                  >
                    Call 112
                  </a>
                </div>

                {/* Women Helpline 1091 */}
                <div className="p-3.5 rounded-xl bg-pink-50 border border-pink-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-extrabold text-pink-900">🛡️ Women Safety Helpline</div>
                    <div className="text-[11px] text-pink-700">24x7 State Support</div>
                  </div>
                  <a
                    href="tel:1091"
                    className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs"
                  >
                    Call 1091
                  </a>
                </div>

                {/* Gram Panchayat Office */}
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-extrabold text-emerald-900">🏛️ Gram Panchayat Secretary</div>
                    <div className="text-[11px] text-emerald-700">Warangal Rural Office</div>
                  </div>
                  <a
                    href="tel:0870245678"
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs"
                  >
                    Contact Desk
                  </a>
                </div>
              </div>
            </div>

            {/* Live Weather & Mandi Prices Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Weather Card */}
              <div className="bg-gradient-to-br from-sky-700 to-sky-900 text-white p-5 rounded-2xl shadow-xs">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                      ● Live Satellite Weather
                    </span>
                    <div className="text-xl font-black mt-2">
                      {weatherData ? `${weatherData.temperature}°C` : "31°C"}
                    </div>
                    <div className="text-xs text-sky-100">{weatherLocationName}</div>
                  </div>
                  <span className="text-3xl">
                    {weatherData ? (weatherData.weatherCode === 0 ? "☀️" : "⛅") : "☀️"}
                  </span>
                </div>
                <div className="text-xs text-sky-100 border-t border-white/20 pt-2 flex justify-between">
                  <span>Humidity: {weatherData?.humidity ?? 65}%</span>
                  <span>Wind: {weatherData?.windSpeed ?? 12} km/h</span>
                </div>
              </div>

              {/* Mandi Rates Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-xs font-extrabold text-emerald-800 flex items-center gap-1.5">
                    <TrendingUp size={14} /> Regional Mandi Market Prices
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">Warangal Mandi</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[11px] text-slate-500 font-bold">Paddy (Fine)</div>
                    <div className="font-extrabold text-slate-900 mt-0.5">₹2,320/q</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[11px] text-slate-500 font-bold">Cotton</div>
                    <div className="font-extrabold text-slate-900 mt-0.5">₹7,450/q</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[11px] text-slate-500 font-bold">Maize</div>
                    <div className="font-extrabold text-slate-900 mt-0.5">₹2,090/q</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL: COMPLAINT LIFECYCLE TRACKER (Interactive timeline & proof) ──── */}
      {selectedDetailComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-scaleUp">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                    {selectedDetailComplaint.complaint_id_code || selectedDetailComplaint.id}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                      selectedDetailComplaint.priority_tier === "CRITICAL"
                        ? "bg-rose-100 text-rose-900 border-rose-200"
                        : "bg-blue-100 text-blue-900 border-blue-200"
                    }`}
                  >
                    {selectedDetailComplaint.priority_tier || selectedDetailComplaint.urgency}
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {selectedDetailComplaint.title}
                </h3>
                <p className="text-xs text-slate-500">
                  📍 {selectedDetailComplaint.location} &middot; {selectedDetailComplaint.date}
                </p>
              </div>

              <button
                onClick={() => setSelectedDetailComplaint(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Lifecycle Progress Stepper */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                Resolution Progress Timeline
              </p>

              {(() => {
                const s = selectedDetailComplaint.status;
                const hasResolutionProof = Boolean(selectedDetailComplaint.resolution_image_url);
                const isResolved = s === "resolved";
                const isAwaiting = s === "resolution_submitted" || (s === "in_progress" && hasResolutionProof);
                const isInProgress = s === "in_progress" || isAwaiting || isResolved;
                const isAssigned = Boolean(selectedDetailComplaint.assigned_employee_name) || isInProgress;

                const steps = [
                  { label: "Reported", done: true, desc: "Submitted by citizen" },
                  { label: "AI Triaged", done: true, desc: `${selectedDetailComplaint.category || "General"}` },
                  {
                    label: "Assigned",
                    done: isAssigned,
                    desc: selectedDetailComplaint.assigned_employee_name
                      ? `To ${selectedDetailComplaint.assigned_employee_name}`
                      : "Pending assignment",
                  },
                  { label: "On-Site Work", done: isInProgress, desc: "Field engineer in action" },
                  {
                    label: "Verified & Resolved",
                    done: isResolved,
                    desc: isResolved ? "Audit confirmed" : isAwaiting ? "Awaiting audit" : "Pending completion",
                  },
                ];

                return (
                  <div className="space-y-3">
                    {steps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div
                          className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                            step.done ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-200 text-slate-400"
                          }`}
                        >
                          {step.done ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs font-bold leading-tight ${
                              step.done ? "text-slate-900" : "text-slate-400"
                            }`}
                          >
                            {step.label}
                          </p>
                          <p className="text-[11px] text-slate-500">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Photo Evidence: Reported vs Resolution Proof */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Photo Evidence:</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500">Reported Photo:</span>
                  {selectedDetailComplaint.imageUrl ? (
                    <img
                      src={selectedDetailComplaint.imageUrl}
                      alt="Reported"
                      className="h-32 w-full object-cover rounded-xl border border-slate-200"
                    />
                  ) : (
                    <div className="h-32 bg-slate-100 rounded-xl flex items-center justify-center text-xs text-slate-400">
                      No Photo
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-emerald-800">Resolution Proof:</span>
                  {selectedDetailComplaint.resolution_image_url ? (
                    <img
                      src={selectedDetailComplaint.resolution_image_url}
                      alt="Resolved"
                      className="h-32 w-full object-cover rounded-xl border border-emerald-400"
                    />
                  ) : (
                    <div className="h-32 bg-amber-50/60 border border-dashed border-amber-300 rounded-xl flex items-center justify-center text-xs text-amber-800 p-2 text-center">
                      Field work in progress
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Department & Staff Information */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Handling Department:</span>
                <span className="font-bold text-slate-900">
                  {selectedDetailComplaint.assigned_department ||
                    selectedDetailComplaint.recommended_department ||
                    selectedDetailComplaint.category}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Field Engineer:</span>
                <span className="font-bold text-slate-900">
                  {selectedDetailComplaint.assigned_employee_name || "Assigned by Secretary"}
                </span>
              </div>
              {selectedDetailComplaint.resolution_notes && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-400 font-semibold block mb-0.5">Repair Summary:</span>
                  <p className="text-slate-800">{selectedDetailComplaint.resolution_notes}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedDetailComplaint(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* ── QUICK REPORT MODAL (Callable from any tab) ─────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Plus className="text-emerald-700" size={18} />
                Quick Issue Report
              </h3>
              <button
                onClick={() => {
                  setModalOpen(false);
                  resetFormState();
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitComplaint} className="space-y-4">
              {/* Photo Input */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Upload Photo (Groq AI Auto-Detect)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-800 cursor-pointer"
                />
                {analyzingImage && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold mt-1">
                    <Loader2 size={12} className="animate-spin" /> Analyzing image...
                  </div>
                )}
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-28 rounded-lg mt-2 object-cover border border-emerald-300"
                  />
                )}
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Issue Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Broken water pipe leaking on main road"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Details of the civic problem..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none"
                >
                  <option value="Roads & Infrastructure">Roads &amp; Infrastructure</option>
                  <option value="Water Supply">Water Supply</option>
                  <option value="Sanitation & Waste">Sanitation &amp; Waste</option>
                  <option value="Electricity-related Civic Issue">Electricity &amp; Streetlights</option>
                  <option value="Fire & Disaster Emergency">🔥 Fire &amp; Disaster Emergency (30m Rapid SLA)</option>
                  <option value="Electricity-related Civic Issue">⚡ Live Wire Shock Hazard (30m Rapid SLA)</option>
                  <option value="Health & Other">Health &amp; Other</option>
                </select>
              </div>

              {/* Location */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700">Location</label>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={detectingLocation}
                    className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                  >
                    {detectingLocation ? "Detecting..." : "Auto GPS"}
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ward 4, Shyampet"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    resetFormState();
                  }}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingComplaint}
                  className="flex-1 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold disabled:opacity-50"
                >
                  {submittingComplaint ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
