import type React from "react";
import type { UIMessage, UIMessagePart, ToolUIPart } from "ai";

export type AgentMessage = UIMessage;
export type AgentPart = UIMessagePart<any, any>;

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
  execute?: (payload?: unknown) => Promise<T>;
  onFinish?: (result: T) => void;
  onError?: (error: Error) => void;
};

export type AgentToolTrigger = {
  type: "tool";
  toolName: string;
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
