"use client";

import { useRouter } from "next/navigation";
import { setVillagerSession } from "@/services/demoSession";
import { Users, ArrowRight } from "lucide-react";

export function RoleSelector() {
  const router = useRouter();

  const handleVillager = () => {
    setVillagerSession();
    router.push("/citizen/dashboard");
  };

  return (
    <div className="w-full space-y-4">
      {/* Citizen Card */}
      <button
        onClick={handleVillager}
        className="role-card group w-full text-left cursor-pointer"
        aria-label="Continue to Citizen Portal"
      >
        <div className="role-card-icon bg-emerald-100 border border-emerald-200">
          <Users className="h-7 w-7 text-emerald-900" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="role-card-title">Continue as Citizen / Villager</p>
          <p className="role-card-subtitle">
            Report civic problems, view local weather & mandi market prices
          </p>
        </div>
        <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
      </button>
    </div>
  );
}
