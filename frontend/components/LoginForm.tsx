"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEMO_ACCOUNTS,
  loginWithCredentialsAsync,
  DemoAccount,
} from "@/services/demoSession";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  User,
  MapPin,
  CheckCircle2,
  UserPlus,
  LogIn,
} from "lucide-react";

export function LoginForm() {
  const router = useRouter();

  // Mode: "login" or "signup"
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  // Login form state
  const [identifier, setIdentifier] = useState("citizen@civic.gov.in");
  const [password, setPassword] = useState("citizen123");
  const [showPassword, setShowPassword] = useState(false);
  const [roleFilter, setRoleFilter] = useState<"all" | "citizen" | "employee" | "admin">("all");

  // Signup form state
  const [signupName, setSignupName] = useState("");
  const [signupIdentifier, setSignupIdentifier] = useState("");
  const [signupVillage, setSignupVillage] = useState("Shyampet");
  const [signupWard, setSignupWard] = useState("Ward 4");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Common state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quick Autofill for demo testing
  const handleAutofill = (acc: DemoAccount) => {
    setAuthMode("login");
    setIdentifier(acc.email);
    setPassword(acc.password);
    setError(null);
  };

  // Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
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
      setError("Login failed. Please verify your credentials and try again.");
      setLoading(false);
    }
  };

  // Submit Signup
  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!signupName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!signupIdentifier.trim()) {
      setError("Please enter your mobile number or email.");
      return;
    }
    if (signupPassword.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    // Save session in local storage
    const newCitizenSession = {
      id: `cit-${Date.now().toString().slice(-4)}`,
      name: signupName.trim(),
      role: "citizen" as const,
      village: `${signupVillage} (${signupWard})`,
      email: signupIdentifier.includes("@") ? signupIdentifier.trim() : `${signupIdentifier.trim()}@citizen.civic.gov.in`,
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("civic_demo_session", JSON.stringify(newCitizenSession));
    }

    setSuccessMsg(`Account created for ${newCitizenSession.name}! Entering citizen portal...`);

    setTimeout(() => {
      router.push("/citizen/dashboard");
    }, 700);
  };

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
      {/* ── Mode Toggle Tabs: Sign In / Sign Up ────────────────────────── */}
      <div className="flex border-b border-slate-100 bg-slate-50/80 p-1.5">
        <button
          type="button"
          onClick={() => {
            setAuthMode("login");
            setError(null);
            setSuccessMsg(null);
          }}
          className={`flex-1 py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            authMode === "login"
              ? "bg-white text-emerald-950 shadow-xs border border-slate-200"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <LogIn className="h-4 w-4 text-emerald-800" />
          <span>Sign In</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setAuthMode("signup");
            setError(null);
            setSuccessMsg(null);
          }}
          className={`flex-1 py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            authMode === "signup"
              ? "bg-white text-emerald-950 shadow-xs border border-slate-200"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <UserPlus className="h-4 w-4 text-emerald-800" />
          <span>Sign Up</span>
        </button>
      </div>

      {/* ── Alert Messages ────────────────────────────────────────────── */}
      <div className="px-5 sm:px-7 pt-4">
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5 animate-shake">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{error}</div>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="flex-1 font-bold leading-relaxed">{successMsg}</div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MODE 1: CREDENTIAL LOGIN
      ══════════════════════════════════════════════════════════════════ */}
      {authMode === "login" && (
        <div className="p-5 sm:p-7 space-y-5">
          {/* Role Filter Pills */}
          <div className="pb-1 border-b border-slate-100 flex items-center justify-between gap-2 overflow-x-auto">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
              Select Portal Role:
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
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {r === "all" ? "All Portals" : r}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Email / Mobile / ID */}
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-medium focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 outline-none transition-all"
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
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-medium focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 outline-none transition-all"
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

          {/* Quick Autofill Demo Accounts Section */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 text-center">
              Quick Autofill Demo Accounts
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleAutofill(acc)}
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition-all cursor-pointer"
                >
                  <p className="text-xs font-bold text-slate-800">{acc.roleTitle.split("/")[0]}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">{acc.email}</p>
                </button>
              ))}
            </div>

            {/* Switch to Signup Prompt */}
            <div className="text-center pt-3">
              <p className="text-xs text-slate-500">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => setAuthMode("signup")}
                  className="font-bold text-emerald-800 hover:underline cursor-pointer"
                >
                  Sign Up for Civic -Buzz
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODE 2: SIGN UP OPTION
      ══════════════════════════════════════════════════════════════════ */}
      {authMode === "signup" && (
        <div className="p-5 sm:p-7 space-y-4 animate-fadeIn">
          <div>
            <h3 className="font-black text-slate-900 text-base">Create Citizen Account</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Register as a village resident to file civic complaints, track repair progress, and access village services.
            </p>
          </div>

          <form onSubmit={handleSignupSubmit} className="space-y-3.5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-medium focus:ring-2 focus:ring-emerald-700 outline-none"
                  required
                />
              </div>
            </div>

            {/* Mobile / Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Mobile Number / Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={signupIdentifier}
                  onChange={(e) => setSignupIdentifier(e.target.value)}
                  placeholder="e.g. 9876543210 or citizen@email.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-medium focus:ring-2 focus:ring-emerald-700 outline-none"
                  required
                />
              </div>
            </div>

            {/* Village & Ward */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Gram Panchayat / Village
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={signupVillage}
                    onChange={(e) => setSignupVillage(e.target.value)}
                    placeholder="Shyampet"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-medium focus:ring-2 focus:ring-emerald-700 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Ward Number
                </label>
                <select
                  value={signupWard}
                  onChange={(e) => setSignupWard(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-medium focus:ring-2 focus:ring-emerald-700 outline-none"
                >
                  <option value="Ward 1">Ward 1 - North Street</option>
                  <option value="Ward 2">Ward 2 - Market Area</option>
                  <option value="Ward 3">Ward 3 - Temple Cross</option>
                  <option value="Ward 4">Ward 4 - Bus Stand & Main Road</option>
                  <option value="Ward 5">Ward 5 - West Habitation</option>
                  <option value="Ward 6">Ward 6 - Sub-Station Zone</option>
                </select>
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showSignupPassword ? "text" : "password"}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Create password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-medium focus:ring-2 focus:ring-emerald-700 outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showSignupPassword ? "text" : "password"}
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-medium focus:ring-2 focus:ring-emerald-700 outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-900 hover:bg-emerald-950 active:scale-[0.99] text-white font-extrabold text-sm shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed pt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Register & Enter Citizen Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch back to Login */}
          <div className="text-center pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className="font-bold text-emerald-800 hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
