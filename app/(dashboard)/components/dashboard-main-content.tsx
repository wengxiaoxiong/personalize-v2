"use client";

import { ReactNode } from "react";
import { useDashboard } from "@/components/providers/dashboard-provider";
import { cn } from "@/lib/utils";

export function DashboardMainContent({ children }: { children: ReactNode }) {
  const { sidebarCollapsed } = useDashboard();

  return (
    <main
      className={cn(
        "flex-1 p-6 transition-all duration-300",
        "ml-20",
        sidebarCollapsed ? "lg:ml-20" : "lg:ml-64",
        "lg:p-10"
      )}
    >
      {children}
    </main>
  );
}
