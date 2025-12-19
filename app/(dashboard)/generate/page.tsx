"use client";

import { DashboardHeader } from "@/app/(dashboard)/components/dashboard-header";
import { AIGenerator } from "@/app/(dashboard)/generate/components/ai-generator";

export default function GeneratePage() {
  return (
    <>
      <DashboardHeader />
      <div className="grid grid-cols-1 gap-8">
        <AIGenerator />
      </div>
    </>
  );
}

