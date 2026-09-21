"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEMO_ACCOUNTS,
  loginWithCredentials,
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
  Sparkles,
  Check,
  Copy,
  AlertCircle,
  ShieldCheck,
  Zap,
} from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"credentials" | "quick">("credentials");
  const [identifier, setIdentifier] = useState("citizen@civic.gov.in");
  const [password, setPassword] = useState("citizen123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedAccId, setSelectedAccId] = useState<string>("demo-villager-001");

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleAutofill = (acc: DemoAccount) => {
    setIdentifier(acc.email);
    setPassword(acc.password);
    setSelectedAccId(acc.id);
    setError(null);
  };

  const handleQuickLogin = (acc: DemoAccount) => {
    setLoading(true);
    setError(null);
    setSelectedAccId(acc.id);
    setIdentifier(acc.email);
    setPassword(acc.password);

    setTimeout(() => {
      setSessionByAccount(acc);
      router.push(acc.redirectUrl);
    }, 300);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const res = loginWithCredentials(identifier, password);
      if (res.success) {
        router.push(res.redirectUrl);
      } else {
        setError(res.error);
        setLoading(false);
      }
    }, 300);
  };

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
      {/* ── Mode Toggle Tabs ──────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-100 bg-slate-50/80 p-1.5">
        <button
          type="button"
          onClick={() => {
            setActiveTab("credentials");
            setError(null);
          }}
          className={`flex-1 py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === "credentials"
              ? "bg-white text-emerald-950 shadow-xs border border-slate-200"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Lock className="h-4 w-4 text-emerald-700" />
          <span>Credential Login</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("quick");
            setError(null);
          }}
          className={`flex-1 py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === "quick"
              ? "bg-white text-emerald-950 shadow-xs border border-slate-200"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Zap className="h-4 w-4 text-amber-500" />
          <span>1-Click Citizen Portal Access</span>
        </button>
      </div>

      {/* ── Tab 1: Credential Login ────────────────────────────────────────── */}
      {activeTab === "credentials" ? (
        <div className="p-5 sm:p-7 space-y-6">
          {/* Main Login Form */}
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
                Email / Mobile Number / User ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. citizen@civic.gov.in"
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
                  Default demo: citizen123
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
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
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
                  <span>Enter Citizen Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* ── Demo Credentials Section ─────────────────────────────────── */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-700" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  Citizen Demo Account
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-semibold">
                Click to autofill
              </span>
            </div>

            <div className="space-y-3">
              {DEMO_ACCOUNTS.map((acc) => {
                const isSelected = selectedAccId === acc.id;

                return (
                  <div
                    key={acc.id}
                    className={`rounded-2xl p-4 border-2 transition-all text-left relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? "border-emerald-700 bg-emerald-50/60 shadow-xs"
                        : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white bg-emerald-700 shrink-0">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">
                            {acc.name}
                          </h4>
                          <span
                            className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${acc.badgeColor}`}
                          >
                            {acc.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{acc.description}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600 font-mono">
                          <span>{acc.email}</span>
                          <span className="text-slate-300">•</span>
                          <span>pwd: <strong className="text-emerald-900">{acc.password}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAutofill(acc)}
                        className="py-1.5 px-3 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 hover:text-slate-900 transition-all text-center"
                      >
                        Autofill
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickLogin(acc)}
                        disabled={loading}
                        className="py-1.5 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-extrabold flex items-center justify-center gap-1 shadow-xs transition-all"
                      >
                        <span>⚡ Direct Sign In</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ── Tab 2: 1-Click Role Direct Cards ─────────────────────────────── */
        <div className="p-5 sm:p-7 space-y-3.5">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.id}
              type="button"
              onClick={() => handleQuickLogin(acc)}
              disabled={loading}
              className="w-full group cursor-pointer text-left rounded-2xl p-5 border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 hover:shadow-md transition-all duration-200 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-12 w-12 rounded-xl bg-emerald-800 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <Users className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-950 truncate">
                      {acc.roleTitle}
                    </h4>
                    <span className="text-xs font-bold text-slate-500">
                      ({acc.name})
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 truncate">{acc.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 text-xs font-extrabold text-emerald-900 pl-2">
                <span>Enter Portal</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
