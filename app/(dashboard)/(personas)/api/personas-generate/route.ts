
import { deepseek } from "@ai-sdk/deepseek";
import { ModelMessage, streamText } from "ai"; // 1. 引入标准类型
import { NextResponse } from "next/server";

export const maxDuration = 30;

// 定义 Payload 接口
interface GeneratePayload {
  messages?: ModelMessage[];
  brief?: string;
  goal?: string;
}

export async function POST(req: Request) {
  try {
    let payload: GeneratePayload; // 2. 显式声明类型
    try {
      payload = await req.json();
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return NextResponse.json(
        { success: false, error: "请求体格式错误" },
        { status: 400 }
      );
    }

    const { messages, brief, goal } = payload || {};

    let finalBrief = "";
    let finalGoal = "";

    // 模式 2：直接传入 brief
    if (brief && typeof brief === "string" && brief.trim().length > 0) {
      finalBrief = brief.trim();
      finalGoal = goal && typeof goal === "string" 
        ? goal.trim() 
        : "基于上传的PDF内容，生成一个可直接用于  dashboard 的人设模板，并突出互动性。";
    } 
    // 模式 1：从对话历史中提取
    else if (messages && Array.isArray(messages) && messages.length > 0) {
      
      const userAnswers = messages
        // 3. 使用 Type Guard 过滤并收窄类型为 CoreUserMessage
        .filter((msg): msg is ModelMessage => msg.role === "user")
        .map((msg) => {
          // SDK v5 标准：content 可能是字符串，也可能是 Part 数组
          if (typeof msg.content === "string") {
            return msg.content.trim();
          }
          // 处理 Multimodal (多模态) 数组结构
          if (Array.isArray(msg.content)) {
            return msg.content
              .filter((part) => part.type === "text") // TS 自动推断 part 为 TextPart
              .map((part) => part.text)
              .join("")
              .trim();
          }
          return "";
        })
        .filter((text) => text.length > 0);

      if (userAnswers.length === 0) {
        return NextResponse.json(
          { success: false, error: "未获取到你的回答，请先完成所有问题" },
          { status: 400 }
        );
      }

      finalBrief = `账号类型：${userAnswers[0] || "未说明"}；
性别与生活特征：${userAnswers[1] || "未说明"}；
目标受众：${userAnswers[2] || "未说明"}；
内容领域：${userAnswers[3] || "未说明"}；
平台要求与互动需求：${userAnswers[4] || "未说明"}`;
      finalGoal = "打造一位可复用的  人设，包含内容方向与表达策略，适配用户指定的平台和受众。";
    } else {
      return NextResponse.json(
        { success: false, error: "请提供对话历史或直接提供人设需求描述" },
        { status: 400 }
      );
    }

    // ... (中间的校验和 Prompt 保持不变) ...
    if (!finalBrief || finalBrief.trim().length === 0) {
        return NextResponse.json(
            { success: false, error: "人设需求描述不能为空" },
            { status: 400 }
        );
    }

    const systemPrompt = `You are an expert  persona strategist who writes bilingual Markdown.
Output MUST strictly follow this template so the frontend parser can work.
Do NOT use bold (**), italics, or Markdown tables. Every field should live on its own line.

## Persona Card
- Name: [keep it vivid and 2-4 Chinese characters + 英文，示例：霓虹感测评师 Neon]
- Alias: [简短别名]
- Tagline: [8-16 字以内，突出定位]
- Audience: [锁定人群描述]
- Domain Tags: tagA, tagB, tagC
- Voice: [表达口吻 1 句话]
- Tone: [温度/氛围 1 句话]
- Style: [叙事或表达风格]
- CTA: [呼吁粉丝互动的语句]
- Background: [一句话背景说明]

## Backstory
[2-3 句，说明人设背景、专业度、可信度]

## Content Pillars
1. [支柱 1]
2. [支柱 2]
3. [支柱 3]

## Signature Hooks
- [抓眼 Hook 1]
- [Hook 2]
- [Hook 3]

## Reminders
- [提醒 1]
- [提醒 2]
- [提醒 3]

## Sample Bio
[120-180 字，第一人称口吻，体现价值]

每个段落必须以 Markdown 输出，不能额外添加注释或 JSON。确保所有字段都填充中文内容，同时保留模板中的英文标题，方便前端解析。`;

    const userPrompt = `需求描述：
${finalBrief}

创作目标：${finalGoal}

请基于上述信息生成一个中文为主的人设文档，保留模板中的所有标题和字段，不要遗漏。`;

    const result = streamText({
      model: deepseek("deepseek-chat"),
      system: systemPrompt,
      prompt: userPrompt,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Persona generation failed:", error);
    const errorMessage = error instanceof Error ? error.message : "生成人设失败，请重试";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}