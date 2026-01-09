# Project Guidelines for Claude

## 项目概述
这是一个基于 Next.js 的内容创作平台,专注于人设(Persona)驱动的社交媒体帖子生成。用户可以创建和管理多个人设,结合知识库和 AI 技术生成符合人设风格的社交媒体内容。

## Tech Stack
- **Next.js**: 15.4.10 (App Router)
- **TypeScript**: 5.x (strict mode)
- **React**: 19.1.0
- **Database**: PostgreSQL + Prisma ORM
- **UI**: Tailwind CSS 4 + shadcn/ui components
- **AI**: Vercel AI SDK 5.x + DeepSeek
- **Storage**: Vercel Blob / Volcengine TOS
- **Validation**: Zod 4.x

## Communication Patterns

### Server Actions vs API Routes
- **Server Actions**: 用于所有服务端数据变更和数据获取(除非需要流式传输)
  - 位置: `app/actions/*.ts`
  - 必须以 `"use server"` 开头
  - 使用 Zod 进行参数验证
  - 返回统一的 `ActionState` 类型或具体数据类型

- **API Routes**: 仅用于需要流式传输的场景
  - 位置: `app/api/**/route.ts`
  - 主要用于 LLM 流式对话响应
  - 使用 Vercel AI SDK 的 `streamText()` 返回流式响应

### Vercel AI SDK 使用规范
- **useChat()**: 用于聊天界面
  - 参考: https://sdk.vercel.ai/docs/api-reference/use-chat
  - 使用 `useAgentChat` 封装 (modules/agent/hooks/use-agent-chat.ts)

- **useCompletion()**: 用于单次完成
  - 参考: https://sdk.vercel.ai/docs/api-reference/use-completion

- **streamText()**: 用于服务端流式生成
  - 在 API route 中使用
  - 使用 `tool()` 定义工具调用
  - 使用 `toUIMessageStreamResponse()` 返回响应

## UI Guidelines
- **shadcn/ui**: 默认使用 shadcn/ui 组件(button, form, card, dialog, table 等)
- **扩展原则**: 需要时扩展 shadcn 组件,不要创建基础组件
- **样式**: 使用 Tailwind CSS,禁止使用 CSS modules 或 styled-components
- **组件库**: 使用 lucide-react 图标库

## Project Structure

```
.
├── app/                        # Next.js App Router
│   ├── (landing)/             # 落地页路由组(公开页面)
│   │   ├── login/             # 登录页面
│   │   ├── register/          # 注册页面
│   │   └── page.tsx           # 首页
│   ├── (dashboard)/           # 仪表板路由组(需认证)
│   │   ├── dashboard/         # 主仪表板
│   │   ├── personas/          # 人设管理
│   │   └── persona-posts/     # 帖子管理
│   ├── actions/               # Server Actions
│   │   ├── auth.ts            # 认证相关
│   │   ├── persona.ts         # 人设 CRUD
│   │   ├── persona-post.ts    # 帖子 CRUD
│   │   ├── project.ts         # 项目(知识库)管理
│   │   ├── project-asset.ts   # 资产文件管理
│   │   ├── knowledge-base.ts  # 知识库处理
│   │   ├── tos.ts             # 文件上传(TOS)
│   │   ├── utils.ts           # 工具函数
│   │   ├── types.ts           # 共享类型定义
│   │   └── index.ts           # 导出入口
│   ├── api/                   # API Routes(仅用于流式传输)
│   │   ├── persona-post-agent/     # 帖子生成 Agent
│   │   ├── personas-agent/         # 人设生成 Agent
│   │   └── ...
│   └── components/            # 共享 UI 组件
├── modules/                   # 业务模块(可复用的领域逻辑)
│   ├── agent/                 # Agent 框架核心
│   │   ├── hooks/             # Agent hooks
│   │   ├── types/             # Agent 类型定义
│   │   └── adapters/          # 领域适配器
│   ├── persona/               # 人设领域模块
│   │   ├── usePersonaState.ts
│   │   └── usePersonaOrchestrator.ts
│   └── persona-post/          # 帖子领域模块
│       ├── usePersonaPostState.ts
│       └── usePersonaPostOrchestrator.ts
├── lib/                       # 工具库
│   ├── db.ts                  # Prisma 客户端
│   ├── generated/             # Prisma 生成的文件
│   └── persona-parser.ts      # 人设解析器
├── prisma/
│   └── schema.prisma          # 数据库模型定义
└── components/                # shadcn/ui 组件
    └── ui/                    # UI 基础组件
```

## TypeScript 模块规范

### 1. 文件组织原则

#### 按功能分层
```
types.ts          # 类型定义(导出所有类型)
index.ts          # 模块导出入口(导出所有公共API)
utils.ts          # 工具函数
hooks.ts          # React Hooks (如果有多个)
[feature].ts      # 具体功能实现
```

#### 按领域划分 (modules/)
```
modules/
├── [domain]/              # 领域目录
│   ├── types/            # 领域类型
│   │   └── [domain].ts
│   ├── hooks/            # 领域 hooks
│   │   ├── use[Domain]State.ts
│   │   └── use[Domain]Orchestrator.ts
│   ├── utils.ts          # 领域工具函数
│   └── index.ts          # 领域导出
```

### 2. 类型定义规范

#### 使用 type vs interface
```typescript
// ✅ 使用 type 定义:
// - 联合类型
// - 交叉类型
// - 映射类型
// - 函数类型
type Status = 'idle' | 'loading' | 'success' | 'error';
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// ✅ 使用 interface 定义:
// - 对象结构
// - 需要扩展的类型
// - 类定义
interface User {
  id: string;
  name: string;
  email: string;
}

interface Admin extends User {
  permissions: string[];
}
```

#### 类型导出规范
```typescript
// types.ts
// ✅ 统一导出所有类型,便于导入
export type { Persona, PersonaCreateInput, PersonaUpdateInput };

// ✅ 使用命名空间避免冲突
export namespace Persona {
  export type CreateInput = { ... };
  export type UpdateInput = { ... };
  export type ViewData = { ... };
}
```

#### 泛型使用规范
```typescript
// ✅ 明确泛型约束
type DataResult<T> = {
  data: T;
  success: true;
};

type ErrorResult = {
  error: string;
  success: false;
};

type Result<T> = DataResult<T> | ErrorResult;

// ✅ 泛型默认值
type PaginatedResult<T = unknown> = {
  items: T[];
  total: number;
  page: number;
};
```

### 3. Server Actions 规范

#### 定义模板
```typescript
"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "./utils";
import type { ActionState } from "./types";

// 1. 定义输入 Schema
const createPersonaSchema = z.object({
  name: z.string().min(2, "名称至少2个字符"),
  domain: z.array(z.string()).min(1, "至少需要一个领域标签"),
  // ... 其他字段
});

// 2. 定义 Action 函数
export async function createPersona(
  input: unknown
): Promise<ActionState & { data?: { id: string } }> {
  // 3. 验证用户身份
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "未登录" };
  }

  // 4. 验证输入
  const result = createPersonaSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, message: result.error.errors[0].message };
  }

  // 5. 业务逻辑
  try {
    const persona = await prisma.persona.create({
      data: {
        userId: user.id,
        ...result.data,
      },
    });

    // 6. 返回成功结果
    return {
      ok: true,
      message: "创建成功",
      data: { id: persona.id },
    };
  } catch (error) {
    console.error("Create persona error:", error);
    return { ok: false, message: "创建失败" };
  }
}
```

#### 返回类型规范
```typescript
// 基础返回类型
export type ActionState = {
  ok: boolean;
  message: string;
};

// 带数据的返回类型
export type ActionResult<T> = ActionState & {
  data?: T;
};

// 使用示例
async function getPersona(id: string): Promise<ActionResult<Persona>> {
  return { ok: true, message: "获取成功", data: persona };
}
```

### 4. API Routes (Streaming) 规范

#### 流式响应模板
```typescript
import { streamText, tool } from "ai";
import { deepseek } from "@ai-sdk/deepseek";
import { z } from "zod";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // 1. 验证用户身份
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. 解析请求
    const payload = await req.json() as {
      messages?: unknown;
      // ... 其他参数
    };

    // 3. 验证和转换
    const messages: UIMessage[] = Array.isArray(payload?.messages)
      ? payload.messages as UIMessage[]
      : [];

    // 4. 构建系统提示
    const systemPrompt = buildSystemPrompt(/* params */);

    // 5. 流式生成
    const result = streamText({
      model: deepseek("deepseek-chat"),
      system: systemPrompt,
      messages: convertToModelMessages(messages),
      tools: {
        // 定义工具
        toolName: tool({
          description: "工具描述",
          inputSchema: z.object({
            param1: z.string().describe("参数说明"),
          }),
          execute: async ({ param1 }) => {
            // 工具执行逻辑
            return { success: true, data: param1 };
          },
        }),
      },
      stopWhen: stepCountIs(6),
    });

    // 6. 返回流式响应
    return result.toUIMessageStreamResponse({
      sendSources: false,
      sendReasoning: false,
    });
  } catch (error) {
    console.error("[API Route] error:", error);
    return NextResponse.json(
      { success: false, error: "处理失败" },
      { status: 500 }
    );
  }
}
```

### 5. Modules/Agent 框架规范

#### Adapter Pattern (适配器模式)
```typescript
// modules/agent/adapters/persona-post.ts

// 1. 定义领域常量
export const PERSONA_POST_CONSTANTS = {
  MAX_STEPS: 6,
  DEFAULT_LIMIT: 10,
} as const;

// 2. 定义领域类型
export type PersonaPostPayload = {
  personaId: string;
  projectId?: string;
  content: string;
};

export type PersonaPostResult = {
  title: string;
  content: string;
  tags: string[];
};

// 3. 实现 Adapter
export const personaPostAdapter = {
  // 转换输入
  transformInput(payload: unknown): PersonaPostPayload {
    // 验证和转换逻辑
    return { ... } as PersonaPostPayload;
  },

  // 转换输出
  transformResult(raw: unknown): PersonaPostResult {
    // 解析和转换逻辑
    return { ... } as PersonaPostResult;
  },

  // 验证规则
  validate(payload: PersonaPostPayload): boolean {
    return !!payload.personaId && !!payload.content;
  },
};
```

#### Hooks 规范
```typescript
// modules/persona-post/usePersonaPostState.ts

import { create } from 'zustand';

// 1. 定义 State 类型
export type PersonaPostState = {
  // 数据
  posts: PersonaPost[];
  currentPost: PersonaPost | null;

  // UI 状态
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;

  // 操作方法
  fetchPosts: () => Promise<void>;
  createPost: (data: PersonaPostCreateInput) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
};

// 2. 实现 Hook
export const usePersonaPostState = create<PersonaPostState>((set, get) => ({
  // 初始状态
  posts: [],
  currentPost: null,
  status: 'idle',
  error: null,

  // 实现方法
  fetchPosts: async () => {
    set({ status: 'loading', error: null });
    try {
      const posts = await getPersonaPosts();
      set({ posts, status: 'success' });
    } catch (error) {
      set({ status: 'error', error: error.message });
    }
  },

  // ... 其他方法
}));
```

### 6. Prisma 使用规范

#### 查询规范
```typescript
// ✅ 使用 findFirst + userId 验证权限
const persona = await prisma.persona.findFirst({
  where: {
    id: personaId,
    userId: user.id, // 必须验证用户权限
  },
  select: {
    id: true,
    name: true,
    // 只选择需要的字段
  },
});

// ✅ 使用事务处理复杂操作
await prisma.$transaction(async (tx) => {
  const persona = await tx.persona.create({ ... });
  await tx.personaPost.create({ ... });
});
```

#### JSON 字段处理
```typescript
// ✅ 定义 JSON 字段类型
type Metadata = {
  tags?: string[];
  platform?: string;
  images?: string[];
};

// ✅ 安全访问 JSON 字段
const persona = await prisma.persona.findFirst({ ... });
const metadata = persona?.metadata as Metadata | null;
const tags = metadata?.tags || [];

// ✅ 更新 JSON 字段
await prisma.persona.update({
  where: { id },
  data: {
    metadata: {
      ...(persona.metadata as Record<string, unknown> | null || {}),
      tags: ['new', 'tags'],
    },
  },
});
```

### 7. React Hooks 规范

#### 自定义 Hook 模板
```typescript
// hooks/use-persona-form.ts

import { useState, useCallback } from 'react';

export function usePersonaForm(initialState: PersonaFormState) {
  const [state, setState] = useState<PersonaFormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = useCallback((field: string, value: unknown) => {
    setState((prev) => ({ ...prev, [field]: value }));
    // 清除该字段的错误
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!state.name) newErrors.name = '名称不能为空';
    if (state.domain.length === 0) newErrors.domain = '至少需要一个领域标签';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [state]);

  const submit = useCallback(async () => {
    if (!validate()) return false;

    setIsSubmitting(true);
    try {
      await createPersona(state);
      return true;
    } catch (error) {
      setErrors({ submit: error.message });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [state, validate]);

  return {
    state,
    errors,
    isSubmitting,
    updateField,
    submit,
  };
}
```

### 8. 组件规范

#### Server Components (默认)
```typescript
// ✅ 默认使用 Server Component
// ✅ async 函数用于数据获取
async function PersonaList() {
  const personas = await getPersonas();

  return (
    <div>
      {personas.map((persona) => (
        <PersonaCard key={persona.id} persona={persona} />
      ))}
    </div>
  );
}
```

#### Client Components
```typescript
"use client";

// ✅ 仅在需要交互时使用 "use client"
import { useState } from 'react';

export function PersonaForm() {
  const [value, setValue] = useState('');

  return <input value={value} onChange={(e) => setValue(e.target.value)} />;
}
```

### 9. 错误处理规范

#### Server Actions
```typescript
try {
  // 业务逻辑
} catch (error) {
  console.error("[Action Name] error:", error);

  // 返回用户友好的错误信息
  return {
    ok: false,
    message: error instanceof Error ? error.message : "操作失败",
  };
}
```

#### API Routes
```typescript
try {
  // 业务逻辑
} catch (error) {
  console.error("[API Route] error:", error);
  return NextResponse.json(
    { success: false, error: "处理失败" },
    { status: 500 }
  );
}
```

### 10. 命名规范

#### 文件命名
```
// ✅ kebab-case for files
use-persona-state.ts
persona-form.tsx
persona-post-adapter.ts

// ❌ 避免
usePersonaState.ts
PersonaForm.tsx
```

#### 变量命名
```typescript
// ✅ camelCase for variables and functions
const personaList = [];
function getPersonaById() {}

// ✅ PascalCase for types, interfaces, enums
type PersonaState = {}
interface PersonaCreateInput {}
enum SubscriptionPlan {}

// ✅ UPPER_CASE for constants
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = '...';

// ✅ Prefix for boolean
const isLoading = true;
const hasPermission = false;
const canEdit = true;

// ✅ Prefix for handlers
const handleSubmit = () => {}
const onPersonaChange = () => {}
```

## 最佳实践

### 性能优化
1. **数据库查询**
   - 只选择需要的字段 (`select`)
   - 使用索引字段查询
   - 批量查询使用 `findMany` 而不是循环查询

2. **React 渲染**
   - 使用 `useMemo` 缓存计算结果
   - 使用 `useCallback` 缓存回调函数
   - 大列表使用虚拟滚动

3. **Server Actions**
   - 使用 `revalidatePath` 更新缓存
   - 避免在循环中调用 Action

### 安全性
1. **认证和授权**
   - 所有 Server Actions 必须验证用户身份
   - 数据库查询必须包含 `userId` 验证

2. **输入验证**
   - 使用 Zod 验证所有外部输入
   - 不要信任客户端数据

3. **敏感信息**
   - 不要在前端暴露 API 密钥
   - 使用环境变量管理配置

### 代码质量
1. **类型安全**
   - 避免使用 `any`,优先使用 `unknown`
   - 为所有函数定义返回类型
   - 使用类型断言时添加注释说明原因

2. **错误处理**
   - 所有异步操作必须 try-catch
   - 记录详细的错误日志
   - 向用户返回友好的错误信息

3. **代码注释**
   - 复杂逻辑必须添加注释
   - 公共 API 必须添加 JSDoc 注释
   - TODO 注释格式: `// TODO: [description]`

## Agent 框架使用指南

项目包含一个模块化的 Agent 框架 (modules/agent),用于快速构建对话式 AI 应用。

### 核心概念

1. **Types**: 定义共享接口
2. **Hooks**: 实现业务逻辑
3. **Adapters**: 适配领域逻辑
4. **Components**: 可复用的 UI 组件

### 快速开始

```typescript
// 1. 创建领域适配器
// modules/my-domain/adapters/my-domain.ts
export const myDomainAdapter = {
  transformInput(payload: unknown) { ... },
  transformResult(result: unknown) { ... },
};

// 2. 创建领域 Hook
// modules/my-domain/useMyDomainOrchestrator.ts
export function useMyDomainOrchestrator() {
  const chat = useAgentChat({ api: '/api/my-domain-agent' });
  const orchestrator = useAgentOrchestrator({
    triggers: [ ... ],
  });

  return { chat, orchestrator };
}

// 3. 在组件中使用
function MyDomainChat() {
  const { chat, orchestrator } = useMyDomainOrchestrator();

  return <AgentConversation messages={chat.messages} />;
}
```

### 可用 Hooks

- `useAgentChat`: 处理流式对话
- `useAgentOrchestrator`: 管理事件触发器
- `useToolSignal`: 监听工具调用
- `useFileIngestion`: 处理文件上传
- `usePaneState`: 管理多面板状态

### 适配器示例

参考现有适配器:
- `modules/agent/adapters/persona.ts`: 人设生成适配器
- `modules/agent/adapters/persona-post.ts`: 帖子生成适配器
