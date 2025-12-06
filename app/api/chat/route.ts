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
                    .filter((part): part is { type: "text"; text: string } => part.type === "text")
                    .map((part) => part.text)
                    .join("");
                return text.trim().length > 0;
            }
            return false;
        });
        
        // 检查是否有 PDF 上传的内容
        const hasPdfContent = userMessages.some(msg => {
            const text = msg.parts
                .filter((part): part is { type: "text"; text: string } => part.type === "text")
                .map((part) => part.text)
                .join("");
            return text.includes("[已上传简历/PDF]");
        });

        // 过滤掉 PDF 上传消息，只统计正常回答
        const normalUserMessages = userMessages.filter(msg => {
            const text = msg.parts
                .filter((part): part is { type: "text"; text: string } => part.type === "text")
                .map((part) => part.text)
                .join("");
            return !text.includes("[已上传简历/PDF]");
        });
        const answeredCount = normalUserMessages.length;
        
        console.log(`[Chat API] 用户已回答 ${answeredCount} 个问题，共 ${PRESET_QUESTIONS.length} 个问题，是否有PDF内容: ${hasPdfContent}`);

        // --- 特殊处理：如果有 PDF 内容，给出不同的回复 ---
        if (hasPdfContent) {
            // 检查用户是否输入了生成关键词
            const lastUserMessage = userMessages[userMessages.length - 1];
            const lastUserText = lastUserMessage?.parts
                .filter((part): part is { type: "text"; text: string } => part.type === "text")
                .map((part) => part.text)
                .join("") || "";
            
            const generateKeywords = ["生成人设", "生成", "开始生成", "生成吧", "可以生成了"];
            const shouldGenerate = generateKeywords.some(keyword => 
                lastUserText.toLowerCase().includes(keyword.toLowerCase())
            );

            if (shouldGenerate) {
                // 用户要求生成人设，返回结束提示
                const finishPrompt = "🎉 好的！我已经收到你的简历和需求，现在开始为你生成专属人设～ 请稍等...";
                const finishSystemPrompt = `你的唯一任务是，不添加任何额外内容，直接输出以下精确字符串：
${finishPrompt}`;

                const result = streamText({
                    model: deepseek("deepseek-chat"),
                    messages: [
                        ...convertToModelMessages(messages),
                        { role: "system" as const, content: finishSystemPrompt }
                    ],
                    temperature: 0,
                });

                return result.toUIMessageStreamResponse({
                    sendSources: false,
                    sendReasoning: false,
                });
            } else {
                // PDF 上传后，询问用户是否需要补充信息
                const pdfPrompt = "我已经收到你上传的简历/PDF内容。你可以继续告诉我你的额外需求，比如目标受众、内容风格、平台要求等。如果信息已经足够，可以直接输入「生成人设」来开始生成。";
                const pdfSystemPrompt = `你的唯一任务是，不添加任何额外内容，直接输出以下精确字符串：
${pdfPrompt}`;

                const result = streamText({
                    model: deepseek("deepseek-chat"),
                    messages: [
                        ...convertToModelMessages(messages),
                        { role: "system" as const, content: pdfSystemPrompt }
                    ],
                    temperature: 0,
                });

                return result.toUIMessageStreamResponse({
                    sendSources: false,
                    sendReasoning: false,
                });
            }
        }

        // --- 1. 还有问题未回答：返回下一个预设问题 ---
        if (answeredCount < PRESET_QUESTIONS.length) {
            const nextQuestion = PRESET_QUESTIONS[answeredCount];

            // 提取已问过的问题关键词，用于检测重复
            const assistantMessages = messages.filter(m => m.role === "assistant");
            const askedQuestionKeywords: string[] = [];
            
            // 提取每个预设问题的核心关键词（前15个字符）
            PRESET_QUESTIONS.forEach((q, idx) => {
                if (idx < answeredCount) {
                    const keywords = q.substring(0, 15);
                    askedQuestionKeywords.push(keywords);
                }
            });

            // 检查历史对话中是否已经问过类似的问题
            const hasAskedSimilar = assistantMessages.some(msg => {
                const msgText = msg.parts
                    .filter((part): part is { type: "text"; text: string } => part.type === "text")
                    .map((part) => part.text)
                    .join("");
                // 检查是否包含当前问题的核心关键词
                const currentKeywords = nextQuestion.substring(0, 15);
                return msgText.includes(currentKeywords);
            });

            if (hasAskedSimilar && answeredCount < PRESET_QUESTIONS.length - 1) {
                // 如果已经问过类似问题，且还有下一个问题，就跳过
                console.log(`[Chat API] 检测到已问过类似问题，跳过问题 ${answeredCount}，跳到问题 ${answeredCount + 1}`);
                const skipQuestion = PRESET_QUESTIONS[answeredCount + 1];
                const systemPrompt = `你是人设生成引导助手。用户已经回答了相关问题，现在需要问下一个问题。

基于以下预设问题，用自然、口语化的方式提问，可以适当调整措辞，但核心内容要保持一致。

预设问题：${skipQuestion}

要求：
1. 基于预设问题的核心内容，用自然、友好的方式提问
2. 可以根据用户的回答进行适当的推断和个性化表达
3. 不要完全照搬预设问题，要有一些变化
4. 不要重复已经问过的问题`;

                const result = streamText({
                    model: deepseek("deepseek-chat"),
                    messages: [
                        { role: "system" as const, content: systemPrompt },
                        ...convertToModelMessages(messages),
                    ],
                    temperature: 0.7,
                });

                return result.toUIMessageStreamResponse({
                    sendSources: false,
                    sendReasoning: false,
                });
            }

            // 使用更灵活的 System Prompt，允许AI有推断和变化，但核心内容要一致
            const systemPrompt = `你是人设生成引导助手。基于以下预设问题，用自然、口语化的方式提问，可以适当调整措辞、添加推断或个性化表达，但核心内容要保持一致。

预设问题：${nextQuestion}

要求：
1. 基于预设问题的核心内容，用自然、友好的方式提问
2. 可以根据用户的回答进行适当的推断和个性化表达
3. 不要完全照搬预设问题，要有一些变化
4. **重要**：检查历史对话，确保不会重复问同一个问题。如果历史对话中已经问过类似的问题（包含相同的关键词），请跳过这个问题，直接问下一个问题
5. 如果用户已经回答了相关问题，可以适当调整问题的表达方式

已问过的问题关键词：${askedQuestionKeywords.join("、")}`;

            // 构造对话上下文
            const modelMessages = [
                { role: "system" as const, content: systemPrompt },
                ...convertToModelMessages(messages), // 历史对话
            ];

            const result = streamText({
                model: deepseek("deepseek-chat"),
                messages: modelMessages,
                temperature: 0.7, // 允许一些灵活性，但不要太随机
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