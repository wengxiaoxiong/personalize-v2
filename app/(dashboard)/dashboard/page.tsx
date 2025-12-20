"use client";

import { DashboardHeader } from "@/app/(dashboard)/components/dashboard-header";
import { PersonasSection } from "@/app/(dashboard)/personas/components/personas-section";

export default function DashboardPage() {
  return (
    <>
      <DashboardHeader />
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        <div className="xl:col-span-8 space-y-8">
          <PersonasSection />
        </div>
      </div>
    </>
  );
}

