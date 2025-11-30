"use client";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { PersonasSection } from "@/components/dashboard/personas-section";
import { PostsSection } from "@/components/dashboard/posts-section";
import { MaterialForm } from "@/components/dashboard/material-form";
import { AIGenerator } from "@/components/dashboard/ai-generator";
import { RecommendationsSection } from "@/components/dashboard/recommendations-section";

export default function DashboardPage() {
  const displayName = "TechMaster";

  return (
    <>
      <DashboardHeader displayName={displayName} />
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        <div className="xl:col-span-8 space-y-8">
          <PersonasSection />
          <PostsSection />
        </div>
        <div className="xl:col-span-4 space-y-6">
          <MaterialForm />
          <AIGenerator />
          <RecommendationsSection />
        </div>
      </div>
    </>
  );
}
