// app/api/personas/generate/route.ts（生成人设接口）
import { deepseek } from "@ai-sdk/deepseek";
import { streamText } from "ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const payload = await req.json();
        const { messages, brief, goal } = payload;

        let finalBrief = "";
        let finalGoal = "";

        // 支持两种模式：1. 通过 messages（对话模式） 2. 直接传入 brief（PDF 模式）
        if (brief && typeof brief === "string" && brief.trim().length > 0) {
            // 模式 2：直接传入 brief（PDF 解析后）
            finalBrief = brief.trim();
            finalGoal = goal && typeof goal === "string" 
                ? goal.trim() 
                : "基于上传的PDF内容，生成一个可直接用于 KOS dashboard 的人设模板，并突出互动性。";
        } else if (messages && Array.isArray(messages) && messages.length > 0) {
            // 模式 1：从对话历史中提取
            // 从聊天历史中提取用户回答（过滤掉 AI 消息和空内容）
            const userAnswers = messages
                .filter((msg: any) => {
                    if (msg.role !== "user") return false;
                    if (msg.content && typeof msg.content === "string") {
                        return msg.content.trim().length > 0;
                    }
                    if (msg.parts && Array.isArray(msg.parts)) {
                        const text = msg.parts
                            .filter((part: any) => part.type === "text")
                            .map((part: any) => part.text)
                            .join("");
                        return text.trim().length > 0;
                    }
                    return false;
                })
                .map((msg: any) => {
                    if (msg.content && typeof msg.content === "string") {
                        return msg.content.trim();
                    }
                    if (msg.parts && Array.isArray(msg.parts)) {
                        return msg.parts
                            .filter((part: any) => part.type === "text")
                            .map((part: any) => part.text)
                            .join("")
                            .trim();
                    }
                    return "";
                })
                .filter((text: string) => text.length > 0);

            if (userAnswers.length === 0) {
                return NextResponse.json(
                    { success: false, error: "未获取到你的回答，请先完成所有问题" },
                    { status: 400 }
                );
            }

            // 构造 brief（人设需求描述）：将用户回答整理成自然语言描述
            finalBrief = `账号类型：${userAnswers[0] || "未说明"}；
性别与生活特征：${userAnswers[1] || "未说明"}；
目标受众：${userAnswers[2] || "未说明"}；
内容领域：${userAnswers[3] || "未说明"}；
平台要求与互动需求：${userAnswers[4] || "未说明"}`;
            finalGoal = "打造一位可复用的 KOS 人设，包含内容方向与表达策略，适配用户指定的平台和受众。";
        } else {
            return NextResponse.json(
                { success: false, error: "请提供对话历史或直接提供人设需求描述" },
                { status: 400 }
            );
        }

        if (!finalBrief || finalBrief.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: "人设需求描述不能为空" },
                { status: 400 }
            );
        }

        // AI 生成人设的系统提示词（保持原有模板）
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

        // 用户提示词：将整理后的需求传递给 AI
        const userPrompt = `需求描述：
${finalBrief}

创作目标：${finalGoal}

请基于上述信息生成一个中文为主的人设文档，保留模板中的所有标题和字段，不要遗漏。`;

        // 调用 AI 生成人设（流式响应）
        const result = streamText({
            model: deepseek("deepseek-chat"),
            system: systemPrompt,
            prompt: userPrompt,
        });

        // 返回流式响应（适配前端的流式处理逻辑）
        return result.toUIMessageStreamResponse();
    } catch (error) {
        console.error("Persona generation failed:", error);
        return NextResponse.json(
            { success: false, error: "生成人设失败，请重试" },
            { status: 500 }
        );
    }
}