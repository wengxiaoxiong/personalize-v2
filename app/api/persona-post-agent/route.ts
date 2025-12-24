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

    // 如果有personaId，获取完整的人设信息
    let persona = null;
    if (personaId) {
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
          description: "读取项目的本地知识库内容，用于帮助生成更符合项目背景的帖子。优先使用此工具查询本地知识库，如果信息不足再使用 searchInformation 搜索。",
          inputSchema: z.object({
            query: z.string().describe("查询关键词，用于在知识库中搜索相关内容"),
          }),
          execute: async ({ query }) => {
            if (!knowledgeBase) {
              return {
                success: false,
                message: "未找到知识库",
                suggestion: "请使用 searchInformation 工具搜索相关信息",
              };
            }

            // 基于关键词搜索知识库内容
            const queryLower = query.toLowerCase();
            const knowledgeBaseLower = knowledgeBase.toLowerCase();
            
            // 查找包含关键词的段落
            const paragraphs = knowledgeBase.split(/\n\n+/);
            const relevantParagraphs: string[] = [];
            
            // 优先查找完全匹配的段落
            for (const para of paragraphs) {
              if (para.toLowerCase().includes(queryLower)) {
                relevantParagraphs.push(para);
              }
            }
            
            // 如果找到相关段落，返回最相关的内容（最多2000字符）
            if (relevantParagraphs.length > 0) {
              const relevant = relevantParagraphs.join('\n\n').substring(0, 2000);
              return {
                success: true,
                knowledgeBase: relevant,
                message: `已从本地知识库找到 ${relevantParagraphs.length} 条相关内容`,
                hasMore: knowledgeBase.length > 2000,
              };
            }
            
            // 如果没有找到完全匹配，返回知识库的前1000字符作为上下文
            const fallback = knowledgeBase.substring(0, 1000);
            return {
              success: true,
              knowledgeBase: fallback,
              message: "未找到完全匹配的内容，返回知识库概览。如果信息不足，请使用 searchInformation 工具搜索更多信息",
              suggestion: "如果这些信息不足以生成完整帖子，请使用 searchInformation 工具搜索相关信息",
            };
          },
        }),

        // 搜索相关信息工具
        searchInformation: tool({
          description: "当知识库信息不足或没有知识库时，使用此工具搜索相关信息来帮助生成帖子。可以搜索行业趋势、专业知识、最新资讯等。",
          inputSchema: z.object({
            query: z.string().describe("搜索查询关键词，例如：'AI技术最新趋势'、'小红书内容创作技巧'等"),
            topic: z.string().optional().describe("主题领域，例如：'科技'、'美食'、'旅游'等"),
          }),
          execute: async ({ query, topic }) => {
            // 这里可以接入真实的搜索API（如Google Search API、Bing Search API等）
            // 目前返回一个提示，让AI基于其训练数据生成相关内容
            return {
              success: true,
              message: `已搜索关键词：${query}${topic ? `，主题：${topic}` : ''}`,
              note: "基于搜索到的信息，结合你的专业知识生成相关内容。确保信息准确、有价值，并符合人设风格。",
              searchQuery: query,
              topic: topic || "通用",
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
    persona: {
      id: string;
      name: string;
      avatarUrl: string | null;
      domainTags: unknown;
      professionalBackground: unknown;
      expressionStyle: unknown;
      audienceRelation: unknown;
      professionalPreferences: unknown;
    } | null,
    knowledgeBase: string | null
): string {
    let prompt = `你是一个专业的社交媒体内容创作助手，核心任务是基于用户提供的「人设」和「项目知识库」生成高质量、风格一致的社交媒体帖子。

## 核心原则（最高优先级）
- **严格遵循人设**：**所有输出必须严格遵循人设设定**，包括语气、用词、观点、表达风格等。这是最重要的要求，不可偏离。
- **优先本地知识库**：**必须首先使用 readKnowledgeBase 工具查询本地项目知识库**，优先使用项目相关的准确信息。
- **补充搜索策略**：**只有在本地知识库信息不足或没有知识库时，才使用 searchInformation 工具搜索相关信息**。不要跳过本地知识库直接搜索。
- **信息准确性**：所有事实性内容必须基于知识库或搜索结果，不能凭空编造。
- **平台适配**：在保持内容本质不变的前提下，对格式、语气或排版进行轻量调整，以适配不同平台（主要是小红书和微博）。

## 平台风格参考（仅用于形式微调）
- **小红书**：生活化、亲切、带点“种草”感；可适当使用第一人称、口语化表达、分段清晰、emoji 点缀（如✨💡❤️）；段落间空行增强可读性。
- **微博**：简洁直接、信息密度高；标题可更抓眼球，适合快速阅读；emoji 使用克制但精准。

> ⚠️ 注意：平台风格仅影响表达形式（如语气、段落、emoji），**不改变内容事实、人设立场或知识依据**。

## 帖子生成要求
- 标题：吸引眼球、紧扣主题，体现人设特色
- 内容：有价值、有逻辑、易读，基于人设 + 知识库/搜索结果
- 格式：合理换行、适当使用 emoji 提升亲和力（勿过度）
- 标签：附上 3–5 个相关话题标签（#xxx），兼顾领域关键词与平台热词

## 工作流程（重要！严格按照此顺序执行）
1. **仔细理解用户需求**：分析用户想要生成什么主题的帖子

2. **优先查询本地知识库**（如果有知识库）：
   - **必须首先调用 readKnowledgeBase 工具**，使用相关关键词查询本地知识库
   - 例如：用户要写"产品功能介绍"，查询"产品"、"功能"等关键词
   - 评估知识库返回的内容是否足够生成完整帖子

3. **判断是否需要补充搜索**：
   - **如果本地知识库信息充足**：直接基于知识库内容生成帖子，无需搜索
   - **如果本地知识库信息不足或没有知识库**：**然后调用 searchInformation 工具**搜索相关信息
   - 搜索策略：
     * 根据人设的领域标签和用户需求，构建精准的搜索关键词
     * 例如：人设是"科技博主"，用户要写"AI工具推荐"，搜索"最新AI工具推荐 2024"、"AI工具测评"等
     * 可以多次搜索不同角度的关键词，确保信息全面

4. **生成内容**（关键步骤）：
   - **首先回顾人设信息**：在生成前，必须回顾并确认人设的所有特征（名称、领域、Voice、Tone、Style、内容支柱等）
   - **严格遵循人设**：生成的内容必须在语气、用词、观点、风格上完全符合人设设定
   - **结合信息源**：将知识库/搜索结果与人设特征融合，确保内容既准确又符合人设风格
   - **平台适配**：在保持人设风格不变的前提下，对格式进行平台适配

5. **保存结果**：使用 savePersonaPost 工具保存最终结果

**重要原则**：始终先尝试使用本地知识库（readKnowledgeBase），只有在信息不足时才使用搜索工具（searchInformation）。这样可以确保优先使用项目相关的准确信息。

## 搜索工具使用指南
- **何时使用**：没有知识库、知识库信息不足、需要最新资讯、需要行业趋势时
- **搜索关键词构建**：结合人设领域 + 用户需求 + 时效性（如"2024最新"、"趋势"等）
- **搜索后处理**：基于搜索结果，结合你的专业知识，生成符合人设风格的高质量内容`;

    if (persona) {
        // 解析人设的各个字段
        const domainTags = Array.isArray(persona.domainTags) 
          ? persona.domainTags as string[]
          : [];
        
        const professionalBackground = (persona.professionalBackground as {
          background?: string;
          tagline?: string;
          alias?: string;
          bio?: string;
        } | null) || {};
        
        const expressionStyle = (persona.expressionStyle as {
          style?: string;
          voice?: string;
          tone?: string;
        } | null) || {};
        
        const audienceRelation = (persona.audienceRelation as {
          audience?: string;
        } | null) || {};
        
        const professionalPreferences = (persona.professionalPreferences as {
          contentPillars?: string[];
          hooks?: string[];
          reminders?: string[];
          callToAction?: string;
        } | null) || {};

        prompt += `

## ⚠️ 当前人设信息（必须严格遵循，这是最高优先级要求）

**人设名称**：${persona.name}
${professionalBackground.alias ? `**别名**：${professionalBackground.alias}` : ''}
${professionalBackground.tagline ? `**标签/口号**：${professionalBackground.tagline}` : ''}

**领域标签**：${domainTags.length > 0 ? domainTags.join('、') : '未设置'}

**表达风格**：
${expressionStyle.style ? `- 风格：${expressionStyle.style}` : ''}
${expressionStyle.voice ? `- Voice（表达口吻）：${expressionStyle.voice}` : ''}
${expressionStyle.tone ? `- Tone（语气氛围）：${expressionStyle.tone}` : ''}

${audienceRelation.audience ? `**目标受众**：${audienceRelation.audience}` : ''}

${professionalBackground.background ? `**人设背景**：${professionalBackground.background}` : ''}

${professionalBackground.bio ? `**人设简介（Bio）**：${professionalBackground.bio}` : ''}

${Array.isArray(professionalPreferences.contentPillars) && professionalPreferences.contentPillars.length > 0 
  ? `**内容支柱**：${professionalPreferences.contentPillars.join('、')}` 
  : ''}

${Array.isArray(professionalPreferences.hooks) && professionalPreferences.hooks.length > 0 
  ? `**签名钩子**：${professionalPreferences.hooks.join('、')}` 
  : ''}

${professionalPreferences.callToAction ? `**行动号召（CTA）**：${professionalPreferences.callToAction}` : ''}

### 🎯 人设遵循要求（必须严格执行）
1. **语气和用词**：必须完全符合上述 Voice 和 Tone 的描述
2. **表达风格**：必须严格按照 Style 的要求
3. **内容方向**：必须围绕 Content Pillars（内容支柱）展开
4. **观点立场**：必须符合人设的背景和定位
5. **互动方式**：如果有 CTA，必须在帖子中体现
6. **领域聚焦**：内容必须与领域标签相关

**绝对禁止**：
- 偏离人设的语气和风格
- 使用不符合人设的用词和表达
- 生成与人设领域无关的内容
- 忽略人设的核心特征和定位`;
    } else {
        prompt += `

## ⚠️ 警告：未绑定人设
当前没有绑定人设信息。虽然可以生成帖子，但建议：
1. 优先绑定一个合适的人设，以确保内容风格一致
2. 如果没有绑定人设，生成的内容可能缺乏统一的风格和定位
3. 如果用户明确要求生成帖子，可以基于通用风格生成，但应提醒用户绑定人设以获得更好的效果`;
    }

    if (knowledgeBase) {
        prompt += `

## 项目知识库已加载
**工作流程**：
1. **首先**：使用 readKnowledgeBase 工具，根据用户需求的关键词查询本地知识库
2. **然后**：评估知识库返回的内容是否足够
   - 如果信息充足：直接基于知识库内容生成帖子
   - 如果信息不足：**再使用 searchInformation 工具**补充搜索相关信息
3. 所有事实性陈述必须优先源自知识库，不足时再使用搜索结果补充。`;
    } else {
        prompt += `

## ⚠️ 未加载项目知识库
当前没有项目知识库可用。**直接使用 searchInformation 工具搜索相关信息**，然后基于搜索结果生成帖子。

搜索建议：
- 根据人设的领域标签和用户需求，构建精准的搜索关键词
- 可以多次搜索不同角度的关键词，确保信息全面
- 搜索后，结合你的专业知识和搜索结果，生成符合人设风格的高质量内容`;
    }

    return prompt;
}