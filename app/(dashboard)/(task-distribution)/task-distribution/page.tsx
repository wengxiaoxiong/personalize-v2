"use client";

import { DashboardHeader } from "@/app/(dashboard)/components/dashboard-header";
import { TaskBatchSection } from "../components/task-batch-section";
import { TaskBatchUpload } from "../components/task-batch-upload";

export default function TaskDistributionPage() {
  return (
    <>
      <DashboardHeader />
      <div className="space-y-6 mt-6">
        <TaskBatchUpload />
        <TaskBatchSection />
      </div>
    </>
  );
}

