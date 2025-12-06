// app/api/chat/route.ts
import { deepseek } from "@ai-sdk/deepseek";
import { streamText, UIMessage, convertToModelMessages } from "ai";
import { NextResponse } from "next/server";

export const maxDuration = 30;

// 与前端完全一致的5个预设问题
const PRESET_QUESTIONS = [
    "嗨～ 先跟我说说你的账号是个人账号还是公司账号呀？比如「个人」或者「OnBeat Lab 品牌账号」这样～",
    "接下来告诉我账号主体的性别和生活特征吧！比如「女性，喜欢夜生活、独立音乐、数字艺术」",
    "目标受众是哪些小伙伴呢？比如「18-28岁一二线城市潮流青年」",
    "内容主要覆盖哪些领域呀？比如「穿搭、香氛、线下派对、数字艺术展」",
    "有没有平台特定要求或互动需求？比如「小红书/抖音适配，需要带动现场互动」",
];

export async function POST(req: Request) {
    try {
        const payload = await req.json();
        const messages: UIMessage[] = payload?.messages ?? [];

        // 基础校验
        if (!Array.isArray(messages)) {
            return NextResponse.json(
                { success: false, error: "无效的消息格式" },
                { status: 400 }
            );
        }

        // 过滤用户消息，统计已回答数量
        // 注意：UIMessage 使用 parts 数组格式
        const userMessages = messages.filter(m => {
            if (m.role !== "user") return false;
            // 提取 parts 中的文本内容
            if (m.parts && Array.isArray(m.parts)) {
                const text = m.parts
                    .filter((part: any) => part.type === "text")
                    .map((part: any) => part.text)
                    .join("");
                return text.trim().length > 0;
            }
            return false;
        });
        const answeredCount = userMessages.length;
        
        console.log(`[Chat API] 用户已回答 ${answeredCount} 个问题，共 ${PRESET_QUESTIONS.length} 个问题`);

        // --- 1. 还有问题未回答：返回下一个预设问题 ---
        if (answeredCount < PRESET_QUESTIONS.length) {
            const nextQuestion = PRESET_QUESTIONS[answeredCount];

            // 使用强力 System Prompt 约束 AI 的行为，确保只返回问题本身
            const systemPrompt = `你是人设生成引导助手，严格按照预设问题顺序提问。你的唯一任务是，忽略所有历史对话，直接输出以下精确字符串，不多一个字，不少一个字：
${nextQuestion}`;

            // 构造对话上下文
            const modelMessages = [
                { role: "system" as const, content: systemPrompt },
                ...convertToModelMessages(messages), // 历史对话
            ];

            const result = streamText({
                model: deepseek("deepseek-chat"),
                messages: modelMessages,
                temperature: 0, // 固定输出
                // system prompt 已经限制了输出内容，不需要额外限制
            });

            return result.toUIMessageStreamResponse({
                sendSources: false,
                sendReasoning: false,
            });
        }

        // --- 2. 5个问题已回答完：返回结束提示（触发前端调用generate接口） ---
        const finishPrompt = "🎉 好啦！我已经收集完所有信息，现在开始为你生成专属人设～ 请稍等...";

        // 使用强力 System Prompt 约束 AI 的行为，确保只返回结束提示
        const finishSystemPrompt = `你的唯一任务是，不添加任何额外内容（如“好的”、“收到”、“请问”等），直接输出以下精确字符串：
${finishPrompt}`;

        const result = streamText({
            model: deepseek("deepseek-chat"),
            messages: [
                ...convertToModelMessages(messages), // 历史对话
                { role: "system" as const, content: finishSystemPrompt }
            ],
            temperature: 0,
            // system prompt 已经限制了输出内容
        });

        return result.toUIMessageStreamResponse({
            sendSources: false,
            sendReasoning: false,
        });

    } catch (err) {
        console.error("Chat接口错误:", err);
        const errorMessage = err instanceof Error ? err.message : "对话服务异常，请重试";
        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}