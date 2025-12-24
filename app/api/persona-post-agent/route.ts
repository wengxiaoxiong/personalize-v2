/**
 * Persona Post Agent Chat API
 *
 * 处理帖子生成Agent的聊天请求
 */

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
import { getSessionUser } from "@/app/actions/utils";
import { prisma } from "@/lib/db";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // 验证用户身份
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = await req.json() as {
      messages?: unknown;
      personaId?: string;
      projectId?: string;
    };
    const messages: UIMessage[] = Array.isArray(payload?.messages) ? payload.messages as UIMessage[] : [];
    const personaId = typeof payload?.personaId === 'string' ? payload.personaId : undefined;
    const projectId = typeof payload?.projectId === 'string' ? payload.projectId : undefined;

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, error: "无效的消息格式" },
        { status: 400 }
      );
    }

    // 如果有projectId，获取知识库
    let knowledgeBase: string | null = null;
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: user.id,
        },
      });

      if (project && project.metadata) {
        const metadata = project.metadata as Record<string, unknown>;
        const aiKnowledgeBase = metadata.aiKnowledgeBase;
        knowledgeBase = typeof aiKnowledgeBase === 'string' ? aiKnowledgeBase : null;
      }
    }

    // 如果有personaId，获取人设信息
    let persona = null;
    if (personaId) {
      persona = await prisma.persona.findFirst({
        where: {
          id: personaId,
          userId: user.id,
        },
      });
    }

    // 构建系统提示
    const systemPrompt = buildSystemPrompt(persona, knowledgeBase);

    // 流式生成响应
    const result = streamText({
      model: deepseek("deepseek-chat"),
      system: systemPrompt,
      messages: convertToModelMessages(messages),
      tools: {
        // 保存帖子工具
        savePersonaPost: tool({
          description: "保存生成的帖子到数据库",
          inputSchema: z.object({
            title: z.string().describe("帖子标题"),
            content: z.string().describe("帖子内容"),
            tags: z.array(z.string()).optional().describe("帖子标签"),
            platform: z.string().optional().describe("目标平台"),
          }),
          execute: async ({ title, content, tags, platform }) => {
            return {
              success: true,
              message: "帖子已准备好保存",
              data: { title, content, tags, platform },
            };
          },
        }),

        // 读取知识库工具
        readKnowledgeBase: tool({
          description: "读取项目的知识库内容，用于帮助生成更符合项目背景的帖子",
          inputSchema: z.object({
            query: z.string().describe("查询关键词"),
          }),
          execute: async () => {
            if (!knowledgeBase) {
              return {
                success: false,
                message: "未找到知识库",
              };
            }

            // 简单的关键词匹配（实际应该使用向量搜索）
            const relevant = knowledgeBase.substring(0, 1000);

            return {
              success: true,
              knowledgeBase: relevant,
              message: "已读取知识库内容",
            };
          },
        }),

        // 生成大字报工具（占位符）
        generatePoster: tool({
          description: "生成3:4比例的大字报图片",
          inputSchema: z.object({
            title: z.string().describe("帖子标题"),
            content: z.string().describe("帖子内容摘要"),
          }),
          execute: async ({ title, content }) => {
            return {
              success: true,
              message: "大字报生成指令已发送",
              data: { title, content },
            };
          },
        }),
      },
      stopWhen: stepCountIs(6),
    });

    return result.toUIMessageStreamResponse({
      sendSources: false,
      sendReasoning: false,
    });
  } catch (error) {
    console.error("[Persona Post Agent] error:", error);
    return NextResponse.json(
      { success: false, error: "对话失败" },
      { status: 500 }
    );
  }
}

/**
 * 构建系统提示
 */
/**
 * 构建系统提示
 */
function buildSystemPrompt(
    persona: { name: string; domainTags: unknown; expressionStyle: unknown } | null,
    knowledgeBase: string | null
): string {
    let prompt = `你是一个专业的社交媒体内容创作助手，核心任务是基于用户提供的「人设」和「项目知识库」生成高质量、风格一致的社交媒体帖子。

## 核心原则
- **内容根基**：所有输出必须严格基于「人设设定」与「知识库信息」，确保专业性、一致性与准确性。
- **平台适配**：在保持内容本质不变的前提下，对格式、语气或排版进行轻量调整，以适配不同平台（主要是小红书和微博）。
- **避免臆测**：若知识库未提供足够信息，请主动使用 readKnowledgeBase 工具查询，不要自行编造细节。

## 平台风格参考（仅用于形式微调）
- **小红书**：生活化、亲切、带点“种草”感；可适当使用第一人称、口语化表达、分段清晰、emoji 点缀（如✨💡❤️）；段落间空行增强可读性。
- **微博**：简洁直接、信息密度高；标题可更抓眼球，适合快速阅读；emoji 使用克制但精准。

> ⚠️ 注意：平台风格仅影响表达形式（如语气、段落、emoji），**不改变内容事实、人设立场或知识依据**。

## 帖子生成要求
- 标题：吸引眼球、紧扣主题，体现人设特色
- 内容：有价值、有逻辑、易读，严格基于人设 + 知识库
- 格式：合理换行、适当使用 emoji 提升亲和力（勿过度）
- 标签：附上 3–5 个相关话题标签（#xxx），兼顾领域关键词与平台热词

## 工作流程
1. 仔细理解用户需求
2. 若知识库已加载但信息不足，主动调用 readKnowledgeBase 工具获取详情
3. 结合人设（名称、领域、表达风格）与知识库内容，生成平台适配的帖子
4. 使用 savePersonaPost 工具保存最终结果`;

    if (persona) {
        prompt += `

## 当前人设信息（必须严格遵循）：
- 名称：${persona.name}
- 领域标签：${Array.isArray(persona.domainTags) ? persona.domainTags.join('、') : JSON.stringify(persona.domainTags)}
- 表达风格：${typeof persona.expressionStyle === 'string' ? persona.expressionStyle : JSON.stringify(persona.expressionStyle)}

请确保所有输出在语气、用词、观点上与此人设完全一致。`;
    }

    if (knowledgeBase) {
        prompt += `

## 项目知识库已加载
你可随时通过 readKnowledgeBase 工具检索具体内容，确保信息准确、细节丰富。所有事实性陈述必须源自知识库或明确标注为通用常识。`;
    }

    return prompt;
}