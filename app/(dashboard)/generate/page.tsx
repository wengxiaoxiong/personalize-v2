"use client";

import { DashboardHeader } from "@/app/(dashboard)/components/dashboard-header";
import { AIGenerator } from "@/app/(dashboard)/generate/components/ai-generator";
import { RecommendationsSection } from "@/app/(dashboard)/generate/components/recommendations-section";

export default function GeneratePage() {
  return (
    <>
      <DashboardHeader />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <AIGenerator />
        <RecommendationsSection />
      </div>
    </>
  );
}

