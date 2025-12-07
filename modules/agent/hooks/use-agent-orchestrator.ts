import { useCallback, useEffect, useRef } from "react";
import { getToolOrDynamicToolName, isToolOrDynamicToolUIPart, type ToolUIPart } from "ai";
import type { AgentMessage, AgentTrigger } from "../types/agent";

type UseAgentOrchestratorOptions = {
  messages: AgentMessage[];
  triggers: AgentTrigger[];
};

export function useAgentOrchestrator({ messages, triggers }: UseAgentOrchestratorOptions) {
  const firedPattern = useRef<Set<string>>(new Set());

  const manualMap = useRef(
    new Map<string, AgentTrigger & { type: "manual" }>(
      triggers.filter((t): t is AgentTrigger & { type: "manual" } => t.type === "manual").map((t) => [t.key, t])
    )
  );

  useEffect(() => {
    manualMap.current = new Map(
      triggers.filter((t): t is AgentTrigger & { type: "manual" } => t.type === "manual").map((t) => [t.key, t])
    );
  }, [triggers]);

  useEffect(() => {
    triggers
      .filter((t): t is AgentTrigger & { type: "pattern" } => t.type === "pattern")
      .forEach((trigger, idx) => {
        const key = `${trigger.match.toString()}-${idx}`;
        if (trigger.once && firedPattern.current.has(key)) return;
        const matched = messages.some(trigger.match);
        if (matched) {
          trigger.onTrigger(messages[messages.length - 1]);
          if (trigger.once) firedPattern.current.add(key);
        }
      });
  }, [messages, triggers]);

  const processedTools = useRef<Set<string>>(new Set());

  useEffect(() => {
    const toolTriggers = triggers.filter((t): t is AgentTrigger & { type: "tool" } => t.type === "tool");
    if (!toolTriggers.length) return;

    for (const message of [...messages].reverse()) {
      if (!message.parts) continue;
      for (const part of message.parts) {
        if (!isToolOrDynamicToolUIPart(part)) continue;
        const toolName = getToolOrDynamicToolName(part);
        const matching = toolTriggers.filter((trigger) => trigger.toolName === toolName);
        if (!matching.length) continue;
        const toolCallId = (part as ToolUIPart).toolCallId || `${toolName}-${processedTools.current.size}`;
        if (processedTools.current.has(toolCallId)) continue;
        processedTools.current.add(toolCallId);
        matching.forEach((trigger) => trigger.onTrigger(part as ToolUIPart));
        return;
      }
    }
  }, [messages, triggers]);

  const fire = useCallback((key: string) => {
    const manual = manualMap.current.get(key);
    if (!manual) return;
    manual.onTrigger();
  }, []);

  return {
    fire,
  };
}
