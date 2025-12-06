"use client";

import { DashboardHeader } from "@/app/(dashboard)/components/dashboard-header";
import { PostsSection } from "@/app/(posts)/components/posts-section";

export default function PostsPage() {
  return (
    <>
      <DashboardHeader />
      <div className="mt-6">
        <PostsSection />
      </div>
    </>
  );
}

