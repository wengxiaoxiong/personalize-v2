"use client";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { AIGenerator } from "@/components/dashboard/ai-generator";
import { RecommendationsSection } from "@/components/dashboard/recommendations-section";

export default function GeneratePage() {
  const displayName = "TechMaster";

  return (
    <>
      <DashboardHeader displayName={displayName} />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <AIGenerator />
        <RecommendationsSection />
      </div>
    </>
  );
}

