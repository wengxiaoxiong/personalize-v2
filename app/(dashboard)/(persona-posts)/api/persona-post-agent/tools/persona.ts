import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AgentContext } from "../types";

export const createSearchPersonasTool = (context: AgentContext) => tool({
  description: "搜索用户的人设列表，用于查找可用的人设资源。可以根据人设名称或领域标签搜索，或获取所有人设列表。",
  inputSchema: z.object({
    query: z.string().optional().describe("搜索关键词，用于过滤人设名称或领域标签。如果为空，则返回所有人设"),
    limit: z.number().optional().default(10).describe("返回最多多少条记录，默认10条"),
  }),
  execute: async ({ query, limit }) => {
    const personas = await prisma.persona.findMany({
      where: {
        userId: context.user.id,
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        domainTags: true,
        professionalBackground: true,
        expressionStyle: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: query ? limit * 2 : limit,
    });

    let filteredPersonas = personas;
    if (query) {
      const queryLower = query.toLowerCase();
      filteredPersonas = personas
        .filter((persona) => {
          const domainTags = Array.isArray(persona.domainTags)
            ? persona.domainTags as string[]
            : [];
          return (
            persona.name.toLowerCase().includes(queryLower) ||
            domainTags.some((tag) => tag.toLowerCase().includes(queryLower))
          );
        })
        .slice(0, limit);
    }

    const personaIds = filteredPersonas.map((p) => p.id);
    const postCounts = await prisma.personaPost.groupBy({
      by: ['personaId'],
      where: {
        personaId: { in: personaIds },
      },
      _count: {
        personaId: true,
      },
    });

    const postCountMap = Object.fromEntries(
      postCounts.map((item) => [item.personaId, item._count.personaId])
    );

    if (filteredPersonas.length === 0) {
      return {
        success: true,
        message: query ? `未找到包含"${query}"的人设` : "暂无人设",
        personas: [],
      };
    }

    const personaList = filteredPersonas.map((persona) => {
      const domainTags = Array.isArray(persona.domainTags) ? persona.domainTags as string[] : [];
      const professionalBackground = persona.professionalBackground as {
        background?: string;
        tagline?: string;
        alias?: string;
        bio?: string;
      } | null || {};
      const expressionStyle = persona.expressionStyle as {
        style?: string;
        voice?: string;
        tone?: string;
      } | null || {};

      return {
        id: persona.id,
        name: persona.name,
        avatarUrl: persona.avatarUrl,
        domainTags,
        tagline: professionalBackground.tagline || null,
        bio: professionalBackground.bio || null,
        style: expressionStyle.style || null,
        voice: expressionStyle.voice || null,
        tone: expressionStyle.tone || null,
        postCount: postCountMap[persona.id] || 0,
        createdAt: persona.createdAt.toISOString(),
        updatedAt: persona.updatedAt.toISOString(),
      };
    });

    return {
      success: true,
      message: `已找到 ${filteredPersonas.length} 个人设`,
      personas: personaList,
      personaNames: filteredPersonas.map((p) => p.name),
    };
  },
});

export const createGetPersonaPostHistoryTool = (context: AgentContext) => tool({
  description: "获取某个人设历史生成过的帖子列表（标题、ID、创建时间等），用于参考和避免生成重复内容。",
  inputSchema: z.object({
    limit: z.number().optional().default(10).describe("返回最多多少条历史记录，默认10条"),
  }),
  execute: async ({ limit }) => {
    if (!context.personaId) {
      return {
        success: false,
        message: "未绑定人设，无法获取历史帖子",
      };
    }

    const posts = await prisma.personaPost.findMany({
      where: {
        personaId: context.personaId,
        persona: {
          userId: context.user.id,
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        metadata: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    if (posts.length === 0) {
      return {
        success: true,
        message: "该人设暂无历史帖子",
        posts: [],
      };
    }

    const postList = posts.map((post) => {
      const metadata = post.metadata as { tags?: string[]; platform?: string } | null;
      return {
        id: post.id,
        title: post.title,
        status: post.status,
        createdAt: post.createdAt.toISOString(),
        tags: metadata?.tags || [],
        platform: metadata?.platform || null,
      };
    });

    return {
      success: true,
      message: `已获取该人设的 ${posts.length} 条历史帖子`,
      posts: postList,
      titles: posts.map((p) => p.title),
    };
  },
});

export const createGetPostByIdTool = (context: AgentContext) => tool({
  description: "根据帖子ID获取帖子的完整内容（标题、正文、标签等），用于查看历史帖子的详细信息。",
  inputSchema: z.object({
    postId: z.string().describe("帖子ID"),
  }),
  execute: async ({ postId }) => {
    const post = await prisma.personaPost.findFirst({
      where: {
        id: postId,
        persona: {
          userId: context.user.id,
        },
      },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!post) {
      return {
        success: false,
        message: "帖子不存在或无权访问",
      };
    }

    const metadata = post.metadata as { tags?: string[]; platform?: string; images?: string[] } | null;

    return {
      success: true,
      post: {
        id: post.id,
        title: post.title,
        content: post.content,
        status: post.status,
        tags: metadata?.tags || [],
        platform: metadata?.platform || null,
        images: metadata?.images || [],
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      },
    };
  },
});
