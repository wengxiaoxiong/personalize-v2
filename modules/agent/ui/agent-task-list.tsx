import React from "react";
import type { AgentTaskResult } from "../types/agent";
import { cn } from "@/lib/utils";

type AgentTaskListItem = {
  id: string;
  title: string;
  task: AgentTaskResult;
  onRetry?: () => void;
  onCancel?: () => void;
};

type AgentTaskListProps = {
  items: AgentTaskListItem[];
  className?: string;
};

export function AgentTaskList({ items, className }: AgentTaskListProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="font-medium">{item.title}</div>
            <div className="text-xs text-muted-foreground uppercase">{item.task.status}</div>
          </div>
          {item.task.error && <div className="text-xs text-rose-600 mt-1">{item.task.error.message}</div>}
          <div className="flex gap-2 mt-2">
            {item.onRetry && (
              <button
                type="button"
                onClick={item.onRetry}
                className="rounded border px-2 py-1 text-xs hover:bg-muted transition"
              >
                重试
              </button>
            )}
            {item.onCancel && (
              <button
                type="button"
                onClick={item.onCancel}
                className="rounded border px-2 py-1 text-xs hover:bg-muted transition"
              >
                取消
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
