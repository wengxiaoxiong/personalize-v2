"use client";

import { DashboardHeader } from "@/app/(dashboard)/components/dashboard-header";
import { PersonaGenerator } from "../(dashboard)/personas/components/persona-generator";
import { PersonasSection } from "../(dashboard)/personas/components/personas-section";


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

