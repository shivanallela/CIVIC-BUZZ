"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEMO_ACCOUNTS,
  loginWithCredentialsAsync,
  setSessionByAccount,
  DemoAccount,
} from "@/services/demoSession";
import {
  Users,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Zap,
  HardHat,
} from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"quick" | "credentials">("quick");
  const [roleFilter, setRoleFilter] = useState<"all" | "citizen" | "employee" | "admin">("all");
  const [identifier, setIdentifier] = useState("citizen@civic.gov.in");
  const [password, setPassword] = useState("citizen123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAutofill = (acc: DemoAccount) => {
    setIdentifier(acc.email);
    setPassword(acc.password);
    setError(null);
  };

  const handleQuickLogin = (acc: DemoAccount) => {
    setLoading(true);
    setError(null);
    setIdentifier(acc.email);
    setPassword(acc.password);

    setTimeout(() => {
      setSessionByAccount(acc);
      router.push(acc.redirectUrl);
    }, 250);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginWithCredentialsAsync(
        identifier,
        password,
        roleFilter === "all" ? undefined : roleFilter
      );
      if (res.success) {
        router.push(res.redirectUrl);
      } else {
        setError(res.error);
        setLoading(false);
      }
    } catch {
      setError("Login failed. Please try again.");
      setLoading(false);
    }
  };

  const filteredAccounts =
    roleFilter === "all"
      ? DEMO_ACCOUNTS
      : DEMO_ACCOUNTS.filter(
          (a) =>
            a.role === roleFilter ||
            (roleFilter === "citizen" && a.role === "villager")
        );

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
      {/* ── Mode Toggle Tabs ──────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-100 bg-slate-50/80 p-1.5">
        <button
          type="button"
          onClick={() => {
            setActiveTab("quick");
            setError(null);
          }}
          className={`flex-1 py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === "quick"
              ? "bg-white text-emerald-950 shadow-xs border border-slate-200"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Zap className="h-4 w-4 text-amber-500" />
          <span>1-Click Role Access</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("credentials");
            setError(null);
          }}
          className={`flex-1 py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === "credentials"
              ? "bg-white text-emerald-950 shadow-xs border border-slate-200"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Lock className="h-4 w-4 text-emerald-700" />
          <span>Credential Login</span>
        </button>
      </div>

      {/* ── Role Filter Pills ────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-2 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between gap-2 overflow-x-auto">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
          Filter Role:
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {(["all", "citizen", "employee", "admin"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-all cursor-pointer ${
                roleFilter === r
                  ? "bg-emerald-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {r === "all" ? "All Portals" : r}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab 1: 1-Click Role Access (Default) ───────────────────────────── */}
      {activeTab === "quick" ? (
        <div className="p-5 sm:p-7 space-y-3.5">
          {filteredAccounts.map((acc) => {
            const isCitizenAcc = acc.role === "citizen" || acc.role === "villager";
            const isEmployeeAcc = acc.role === "employee";

            return (
              <div
                key={acc.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isCitizenAcc
                    ? "bg-emerald-50/40 border-emerald-200 hover:border-emerald-400"
                    : isEmployeeAcc
                    ? "bg-amber-50/40 border-amber-200 hover:border-amber-400"
                    : "bg-indigo-50/40 border-indigo-200 hover:border-indigo-400"
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border ${
                      isCitizenAcc
                        ? "bg-emerald-100 border-emerald-300 text-emerald-900"
                        : isEmployeeAcc
                        ? "bg-amber-100 border-amber-300 text-amber-900"
                        : "bg-indigo-100 border-indigo-300 text-indigo-900"
                    }`}
                  >
                    {isCitizenAcc && <Users className="h-5 w-5" />}
                    {isEmployeeAcc && <HardHat className="h-5 w-5" />}
                    {!isCitizenAcc && !isEmployeeAcc && <ShieldCheck className="h-5 w-5" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{acc.name}</span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${acc.badgeColor}`}
                      >
                        {acc.badge}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5">{acc.roleTitle}</p>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{acc.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => {
                      handleAutofill(acc);
                      setActiveTab("credentials");
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-all"
                  >
                    Fill Credentials
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin(acc)}
                    disabled={loading}
                    className={`px-4 py-2 rounded-xl text-white font-bold text-xs shadow-sm hover:shadow-md flex items-center gap-1.5 transition-all cursor-pointer ${
                      isCitizenAcc
                        ? "bg-emerald-800 hover:bg-emerald-900"
                        : isEmployeeAcc
                        ? "bg-amber-800 hover:bg-amber-900"
                        : "bg-indigo-800 hover:bg-indigo-900"
                    }`}
                  >
                    <span>Enter Portal</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Tab 2: Credential Login ────────────────────────────────────────── */
        <div className="p-5 sm:p-7 space-y-6">
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5 animate-shake">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{error}</div>
              </div>
            )}

            {/* Email / User ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Email / Mobile Number / ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. citizen@civic.gov.in / employee@civic.gov.in / admin@civic.gov.in"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <span className="text-[11px] text-emerald-800 font-semibold">
                  Demo: citizen123 | emp123 | admin123
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-900 hover:bg-emerald-950 active:scale-[0.99] text-white font-extrabold text-sm shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Authenticate & Enter Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Cheat Sheet */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 text-center">
              Quick Autofill Demo Accounts
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleAutofill(acc)}
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-all cursor-pointer"
                >
                  <p className="text-xs font-bold text-slate-800">{acc.roleTitle.split("/")[0]}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">{acc.email}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
