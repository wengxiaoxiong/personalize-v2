"use client";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { MaterialForm } from "@/components/dashboard/material-form";

export default function MaterialsPage() {
  const displayName = "TechMaster";

  return (
    <>
      <DashboardHeader displayName={displayName} />
      <div className="max-w-2xl">
        <MaterialForm />
      </div>
    </>
  );
}

