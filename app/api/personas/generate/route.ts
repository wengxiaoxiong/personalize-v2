import { deepseek } from "@ai-sdk/deepseek";
import { streamText } from "ai";

export async function POST(req: Request) {
  const payload = await req.json().catch(() => ({}));
  const brief =
    typeof payload.brief === "string" && payload.brief.trim().length > 0
      ? payload.brief.trim()
      : "";

  if (!brief) {
    return Response.json({ success: false, error: "请提供人设需求描述" }, { status: 400 });
  }

  const goal =
    typeof payload.goal === "string" && payload.goal.trim().length > 0
      ? payload.goal.trim()
      : "打造一位可复用的 KOS 人设，包含内容方向与表达策略。";

  const systemPrompt = `You are an expert KOS persona strategist who writes bilingual Markdown.
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
${brief}

创作目标：${goal}

请基于上述信息生成一个中文为主的人设文档，保留模板中的所有标题和字段，不要遗漏。`;

  try {
    const result = streamText({
      model: deepseek("deepseek-chat"),
      system: systemPrompt,
      prompt: userPrompt,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Persona generation failed", error);
    return Response.json({ success: false, error: "生成人设失败" }, { status: 500 });
  }
}
