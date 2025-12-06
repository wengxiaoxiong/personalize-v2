"use client";

import React from "react";
import { useDashboard } from "@/components/providers/dashboard-provider";

export function DashboardHeader() {
  const { user } = useDashboard();
  const displayName = user?.username || user?.email?.split("@")[0] || "用户";

  return (
    <header className="mb-8 flex items-center justify-between">
    </header>
  );
}

