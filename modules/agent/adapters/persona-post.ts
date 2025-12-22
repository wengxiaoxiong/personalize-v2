/**
 * Persona Post Agent Adapter
 *
 * 负责帖子生成的领域逻辑：
 * 1. 工具调用常量定义
 * 2. 消息负载转换
 * 3. 帖子结果解析
 */

import type { UIMessage } from "@/modules/agent/types/agent";

// ========== 常量定义 ==========

/**
 * 保存帖子工具名称
 */
export const PERSONA_POST_SAVE_TOOL = "savePersonaPost";

/**
 * 读取知识库工具名称
 */
export const PERSONA_POST_READ_KB_TOOL = "readKnowledgeBase";

/**
 * 生成大字报工具名称
 */
export const PERSONA_POST_GENERATE_POSTER_TOOL = "generatePoster";

/**
 * 触发帖子生成的关键词
 */
export const PERSONA_POST_GENERATE_KEYWORDS = [
  "生成帖子",
  "写个帖子",
  "帮我写",
  "创建帖子",
  "发帖",
];

// ========== 类型定义 ==========

/**
 * 帖子元数据
 */
export interface PersonaPostMetadata {
  /** 标签 */
  tags?: string[];
  /** 图片链接（包括大字报） */
  images?: string[];
  /** 平台 */
  platform?: "xiaohongshu" | "weibo" | "other";
  /** 大字报图片链接 */
  posterUrl?: string;
}

/**
 * 帖子生成结果
 */
export interface PersonaPostResult {
  /** 数据库ID（保存后才会有） */
  id?: string;
  title: string;
  content: string;
  /** 发布状态（可选） */
  status?: "draft" | "published" | "archived";
  tags?: string[];
  platform?: string;
  metadata?: PersonaPostMetadata;
}

/**
 * 知识库数据
 */
export interface KnowledgeBaseData {
  summary?: string;
  keyPoints?: string[];
  categories?: string[];
  aiKnowledgeBase?: string;
}

// ========== 负载转换函数 ==========

/**
 * 构建帖子生成的负载
 * 从消息历史中提取上下文信息
 */
export function buildPersonaPostPayload(messages: UIMessage[], additionalContext?: {
  personaId?: string;
  projectId?: string;
  knowledgeBase?: KnowledgeBaseData;
}) {
  // 提取最近的用户消息作为主要需求
  const userMessages = messages
    .filter((m) => m.role === "user")
    .map((m) => {
      const textParts = m.parts.filter((p) => p.type === "text");
      return textParts.map((p) => "text" in p ? p.text : "").join("\n");
    })
    .filter(Boolean);

  const latestUserMessage = userMessages[userMessages.length - 1] || "";

  return {
    messages: messages.map((m) => ({
      role: m.role,
      content: m.parts
        .filter((p) => p.type === "text")
        .map((p) => "text" in p ? p.text : "")
        .join("\n"),
    })),
    brief: latestUserMessage,
    context: additionalContext,
  };
}

/**
 * 解析帖子生成结果
 * 从AI响应中提取结构化的帖子数据
 */
export function parsePersonaPostResult(text: string): PersonaPostResult | null {
  try {
    // 尝试提取JSON格式的结果
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return {
        title: parsed.title || "未命名帖子",
        content: parsed.content || text,
        tags: parsed.tags || [],
        platform: parsed.platform,
        metadata: parsed.metadata,
      };
    }

    // 尝试从Markdown中提取标题和内容
    const titleMatch = text.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : "未命名帖子";

    // 移除标题后的内容
    const content = titleMatch
      ? text.replace(/^#\s+.+$/m, "").trim()
      : text;

    // 提取标签（如果有）
    const tagsMatch = text.match(/标签[:：]\s*(.+)$/m);
    const tags = tagsMatch
      ? tagsMatch[1].split(/[,，\s]+/).filter(Boolean)
      : [];

    return {
      title,
      content,
      tags,
    };
  } catch (error) {
    console.error("Failed to parse persona post result", error);
    return {
      title: "未命名帖子",
      content: text,
    };
  }
}

/**
 * 构建保存帖子的降级方案
 * 当解析失败时使用
 */
export function buildFallbackPersonaPost(text: string): PersonaPostResult {
  return {
    title: "AI生成的帖子",
    content: text,
    tags: ["AI生成"],
  };
}
