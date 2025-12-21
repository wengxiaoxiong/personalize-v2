/**
 * Persona Post Agent Chat API
 *
 * 处理帖子生成Agent的聊天请求
 */

import { streamText, tool } from "ai";
import { z } from "zod";
import { deepseek, DEFAULT_MODEL } from "@/lib/ai";
import { getSessionUser } from "@/app/actions/utils";
import { prisma } from "@/lib/db";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // 验证用户身份
    const user = await getSessionUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages, personaId, projectId } = await req.json();

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
        knowledgeBase = (metadata.aiKnowledgeBase as string) || null;
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
      model: deepseek.chat(DEFAULT_MODEL),
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...messages,
      ],
      tools: {
        // 保存帖子工具
        savePersonaPost: tool({
          description: "保存生成的帖子到数据库",
          parameters: z.object({
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
          parameters: z.object({
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
          parameters: z.object({
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
      temperature: 0.8,
      maxSteps: 5,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Persona post agent error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500 }
    );
  }
}

/**
 * 构建系统提示
 */
function buildSystemPrompt(
  persona: { name: string; domainTags: unknown; expressionStyle: unknown } | null,
  knowledgeBase: string | null
): string {
  let prompt = `你是一个专业的社交媒体内容创作助手。你的任务是帮助用户生成高质量的社交媒体帖子。

## 你的能力：
1. 根据用户需求生成帖子标题和内容
2. 根据人设特点调整写作风格
3. 结合项目知识库生成相关内容
4. 为帖子打上合适的标签
5. 优化内容以适配不同平台（小红书、微博等）

## 帖子生成要求：
- 标题要吸引人，简洁有力
- 内容要有价值，易于阅读
- 使用适当的emoji增加趣味性
- 合理使用换行和段落，提高可读性
- 根据平台特点调整风格（小红书偏向生活化、微博偏向简洁）

## 工作流程：
1. 理解用户需求
2. 如果需要，使用 readKnowledgeBase 工具读取相关知识库内容
3. 生成帖子内容
4. 使用 savePersonaPost 工具保存帖子
5. 如果用户需要，使用 generatePoster 工具生成大字报`;

  if (persona) {
    prompt += `

## 当前人设信息：
- 名称：${persona.name}
- 领域：${JSON.stringify(persona.domainTags)}
- 表达风格：${JSON.stringify(persona.expressionStyle)}

请根据这个人设的特点生成内容，确保风格一致。`;
  }

  if (knowledgeBase) {
    prompt += `

## 项目知识库已加载
你可以使用 readKnowledgeBase 工具来查询相关信息，帮助生成更准确的内容。`;
  }

  return prompt;
}
