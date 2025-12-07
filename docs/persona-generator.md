# Persona Generator 前端拆解说明

本文件梳理了 `app/(dashboard)/personas/components` 下的人设生成页，便于后续复用到其他 Agent 场景。

## 模块拆分
- `persona-generator.tsx`：页面编排与状态管理，负责 orchestrate 聊天、上传、生成、保存的交互流。
- `persona-generator-helpers.ts`：固定问法、选择题解析、兜底人设构造。
- `persona-conversation.tsx`：聊天区渲染，支持工具调用结果卡片与选择题按钮渲染。
- `persona-pdf-upload.tsx`：PDF 上传按钮与进度显示，可独立复用。
- `persona-save-form.tsx`：人设保存表单，使用 `createPersonaAction` 直接落库。
- 现有的 `persona-generation-preview.tsx`：实时 Markdown 预览与保存入口。

## 主要交互流程
1. **初始化**：首次输入/上传后启动对话，自动下发 `QUESTIONS[0]` 作为引导。
2. **聊天与工具**：`useChat` 负责消息流；`useCompletion` 负责人设生成。检测到模型工具 `finalizePersona` 调用后触发生成。
3. **PDF 支持**：`parsePdfToText` 解析文件，消息中以 `[已上传简历/PDF]` 前缀带入上下文，并在 payload 中附带补充需求。
4. **生成预览与保存**：流式生成实时预览；完成后弹出 `PersonaSaveForm` 保存到数据库，失败时用 Markdown 兜底。
5. **重置**：`resetChat` 统一清理 `useChat`/`useCompletion` 状态、选项、多选答案、上传状态。

## 复用指引
- **聊天渲染**：直接复用 `PersonaConversation`，传入 `messages/status`、`selectedOptions` 与 `onOptionToggle`。
- **文件导入**：`PdfUploadControl` 独立于业务，可在其他 Agent 上传入口中使用同样的受控 API。
- **表单落库**：`PersonaSaveForm` 依赖的 `createPersonaAction` 返回 `ActionState`，可替换为其他 action 以适配不同的实体。
- **工具回调检测**：`persona-generator.tsx` 中的 `processedToolCallIds`/`isToolUIPart` 逻辑可抽取到其他 Agent，以在工具信号充足时自动切换到“生成/总结”阶段。

## 注意事项
- `persona-generator.tsx` 只保留编排与状态，UI 细节放在子组件，新增 Agent 时优先在子组件层扩展。
- PDF 上传大小限制为 10MB，上传失败会 alert 提示并重置 input。
- 预览面板通过 `showPreview` 控制渐隐，移动端默认单列布局。
