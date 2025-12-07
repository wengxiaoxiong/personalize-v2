import { getToolName, type ToolUIPart } from "ai";

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
    <div className="space-y-2 rounded-lg border bg-background/70 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">工具调用：{toolName}</span>
          {part.providerExecuted && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              已由模型执行
            </span>
          )}
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${statusMeta.className}`}
        >
          {statusMeta.label}
        </span>
      </div>

      {hasInput && (
        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">参数</p>
          <pre className="whitespace-pre-wrap rounded-md bg-muted/60 p-2 text-[11px] leading-5">
            {formatToolValue(input)}
          </pre>
        </div>
      )}

      {hasOutput && (
        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">返回</p>
          <pre className="whitespace-pre-wrap rounded-md bg-muted/60 p-2 text-[11px] leading-5">
            {formatToolValue(output)}
          </pre>
        </div>
      )}

      {errorText && <p className="text-xs text-rose-600">错误：{errorText}</p>}
    </div>
  );
}
