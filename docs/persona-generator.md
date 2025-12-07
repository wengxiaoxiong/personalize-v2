# Persona Generator 前端拆解说明

本文件梳理了 `app/(dashboard)/personas/components` 下的人设生成页，并说明如何用新抽象的 Agent Kit (`modules/agent`) 进行复用。

## 模块拆分
- `modules/agent/*`：通用聊天/任务/侧栏能力，详见 `docs/agent-kit.md`。
- `persona-generator.tsx`：页面编排，调用 Agent Kit，提供 persona 适配配置与 UI 。
- `persona-generator-helpers.ts`：固定问法、选择题解析、兜底人设构造。
- `persona-conversation.tsx`：聊天区渲染，支持工具调用结果卡片与选择题按钮渲染。
- `persona-pdf-upload.tsx`：PDF 上传按钮与进度显示，可独立复用。
- `persona-save-form.tsx`：人设保存表单，使用 `createPersonaAction` 直接落库。
- 现有的 `persona-generation-preview.tsx`：实时 Markdown 预览与保存入口。

## 主要交互流程
1. **初始化**：首次输入/上传后启动对话，自动下发 `QUESTIONS[0]` 作为引导。
2. **聊天与工具**：`useAgentChat` 负责消息流；`useCompletion` 负责人设生成；`useToolSignal` 监听工具 `finalizePersona` 并触发生成。
3. **PDF 支持**：`parsePdfToText` 解析文件，消息中以 `[已上传简历/PDF]` 前缀带入上下文，并在 payload 中附带补充需求。
4. **生成预览与保存**：流式生成实时预览；完成后弹出 `PersonaSaveForm` 保存到数据库，失败时用 Markdown 兜底。
5. **重置**：`resetChat` 统一清理 `useChat`/`useCompletion` 状态、选项、多选答案、上传状态。

## 复用指引
- **基础能力**：优先调用 `modules/agent` 的 hooks/UI（聊天、任务、工具信号、侧栏）。  
- **聊天渲染**：用 `AgentConversation` 并通过 renderer 注入选择题/工具卡片；或直接用现有 `PersonaConversation`。  
- **文件导入**：`PdfUploadControl` + `useFileIngestion` 独立于业务，可在其他 Agent 上传入口中使用同样的受控 API。  
- **表单落库**：`PersonaSaveForm` 依赖的 `createPersonaAction` 返回 `ActionState`，可替换为其他 action 以适配不同的实体。  
- **工具回调检测**：`useToolSignal` 或 `useAgentOrchestrator` 负责处理工具触发，避免耦合在组件内部。

## 注意事项
- `persona-generator.tsx` 只保留编排与状态，UI 细节放在子组件；新增 Agent 时优先在 adapter 层实现 payload/解析/工具名。
- PDF 上传大小限制为 10MB，上传失败会 alert 提示并重置 input。
- 预览面板通过 `usePaneState` 控制可见性，移动端默认单列布局。
