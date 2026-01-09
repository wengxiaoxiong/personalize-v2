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
    <div className="flex flex-col h-[calc(100vh-80px)] lg:h-[calc(100vh-100px)] overflow-hidden">
      <PersonaPostGenerator />
    </div>
  );
}
