import { useCallback, useMemo, useState } from "react";
import { useCompletion } from "@ai-sdk/react";
import type { AgentTaskConfig, AgentTaskResult } from "../types/agent";
import type { CompletionRequestOptions } from "ai";

type UseAgentTaskOptions<T> = AgentTaskConfig<T> & {
  api?: string;
  streamProtocol?: "text" | "data";
  throttleInterval?: number;
};

export function useAgentTask<T = string>(options: UseAgentTaskOptions<T>) {
  const { api = "/api/completions", streamProtocol = "text", throttleInterval = 50, execute, onFinish, onError } =
    options;

  const [manualResult, setManualResult] = useState<AgentTaskResult<T>>({
    status: "idle",
    result: "" as unknown as T,
    error: null,
    isStreaming: false,
  });

  const completionEnabled = !execute;

  const completion = useCompletion({
    api,
    streamProtocol,
    experimental_throttle: throttleInterval,
    onFinish: (text) => {
      onFinish?.(text as unknown as T);
    },
    onError: (err) => {
      onError?.(err);
    },
  });

  const start = useCallback(
    async (input: string, options?: CompletionRequestOptions) => {
      if (completionEnabled) {
        return completion.complete(input, options);
      }

      setManualResult((prev) => ({ ...prev, status: "running", error: null }));
      try {
        const result = await execute!(options);
        setManualResult({ status: "done", result, error: null });
        onFinish?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Agent task failed");
        setManualResult((prev) => ({ ...prev, status: "error", error }));
        onError?.(error);
        throw error;
      }
    },
    [completion, completionEnabled, execute, onError, onFinish]
  );

  const stop = useCallback(() => {
    if (completionEnabled) {
      completion.stop();
    } else {
      setManualResult((prev) => ({ ...prev, status: "idle", isStreaming: false }));
    }
  }, [completion, completionEnabled]);

  const taskState: AgentTaskResult<T> = useMemo(() => {
    if (completionEnabled) {
      return {
        status: completion.isLoading ? "running" : completion.completion ? "done" : "idle",
        result: completion.completion as unknown as T,
        error: completion.error,
        isStreaming: completion.isLoading,
      };
    }
    return manualResult;
  }, [completion.completion, completion.error, completion.isLoading, completionEnabled, manualResult]);

  return {
    task: taskState,
    start,
    stop,
    setResult: completionEnabled
      ? completion.setCompletion
      : (value: T | ((prev: T) => T)) => {
          setManualResult((prev) => ({
            ...prev,
            result: typeof value === "function" ? (value as (prev: T) => T)(prev.result) : value,
          }));
        },
  };
}
