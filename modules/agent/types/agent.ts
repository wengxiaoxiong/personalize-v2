// agent.ts
import type React from "react";
import type { UIMessage, UIMessagePart, ToolUIPart, UIDataTypes } from "ai";

// 重新导出 UIMessage，方便其他模块使用
export type { UIMessage };

export type AgentMessage = UIMessage;

// FIX: 使用 UIDataTypes 满足类型约束，表示我们接受任意结构的 Tool 参数
export type AgentPart = UIMessagePart<UIDataTypes, never>;

export type AgentStatus = "idle" | "submitting" | "streaming";

export type AgentTaskStatus = "idle" | "running" | "done" | "error";

export type AgentTaskResult<T = string> = {
  status: AgentTaskStatus;
  result: T;
  error?: Error | null;
  isStreaming?: boolean;
};

export type AgentTaskConfig<T = string> = {
  /** Default strategy is completion; if provided, use custom executor */
  // FIX: 显式声明 payload 为 unknown
  execute?: (payload?: unknown) => Promise<T>;
  onFinish?: (result: T) => void;
  onError?: (error: Error) => void;
};

export type AgentToolTrigger = {
  type: "tool";
  toolName: string;
  // FIX: 使用具体的 ToolUIPart 类型（通常不需要泛型，或者使用 unknown）
  onTrigger: (part: ToolUIPart) => void | Promise<void>;
};

export type AgentPatternTrigger = {
  type: "pattern";
  match: (message: AgentMessage) => boolean;
  onTrigger: (message: AgentMessage) => void | Promise<void>;
  once?: boolean;
};

export type AgentManualTrigger = {
  type: "manual";
  key: string;
  onTrigger: () => void | Promise<void>;
};

export type AgentTrigger = AgentToolTrigger | AgentPatternTrigger | AgentManualTrigger;

export type AgentPartRenderer = (params: {
  part: AgentPart;
  message: AgentMessage;
  index: number;
}) => React.ReactNode | null;