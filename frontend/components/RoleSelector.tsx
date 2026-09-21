"use client";

import { useRouter } from "next/navigation";
import { setCitizenSession, setEmployeeSession, setAdminSession } from "@/services/demoSession";
import { Users, HardHat, ShieldCheck, ArrowRight } from "lucide-react";

export function RoleSelector() {
  const router = useRouter();

  const handleCitizen = () => {
    setCitizenSession();
    router.push("/citizen/dashboard");
  };

  const handleEmployee = () => {
    setEmployeeSession();
    router.push("/employee/dashboard");
  };

  const handleAdmin = () => {
    setAdminSession();
    router.push("/admin/dashboard");
  };

  return (
    <div className="w-full space-y-3">
      {/* Citizen Card */}
      <button
        onClick={handleCitizen}
        className="role-card group w-full text-left cursor-pointer p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all flex items-center gap-3.5"
        aria-label="Continue to Citizen Portal"
      >
        <div className="role-card-icon h-12 w-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
          <Users className="h-6 w-6 text-emerald-900" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-slate-900 text-sm sm:text-base">Citizen / Villager</p>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Reporting
            </span>
          </div>
          <p className="text-xs text-slate-500 line-clamp-1">
            Report hazards with AI photo vision, live weather & mandi rates
          </p>
        </div>
        <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all shrink-0" />
      </button>

      {/* Field Employee Card */}
      <button
        onClick={handleEmployee}
        className="role-card group w-full text-left cursor-pointer p-4 rounded-2xl bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all flex items-center gap-3.5"
        aria-label="Continue to Employee Portal"
      >
        <div className="role-card-icon h-12 w-12 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
          <HardHat className="h-6 w-6 text-amber-900" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-slate-900 text-sm sm:text-base">Field Employee</p>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              Operations
            </span>
          </div>
          <p className="text-xs text-slate-500 line-clamp-1">
            Field execution tasks, GPS dispatch, and proof upload
          </p>
        </div>
        <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all shrink-0" />
      </button>

      {/* Admin / Secretary Card */}
      <button
        onClick={handleAdmin}
        className="role-card group w-full text-left cursor-pointer p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all flex items-center gap-3.5"
        aria-label="Continue to Admin Command Center"
      >
        <div className="role-card-icon h-12 w-12 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center shrink-0">
          <ShieldCheck className="h-6 w-6 text-indigo-900" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-slate-900 text-sm sm:text-base">Panchayat Admin</p>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
              Command
            </span>
          </div>
          <p className="text-xs text-slate-500 line-clamp-1">
            AI triage, employee recommendation matching & resolution verification
          </p>
        </div>
        <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all shrink-0" />
      </button>
    </div>
  );
}

