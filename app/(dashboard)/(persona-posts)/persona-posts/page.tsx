"use client";

/**
 * Persona Post Generator Page
 *
 * 帖子生成Agent页面
 */

import { DashboardHeader } from "@/app/(dashboard)/components/dashboard-header";
import { PersonaPostGenerator } from "../components/persona-post-generator";

export default function PersonaPostsPage() {
  return (
    <>
      <DashboardHeader />
      <div className="space-y-6 mt-6">
        <PersonaPostGenerator />
      </div>
    </>
  );
}
