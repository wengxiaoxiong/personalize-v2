"use client";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { PersonasSection } from "@/components/dashboard/personas-section";
import { useDashboard } from "@/components/providers/dashboard-provider";

export default function PersonasPage() {
  const { snapshot } = useDashboard();
  const displayName = "TechMaster";

  return (
    <>
      <DashboardHeader displayName={displayName} />
      <PersonasSection />
    </>
  );
}

