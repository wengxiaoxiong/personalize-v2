# Agent Kit 最佳实践（可复用、可扩展、可监控）

`modules/agent` 提供一套可插拔的 Agent 壳，解耦聊天、触发器、任务执行与右侧容器。目标：换业务只换配置，不动底层代码。

## 模块概览
- Hooks：  
  - `useAgentChat`：`useChat` 的轻包装，统一 `model/api/reset`。  
  - `useAgentTask`：包装 `useCompletion` 或任意自定义 async 任务，提供 `start/stop/setResult/task.status`.  
  - `useToolSignal`：监听工具 UI Part 并去重，触发回调。  
  - `useAgentOrchestrator`：基于 trigger/action 的轻量编排，支持 `tool/pattern/manual`。  
  - `usePaneState`：侧栏可见性与桌面判断。  
  - `useFileIngestion`：通用文件解析器包装，处理大小/类型/进度。
- UI：  
  - `AgentConversation`：消息渲染，支持自定义 `renderers`（文本卡片/选择题等）与 `toolRenderer`。  
  - `AgentSidecar`：右栏容器，纯可见性控制。  
  - `AgentTaskList`：简单任务状态面板，可做 multi-agent monitor.
- Adapters 示例：`modules/agent/adapters/persona.ts` 封装了 payload 构造、工具名、结果解析。

## 快速上手（新业务）
1) 聊天流：`const chat = useAgentChat({ api: "/api/chat", model: "xxx" })`。  
2) 任务：`const personaTask = useAgentTask({ api: "/api/your-endpoint", onFinish, onError })`。  
3) 触发：`useToolSignal({ messages: chat.messages, toolName: "finalizeX", onMatch: () => personaTask.start("", { body }) })`；或用 `useAgentOrchestrator` 配置多条 trigger。  
4) UI：用 `AgentConversation` 渲染消息，注入业务专属 renderer（如选择题/富卡片）；用 `AgentSidecar` 放预览/日志/检索结果。  
5) 上传解析：`useFileIngestion({ parser, acceptTypes, maxSizeMb })`，将解析后的文本追加到 chat。

### 参考代码（最小组合）
```tsx
const chat = useAgentChat({ api: "/api/chat", model: "deepseek/deepseek-chat" });
const task = useAgentTask({ api: "/api/agents/generate", onFinish: handleFinish });

useToolSignal({
  messages: chat.messages,
  toolName: "finalizeSomething",
  onMatch: () => task.start("", { body: buildPayload(chat.messages) }),
});

return (
  <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-4">
    <AgentConversation messages={chat.messages} status={chat.status} renderers={[customRenderer]} toolRenderer={toolRenderer} />
    <AgentSidecar visible={true}>{/* Preview/Monitor/Logs */}</AgentSidecar>
  </div>
);
```

## 扩展与监控
- Multi-agent：用 `useAgentOrchestrator` 注册多条 trigger→action，或在 `AgentSidecar` 内渲染 `AgentTaskList` 展示多个任务状态、重试/取消入口。  
- 右栏可插拔：`AgentSidecar` 只做容器，可换成 Tab/抽屉/底部浮层，内容可以是 completion 预览、检索结果、日志、队列监控。  
- 触发多样：不仅限于 completion，可绑定按钮、模式匹配、文件上传完成事件、外部状态变化。

## Persona 作为示例
- Persona 页面现在用 Agent Kit 组装：  
  - 聊天：`useAgentChat` (`/api/chat` + deepseek 模型)。  
  - 生成：`useAgentTask` (`/api/personas/generate`)，工具信号 `finalizePersona` 触发。  
  - 上传：`useFileIngestion` + `parsePdfToText`，结果注入 chat。  
  - UI：`AgentConversation` + Persona 的选择题 renderer，`AgentSidecar` 承载预览。  
  - 适配层：`modules/agent/adapters/persona.ts` 封装 payload/解析器/关键词。
- 其他业务复制 persona 组装方式，只需替换 adapter（payload/工具名/结果解析）与右栏内容。
