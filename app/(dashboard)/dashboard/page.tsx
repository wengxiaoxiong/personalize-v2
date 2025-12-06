"use client";

import { DashboardHeader } from "@/app/(dashboard)/components/dashboard-header";
import { PersonasSection } from "@/app/(dashboard)/personas/components/personas-section";
import { PostsSection } from "@/app/(dashboard)/posts/components/posts-section";
import { AIGenerator } from "@/app/(dashboard)/generate/components/ai-generator";
import { RecommendationsSection } from "@/app/(dashboard)/generate/components/recommendations-section";

export default function DashboardPage() {
  return (
    <>
      <DashboardHeader />
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        <div className="xl:col-span-8 space-y-8">
          <PersonasSection />
          <PostsSection />
        </div>
        <div className="xl:col-span-4 space-y-6">
          <AIGenerator />
          <RecommendationsSection />
        </div>
      </div>
    </>
  );
}

