import { cn } from "@/lib/utils";
import React from "react";

type AgentSidecarProps = {
  visible: boolean;
  children: React.ReactNode;
  className?: string;
};

export function AgentSidecar({ visible, children, className }: AgentSidecarProps) {
  return (
    <div
      className={cn(
        "transition-opacity duration-500 ease-in-out",
        visible ? "opacity-100" : "opacity-0 pointer-events-none",
        className
      )}
    >
      {children}
    </div>
  );
}
