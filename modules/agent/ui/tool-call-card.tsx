import { getToolName, type ToolUIPart } from "ai";
import { PosterToolRenderer } from "./poster-tool-renderer";

type ToolState = ToolUIPart["state"];

function getToolStatusMeta(state: ToolState) {
  switch (state) {
    case "input-streaming":
      return { label: "正在整理参数", className: "border-amber-200 bg-amber-50 text-amber-700" };
    case "input-available":
      return { label: "即将触发", className: "border-sky-200 bg-sky-50 text-sky-700" };
    case "output-available":
      return { label: "执行完成", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
    case "output-error":
      return { label: "执行失败", className: "border-rose-200 bg-rose-50 text-rose-700" };
    default:
      return { label: "处理中", className: "border-muted bg-muted/70 text-foreground" };
  }
}

function formatToolValue(value: unknown) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function ToolCallCard({ part }: { part: ToolUIPart }) {
  const toolName = getToolName(part);
  const statusMeta = getToolStatusMeta(part.state);
  const output = "output" in part ? part.output : undefined;
  const input = "input" in part ? part.input : undefined;
  const errorText = "errorText" in part ? part.errorText : undefined;
  const hasInput = input !== undefined && input !== null;
  const hasOutput = output !== undefined && output !== null;

  return (
    <div className="rounded-lg border bg-background/50 p-2 shadow-sm my-1">
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-muted-foreground">工具：{toolName}</span>
          {part.providerExecuted && (
            <span className="rounded-full bg-muted/50 px-1.5 py-0.5 text-[9px] text-muted-foreground/70">
              模型执行
            </span>
          )}
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] ${statusMeta.className}`}
        >
          {statusMeta.label}
        </span>
      </div>

      {(hasInput || hasOutput || errorText) && (
        <div className="mt-1.5 space-y-1">
          {hasInput && (
            <div className="text-[10px]">
              <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-1.5 text-[10px] leading-4 text-muted-foreground">
                {formatToolValue(input)}
              </pre>
            </div>
          )}

          {hasOutput && (
            <div className="text-[10px]">
              {toolName === "generatePoster" ? (
                <PosterToolRenderer part={part} />
              ) : (
                <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-1.5 text-[10px] leading-4 text-emerald-700/80 dark:text-emerald-400/80">
                  {formatToolValue(output)}
                </pre>
              )}
            </div>
          )}

          {errorText && <p className="text-[10px] text-rose-600/80 p-1">错误：{errorText}</p>}
        </div>
      )}
    </div>
  );
}
