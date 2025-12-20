"use client";

import { DashboardHeader } from "@/app/(dashboard)/components/dashboard-header";
import { PersonasSection } from "@/app/(dashboard)/(personas)/components/personas-section";
import { PersonaGenerator } from "@/app/(dashboard)/(personas)/components/persona-generator";

export default function PersonasPage() {
  return (
    <>
      <DashboardHeader />
      <div className="space-y-6 mt-6">
        <PersonaGenerator />
        <PersonasSection />
      </div>
    </>
  );
}

