import { deepseek } from "@ai-sdk/deepseek";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";

export const maxDuration = 30;

// 工具定义保持不变
const tools = {
  finalizePersona: tool({
    description:
      "当信息已足够生成人设时调用。汇总用户提供的信息，让前端触发 /api/personas/generate。",
    inputSchema: z.object({
      reason: z.string().describe("为什么认为信息足够，简要中文说明"),
      summary: z.string().describe("整合后的用户需求要点，方便后续生成人设"),
    }),
    execute: async ({ summary }) => {
      return `已触发人设生成：${summary.slice(0, 200)}`;
    },
  }),
};

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const messages: UIMessage[] = payload?.messages ?? [];

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, error: "无效的消息格式" },
        { status: 400 }
      );
    }

    // 核心修改在这里：完全重写 System Prompt
    const systemPrompt = `你是人设构建专家。你的任务是构建一个社交媒体账号的人设（Persona）。
你需要集齐以下 5 个维度的信息才能调用 finalizePersona：
1. 账号类型（个人/品牌）
2. 主体特征（性别/职业/生活风格）
3. 目标受众（画像/年龄/地域）
4. 内容领域（赛道/话题）
5. 平台与互动需求

**最高优先级指令：**
1. **先分析，不废话**：仔细阅读用户输入的任何文本、JSON 数据或代码。
2. **自动推导**：
   - 如果用户提供了 JSON (如 feed/userInfo)，**必须**从中直接提取昵称、性别、内容风格（如“摄影/探店”）、地域（如“上海/苏州”）。
   - **绝对不要**反问你已经能从数据中看出来的问题。
   - 例如：看到 "userInfo" 里有 "nickname"，就不要问"你是个人还是公司"；看到帖子全是摄影，就不要问"你做什么领域"。
3. **查漏补缺**：只询问你无法确定的信息。
4. **主动确认**：如果数据很丰富，你可以直接说：“我分析了你的数据，这是一个[上海的男性摄影师个人号]，主要内容是[城市风光与探店]，风格偏[文艺/美学]。我们需要补充一下[目标受众]和[变现/互动目标]，对吗？”
5. 当信息集齐（或推导出的置信度足够高）时，**立即**调用 finalizePersona 工具。

请用口语化、专业且聪明的语气对话。不要机械列出问题清单。

【反问/补充信息的呈现方式】
- 当确实需要向用户确认或补充信息时，请用“文本+XML 多选题”组合来反问。先用 1-2 句口语化说明提问缘由，然后追加 XML，不要包裹 Markdown。
- XML 模板：
<选择题>
<题目>你的问题...</题目>
<选项>选项 A</选项>
<选项>选项 B</选项>
<选项>选项 C</选项>
</选择题>
- 题目要简洁，选项用简短短语，避免编号、括号或 Markdown。`;

    const result = streamText({
      model: deepseek("deepseek-chat"),
      system: systemPrompt,
      messages: convertToModelMessages(messages),
      tools,
      stopWhen: stepCountIs(6),
    });

    return result.toUIMessageStreamResponse({
      sendSources: false,
      sendReasoning: false,
    });
  } catch (error) {
    console.error("[Chat API] error:", error);
    return NextResponse.json(
      { success: false, error: "对话失败" },
      { status: 500 }
    );
  }
}
