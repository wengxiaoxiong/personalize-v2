/**
 * 小红书数据解析器
 * 将小红书JSON数据转换为结构化文本，供AI分析
 */

import { z } from "zod";

// Zod schema 用于验证小红书数据结构
export const xiaohongshuFeedSchema = z.object({
  index: z.number().optional(),
  dataWidth: z.string().optional(),
  dataHeight: z.string().optional(),
  link: z.string().url().optional(),
  noteId: z.string().optional(),
  coverImage: z.string().url().optional(),
  title: z.string().optional(),
  authorName: z.string().optional(),
  authorAvatar: z.string().url().optional(),
  authorLink: z.string().url().optional(),
  likeCount: z.union([z.string(), z.number()]).optional(),
}).passthrough(); // 允许额外字段，但验证已知字段

export const xiaohongshuUserInfoSchema = z.object({
  nickname: z.string().optional(),
  redId: z.string().optional(),
  avatar: z.string().url().optional(),
  description: z.string().optional(),
  gender: z.string().optional(),
  location: z.string().optional(),
  followingCount: z.union([z.string(), z.number()]).optional(),
  followersCount: z.union([z.string(), z.number()]).optional(),
  likesAndCollectionsCount: z.union([z.string(), z.number()]).optional(),
}).passthrough();

export const xiaohongshuDataSchema = z.object({
  feeds: z.array(xiaohongshuFeedSchema).optional(),
  count: z.number().optional(),
  timestamp: z.string().optional(),
  url: z.string().url().optional(),
  userInfo: xiaohongshuUserInfoSchema.optional(),
}).refine(
  (data) => {
    // 至少需要有 userInfo 或 feeds 之一
    return !!(data.userInfo || (data.feeds && data.feeds.length > 0));
  },
  {
    message: "数据必须包含 userInfo 或至少一条 feed",
  }
).passthrough();

export type XiaohongshuData = z.infer<typeof xiaohongshuDataSchema>;

/**
 * 解析小红书JSON数据为结构化文本
 * 格式设计为AI易于理解和提取关键信息，转换为自然语言描述
 */
export function parseXiaohongshuData(data: XiaohongshuData): string {
  const parts: string[] = [];

  parts.push("以下是一个小红书账号的数据，请基于这些信息分析并构建人设：");
  parts.push("");

  // 用户信息部分 - 核心特质
  if (data.userInfo) {
    parts.push("【账号基本信息】");
    const infoItems: string[] = [];
    
    if (data.userInfo.nickname) {
      infoItems.push(`账号昵称：${data.userInfo.nickname}`);
    }
    if (data.userInfo.description) {
      infoItems.push(`个人简介：${data.userInfo.description}`);
    }
    if (data.userInfo.gender) {
      const genderText = data.userInfo.gender === "male" ? "男性" : data.userInfo.gender === "female" ? "女性" : "未知";
      infoItems.push(`性别：${genderText}`);
    }
    if (data.userInfo.location) {
      infoItems.push(`地区：${data.userInfo.location}`);
    }
    if (data.userInfo.followersCount) {
      infoItems.push(`粉丝数：${data.userInfo.followersCount}`);
    }
    if (data.userInfo.followingCount) {
      infoItems.push(`关注数：${data.userInfo.followingCount}`);
    }
    if (data.userInfo.likesAndCollectionsCount) {
      infoItems.push(`获赞与收藏：${data.userInfo.likesAndCollectionsCount}`);
    }
    
    parts.push(infoItems.join("\n"));
    parts.push("");
  }

  // 内容信息部分 - 用于分析内容领域和风格
  if (data.feeds && data.feeds.length > 0) {
    parts.push("【内容发布情况】");
    parts.push(`该账号共有 ${data.feeds.length} 条内容，以下是部分内容标题示例：`);
    parts.push("");

    // 只取前8条，避免过长
    const feedTitles = data.feeds
      .slice(0, 8)
      .filter(feed => feed.title)
      .map((feed, index) => `${index + 1}. ${feed.title}${feed.likeCount ? ` (${feed.likeCount}点赞)` : ""}`)
      .join("\n");
    
    if (feedTitles) {
      parts.push(feedTitles);
    }
    parts.push("");
  }

  // 总结提示
  parts.push("---");
  parts.push("请基于以上信息，分析并提取以下维度：");
  parts.push("1. 账号类型（个人/品牌）");
  parts.push("2. 主体特征（性别、职业、生活风格等）");
  parts.push("3. 内容领域（从发布内容标题中分析）");
  parts.push("4. 表达风格（从简介和内容标题中推断）");
  parts.push("5. 目标受众（从粉丝数、内容类型等推断）");

  return parts.join("\n");
}

/**
 * 验证并解析小红书JSON字符串
 * 使用 Zod schema 进行严格验证
 */
export function parseXiaohongshuJson(jsonString: string): XiaohongshuData | null {
  try {
    const parsed = JSON.parse(jsonString);
    const result = xiaohongshuDataSchema.safeParse(parsed);
    
    if (!result.success) {
      console.error("小红书JSON验证失败:", result.error.format());
      return null;
    }

    return result.data;
  } catch (error) {
    console.error("Failed to parse Xiaohongshu JSON:", error);
    return null;
  }
}

