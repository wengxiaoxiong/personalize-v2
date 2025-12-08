# Agent Kit 复用指南（模块职责、编排套路、Prompt 形态）

`modules/agent` 是一套可插拔壳，帮你把聊天、工具信号、任务执行与右侧容器解耦。目标是：换业务时只换 adapter/Prompt/右栏内容，不改底层 Hook/UI。

## 核心组件速览
- Hooks  
  - `useAgentChat`：`useChat` 的统一包装（`model/api/reset` 一致化）。  
  - `useToolSignal`：扫描消息里的 `ToolUIPart`，按工具名去重触发。  
  - `useAgentOrchestrator`：注册 `tool/pattern/manual` 三类 trigger，集中 fire 动作。  
  - `usePaneState`：维护 `visible + isDesktop`，用于 Sidecar 或 Panel 显隐。  
  - `useFileIngestion`：文件解析包装，内置类型/大小校验与进度。  
- UI  
  - `AgentConversation`：统一聊天渲染，支持 `renderers`（自定义文本卡片/选择题等）与 `toolRenderer`。  
  - `AgentSidecar`：右侧容器，仅处理可见性动画，可替换成 Tab/抽屉。  
  - `AgentPromptInput`：Prompt 输入壳，带提交/禁用态；`AgentTaskList` 可用作多任务监控。  
- Adapter 模式  
  - 在 `modules/agent/adapters/<feature>.ts` 声明工具名、关键词、payload 构造、结果解析，前后端共享。

## Persona 示例：模块如何协同
- 状态与面板  
  - `usePersonaState` 保持 `input/选项/pdf/草稿/最终结果/sidecarOpen`。  
  - `usePaneState` 只管「桌面判断 + 是否可见」；`PersonaGenerator` 每次侧栏状态变更时 `pane.toggle(persona.sidecarOpen)`，让「业务决定开关，UI Hook 负责响应式可见性」。  
  - `resetWorkflow` 同时重置聊天、生成流、面板状态，避免残留。
- 编排与触发  
  - 聊天：`useAgentChat({ api: "/api/chat", model: "deepseek/deepseek-chat" })`。  
  - 生成流：`useCompletion` 指向 `/api/personas/generate`，`onFinish` 解析 Markdown。  
  - 自动触发：`useToolSignal` 监听工具名 `finalizePersona`，一旦模型在 `/api/chat` 里调用该工具，就用 `buildPersonaPayload(messages)` 触发生成。  
  - 关键词兜底：用户输入包含 `PERSONA_GENERATE_KEYWORDS`（如“生成人设”）也会主动调 `handlePersonaGeneration`，防止工具未被命中。  
  - 文件流：`useFileIngestion` + `parsePdfToText` 解析 PDF，前缀 `PERSONA_PDF_MARKER` 注入聊天，adapter 会切换到 PDF 模式构造 payload。  
  - UI：`AgentConversation` 渲染文本 + 选择题（`createPersonaSelectionRenderer`），`ToolCallCard` 展示工具状态，`AgentSidecar` 承载 `PersonaGenerationPreview`。
- 流程顺序（对应 `app/(dashboard)/personas/components/persona-generator.tsx` 与 `modules/persona/usePersonaOrchestrator.ts`）  
  1) 用户输入或上传 PDF → 进入 chat 消息流。  
  2) 模型在 `/api/chat` 调用工具 `finalizePersona` → `useToolSignal` 捕获 → `useCompletion` 调 `/api/personas/generate`。  
  3) 生成 Markdown 流展示在 Sidecar；可随时 `stopPersona()`。  
  4) 点击保存时，用 `parsePersonaMarkdown`/`buildFallbackPersona` 兜底，并弹出表单。

## Prompting 写法（前后端一致的协议）
- 对话 Prompt（`app/api/chat/route.ts`）  
  - System 里明确「信息收集 5 维度」「优先直接推导」「不足再反问」以及 **XML 选择题格式**：  
    ```
    <选择题>
      <题目>你的问题</题目>
      <选项>选项A</选项>
      <选项>选项B</选项>
    </选择题>
    ```
  - 终点是调用工具 `finalizePersona`，其描述即“信息够就触发生成”。前端根据工具名触发 `useCompletion`。
- 生成 Prompt（`app/api/personas/generate/route.ts`）  
  - System 固定一份 Markdown 模板（Persona Card/Backstory/Pillars/Hooks/Reminders/Sample Bio），禁止表格与强调，确保可被 parser 识别。  
  - User prompt 用 adapter 整理出的 `brief/goal`：若包含 PDF，则拼接「PDF 摘要 + 用户补充」；否则把对话文本转成自然语言。  
  - 前端用 `parsePersonaResult` 解析，不可解析时用 `buildFallbackPersona` 兜底。

## 编排套路（可复用到其他业务）
- 触发策略  
  - 工具信号：优先监听工具名，保证模型「信息够就触发」。  
  - 模式匹配：用 `useAgentOrchestrator` 注册 `pattern`，例如检测「生成报告」文本后 fire 任务。  
  - 人工按钮：`useAgentOrchestrator` 的 `manual`，在 UI 按钮上调用 `fire(key)` 即可。
- UI 组合  
  - 聊天区：`AgentConversation` + 业务 renderer（如选择题、富卡片）。  
  - 工具可视化：`toolRenderer={(part) => <ToolCallCard part={part} />}`。  
  - 右栏：`AgentSidecar` / 抽屉 / Tab 内渲染预览、日志或 `AgentTaskList`。
- 文件流入  
  - `useFileIngestion({ parser, acceptTypes, maxSizeMb, onError })` 提供进度/错误；解析后的文本可作为独立 user message，以 marker 做模式切换。

### 最小可复制片段
```tsx
const chat = useAgentChat({ api: "/api/chat", model: "deepseek/deepseek-chat" });
const { completion, complete, stop, isLoading } = useCompletion({
  api: "/api/feature/generate",
  onFinish: (_p, text) => handleFinish(text ?? ""),
});

useToolSignal({
  messages: chat.messages,
  toolName: PERSONA_TOOL_NAME,
  onMatch: () => complete("", { body: buildPersonaPayload(chat.messages) }),
});

return (
  <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-4">
    <AgentConversation messages={chat.messages} status={chat.status} renderers={[customRenderer]} toolRenderer={(p) => <ToolCallCard part={p} />} />
    <AgentSidecar visible={pane.visible}>{/* 预览/监控/日志 */}</AgentSidecar>
  </div>
);
```

## 复用 Checklist
- 工具名、关键词、PDF 标记等常量全部放在 adapter 中，并确保前后端一致。  
- 业务 Prompt（System/User）写死在 API 层，前端只透传 payload；工具描述要清晰写「何时触发」。  
- 选择题等富文本格式需在 Prompt 中严格指定，前端 renderer 再解析；失败时要有 fallback。  
- Sidecar/Panel 显隐：业务状态决定开关（如 `sidecarOpen`），`usePaneState` 负责响应式动画。  
- 文件上传：明确 `acceptTypes/maxSizeMb`，解析出错时重置 input 并透出错误。  
- 停止/重置：`stop()` 终止生成，`reset` 同步清理聊天、生成结果与 UI 状态，防止脏数据。
