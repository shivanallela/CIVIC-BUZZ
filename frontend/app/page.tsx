"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/services/demoSession";
import { CivicLogo } from "@/components/CivicLogo";
import { LoginForm } from "@/components/LoginForm";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Camera, MapPin, CloudSun, TrendingUp, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  // If a session exists, route straight to citizen dashboard
  useEffect(() => {
    const s = getSession();
    if (s) {
      router.replace("/citizen/dashboard");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="w-full px-4 py-4 flex items-center justify-between max-w-3xl mx-auto">
        <div className="flex items-center gap-2.5">
          <CivicLogo size="sm" />
          <span className="font-extrabold text-emerald-950 text-lg tracking-tight">
            Civic Catalyst
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSelector variant="landing" />
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-300 inline-flex items-center gap-1.5 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Citizen Portal
          </span>
        </div>
      </header>

      {/* ── Hero & Login ────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 pb-12">
        {/* Hero section */}
        <section className="pt-6 pb-6 text-center">
          <div className="flex justify-center mb-4">
            <CivicLogo size="hero" glow={true} />
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight mb-2 tracking-tight">
            Civic Catalyst
          </h1>
          <p className="text-base sm:text-lg text-emerald-900 font-bold mb-2">
            &ldquo;Empowering every citizen&apos;s voice into action.&rdquo;
          </p>
          <p className="text-slate-600 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
            AI-powered Citizen Civic Issue Reporting Portal. Report village hazards with photo evidence and GPS, check local weather, and track mandi market prices.
          </p>
        </section>

        {/* ── Interactive Login System ───────────────────────────────────────── */}
        <section id="login-section" className="mb-8">
          <LoginForm />
        </section>

        {/* ── Citizen Features Highlights ────────────────────────────────────── */}
        <section className="mb-6">
          <div className="bg-white rounded-3xl border border-emerald-200/80 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-950 mb-4 text-center">
              Citizen Portal Highlights
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Feature 1 */}
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-900">
                  <Camera className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-slate-800 text-center">
                  AI Vision
                </p>
                <p className="text-[11px] text-slate-500 text-center leading-tight">
                  Auto-detect road, water & wire hazards
                </p>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-900">
                  <MapPin className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-slate-800 text-center">
                  GPS Geotagging
                </p>
                <p className="text-[11px] text-slate-500 text-center leading-tight">
                  Pinpoint exact issue locations
                </p>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-900">
                  <CloudSun className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-slate-800 text-center">
                  Live Weather
                </p>
                <p className="text-[11px] text-slate-500 text-center leading-tight">
                  7-day forecast & farm advisories
                </p>
              </div>

              {/* Feature 4 */}
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-900">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-slate-800 text-center">
                  Mandi Rates
                </p>
                <p className="text-[11px] text-slate-500 text-center leading-tight">
                  Live crop prices across mandis
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="text-center py-5 px-4 border-t border-slate-200/60 bg-white">
        <p className="text-xs text-slate-400">
          Civic Catalyst &nbsp;·&nbsp; Citizen Civic Engagement Portal
        </p>
      </footer>
    </div>
  );
}
