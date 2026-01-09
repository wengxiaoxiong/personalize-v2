import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AgentContext } from "../types";

export const createReadKnowledgeBaseTool = (context: AgentContext) => tool({
  description: "读取项目的本地知识库内容，用于帮助生成更符合项目背景的帖子。优先使用此工具查询本地知识库，如果信息不足再使用 searchInformation 搜索。",
  inputSchema: z.object({
    query: z.string().describe("查询关键词，用于在知识库中搜索相关内容"),
  }),
  execute: async ({ query }) => {
    if (!context.knowledgeBase) {
      return {
        success: false,
        message: "未找到知识库",
        suggestion: "请使用 searchInformation 工具搜索相关信息",
      };
    }

    const queryLower = query.toLowerCase();
    const paragraphs = context.knowledgeBase.split(/\n\n+/);
    const relevantParagraphs: string[] = [];
    
    for (const para of paragraphs) {
      if (para.toLowerCase().includes(queryLower)) {
        relevantParagraphs.push(para);
      }
    }
    
    if (relevantParagraphs.length > 0) {
      const relevant = relevantParagraphs.join('\n\n').substring(0, 2000);
      return {
        success: true,
        knowledgeBase: relevant,
        message: `已从本地知识库找到 ${relevantParagraphs.length} 条相关内容`,
        hasMore: context.knowledgeBase.length > 2000,
      };
    }
    
    const fallback = context.knowledgeBase.substring(0, 1000);
    return {
      success: true,
      knowledgeBase: fallback,
      message: "未找到完全匹配的内容，返回知识库概览。如果信息不足，请使用 searchInformation 工具搜索更多信息",
      suggestion: "如果这些信息不足以生成完整帖子，请使用 searchInformation 工具搜索相关信息",
    };
  },
});

export const createSearchInformationTool = () => tool({
  description: "当知识库信息不足或没有知识库时，使用此工具搜索相关信息来帮助生成帖子。可以搜索行业趋势、专业知识、最新资讯等。",
  inputSchema: z.object({
    query: z.string().describe("搜索查询关键词，例如：'AI技术最新趋势'、'小红书内容创作技巧'等"),
    topic: z.string().optional().describe("主题领域，例如：'科技'、'美食'、'旅游'等"),
  }),
  execute: async ({ query, topic }) => {
    return {
      success: true,
      message: `已搜索关键词：${query}${topic ? `，主题：${topic}` : ''}`,
      note: "基于搜索到的信息，结合你的专业知识生成相关内容。确保信息准确、有价值，并符合人设风格。",
      searchQuery: query,
      topic: topic || "通用",
    };
  },
});

export const createSearchProjectsTool = (context: AgentContext) => tool({
  description: "搜索用户的知识库/项目列表，用于查找可用的知识库资源。可以根据项目名称搜索，或获取所有项目列表。",
  inputSchema: z.object({
    query: z.string().optional().describe("搜索关键词，用于过滤项目名称。如果为空，则返回所有项目"),
    limit: z.number().optional().default(10).describe("返回最多多少条记录，默认10条"),
  }),
  execute: async ({ query, limit }) => {
    const projects = await prisma.project.findMany({
      where: {
        userId: context.user.id,
        ...(query ? {
          name: {
            contains: query,
            mode: 'insensitive',
          },
        } : {}),
      },
      select: {
        id: true,
        name: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assets: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit,
    });

    if (projects.length === 0) {
      return {
        success: true,
        message: query ? `未找到包含"${query}"的项目` : "暂无项目",
        projects: [],
      };
    }

    const projectList = projects.map((project) => {
      const metadata = project.metadata as Record<string, unknown> | null;
      const hasKnowledgeBase = !!(metadata && typeof metadata.aiKnowledgeBase === 'string' && metadata.aiKnowledgeBase.length > 0);

      return {
        id: project.id,
        name: project.name,
        hasKnowledgeBase,
        assetCount: project._count.assets,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      };
    });

    return {
      success: true,
      message: `已找到 ${projects.length} 个项目`,
      projects: projectList,
      projectNames: projects.map((p) => p.name),
    };
  },
});
