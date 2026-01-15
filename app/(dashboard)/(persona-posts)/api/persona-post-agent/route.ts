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
  type UIMessage,
} from "ai";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/actions/utils";
import { prisma } from "@/lib/db";
import { getPersonaPostTools } from "./tools";
import { buildSystemPrompt } from "./prompts";
import { AgentContext } from "./types";
import { isPresetPersonaId, getPresetPersonaById, convertPresetPersonaToDbFormat } from "@/lib/preset-personas";

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

    // 如果有personaId，获取完整的人设信息
    let persona = null;
    if (personaId) {
      // 检查是否是预设人设
      if (isPresetPersonaId(personaId)) {
        const presetPersona = getPresetPersonaById(personaId);
        if (presetPersona) {
          const index = parseInt(personaId.replace("preset-", ""), 10);
          persona = convertPresetPersonaToDbFormat(presetPersona, index);
        }
      } else {
        // 从数据库获取用户创建的人设
        persona = await prisma.persona.findFirst({
          where: {
            id: personaId,
            userId: user.id,
          },
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            domainTags: true,
            professionalBackground: true,
            expressionStyle: true,
            audienceRelation: true,
            professionalPreferences: true,
          },
        });
      }
    }

    // 将当前绑定的 personaId 传递给工具
    const currentPersonaId = persona?.id || null;

    // 构建上下文
    const context: AgentContext = {
      user: { id: user.id },
      personaId,
      projectId,
      knowledgeBase,
      currentPersonaId,
    };

    // 构建系统提示
    const systemPrompt = buildSystemPrompt(persona, knowledgeBase);

    // 构建工具
    const tools = getPersonaPostTools(context);

    // 流式生成响应
    const result = streamText({
      model: deepseek("deepseek-chat"),
      system: systemPrompt,
      messages: convertToModelMessages(messages),
      tools,
      onStepFinish: async (event) => {
        // 如果调用了 generatePost，记录返回的 postId 到 context
        if (event.toolResults) {
          for (const res of event.toolResults) {
            if (res.toolName === 'generatePost') {
              const result = (res as { result?: { success?: boolean; postId?: string } }).result;
              if (result?.postId) {
                context.lastPostId = result.postId;
              }
            }
          }
        }
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
