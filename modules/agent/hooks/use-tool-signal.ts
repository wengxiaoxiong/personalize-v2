import { useEffect, useRef } from "react";
import { getToolOrDynamicToolName, isToolOrDynamicToolUIPart } from "ai";
import type { ToolUIPart, UIMessage } from "ai";

type ToolSignalOptions = {
  messages: UIMessage[];
  toolName: string;
  onMatch: (part: ToolUIPart) => void | Promise<void>;
};

export function useToolSignal({ messages, toolName, onMatch }: ToolSignalOptions) {
  const processed = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const message of [...messages].reverse()) {
      if (!message.parts) continue;
      for (const part of message.parts) {
        if (!isToolOrDynamicToolUIPart(part)) continue;
        const name = getToolOrDynamicToolName(part);
        if (name !== toolName) continue;

        const anyPart = part as any;
        const state = anyPart.state ?? "unknown";

        // 使用 toolCallId + state 作为唯一键，避免输入阶段就把后续输出阶段“吃掉”
        const baseId = part.toolCallId || `${name}-${processed.current.size}`;
        const id = `${baseId}-${state}`;

        if (processed.current.has(id)) continue;
        processed.current.add(id);
        onMatch(part as ToolUIPart);
        return;
      }
    }
  }, [messages, onMatch, toolName]);
}
