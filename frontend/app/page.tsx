"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/services/demoSession";
import { CivicLogo } from "@/components/CivicLogo";
import { LoginForm } from "@/components/LoginForm";

export default function LandingPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  // If a session exists, route straight to its role dashboard
  useEffect(() => {
    const s = getSession();
    if (s) {
      if (s.role === "employee") {
        router.replace("/employee/dashboard");
      } else if (s.role === "admin") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/citizen/dashboard");
      }
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
      <header className="w-full px-4 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-2.5">
          <CivicLogo size="sm" />
          <span className="font-extrabold text-emerald-950 text-lg tracking-tight">
            Civic -Buzz
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-300 inline-flex items-center gap-1.5 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Citizen · Field · Admin
          </span>
        </div>
      </header>

      {/* ── Hero & Login ────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 pb-12">
        {/* Hero section */}
        <section className="pt-6 pb-6 text-center">
          <div className="flex justify-center mb-4">
            <CivicLogo size="hero" glow={true} />
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight mb-2 tracking-tight">
            Civic -Buzz
          </h1>
          <p className="text-base sm:text-lg text-emerald-900 font-bold mb-2">
            &ldquo;AI assists. Evidence supports. Humans decide.&rdquo;
          </p>
          <p className="text-slate-600 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            Unified multi-role civic management platform. Empowering citizens to report village hazards with AI vision, enabling field teams with GPS dispatch & photo verification, and assisting panchayat admins with intelligent triage.
          </p>
        </section>

        {/* ── Interactive Login System ───────────────────────────────────────── */}
        <section id="login-section" className="mb-8">
          <LoginForm />
        </section>
      </main>

      <footer className="text-center py-5 px-4 border-t border-slate-200/60 bg-white">
        <p className="text-xs text-slate-400">
          Civic -Buzz &nbsp;·&nbsp; Citizen Civic Engagement Portal
        </p>
      </footer>
    </div>
  );
}
