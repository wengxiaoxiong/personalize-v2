/**
 * 小红书数据解析器
 * 将小红书JSON数据转换为结构化文本，供AI分析
 */

export type XiaohongshuData = {
  feeds?: Array<{
    title?: string;
    authorName?: string;
    likeCount?: string;
    coverImage?: string;
  }>;
  userInfo?: {
    nickname?: string;
    redId?: string;
    avatar?: string;
    description?: string;
    gender?: string;
    location?: string;
    followingCount?: string;
    followersCount?: string;
    likesAndCollectionsCount?: string;
  };
  count?: number;
  url?: string;
};

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
 */
export function parseXiaohongshuJson(jsonString: string): XiaohongshuData | null {
  try {
    const data = JSON.parse(jsonString) as XiaohongshuData;
    
    // 基本验证
    if (!data.userInfo && (!data.feeds || data.feeds.length === 0)) {
      return null;
    }

    return data;
  } catch (error) {
    console.error("Failed to parse Xiaohongshu JSON:", error);
    return null;
  }
}

