import type { UIMessage } from "@ai-sdk/react";
import type { LivePersonaData } from "@/app/(dashboard)/personas/components/persona-live-panel";

/**
 * 从对话消息中提取 Persona 信息
 */
export function extractPersonaFromMessages(messages: UIMessage[]): LivePersonaData {
  const data: LivePersonaData = {
    domainTags: [],
    contentPillars: [],
    hooks: [],
  };

  // 只从用户消息中提取，避免从 AI 问题中提取错误信息
  const userMessages = messages.filter((msg) => msg.role === "user");
  
  const userText = userMessages
    .map((msg) => {
      return msg.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join(" ");
    })
    .join(" ");
  
  // 只使用用户消息文本，不包含 AI 的问题
  const textToAnalyze = userText;

  if (!textToAnalyze.trim()) {
    return data;
  }

  // 提取领域标签关键词
  const domainKeywords = [
    "穿搭", "时尚", "潮流", "服装", "搭配",
    "夜生活", "派对", "酒吧", "club",
    "香氛", "香水", "香薰",
    "音乐", "独立音乐", "电子音乐",
    "数字艺术", "艺术展", "展览",
    "美妆", "护肤", "彩妆",
    "美食", "探店", "餐厅",
    "旅行", "旅游", "出行",
    "健身", "运动", "瑜伽",
    "科技", "数码", "电子产品",
    "小红书", "抖音", "微博", "B站",
  ];

  const foundDomains = new Set<string>();
  domainKeywords.forEach((keyword) => {
    if (textToAnalyze.includes(keyword)) {
      // 找到对应的领域标签
      if (keyword.includes("穿搭") || keyword.includes("时尚") || keyword.includes("潮流")) {
        foundDomains.add("时尚穿搭");
      } else if (keyword.includes("夜生活") || keyword.includes("派对")) {
        foundDomains.add("夜生活");
      } else if (keyword.includes("香氛") || keyword.includes("香水")) {
        foundDomains.add("香氛");
      } else if (keyword.includes("音乐")) {
        foundDomains.add("音乐");
      } else if (keyword.includes("艺术")) {
        foundDomains.add("数字艺术");
      } else if (keyword.includes("美妆") || keyword.includes("护肤")) {
        foundDomains.add("美妆");
      } else if (keyword.includes("美食")) {
        foundDomains.add("美食");
      } else if (keyword.includes("旅行") || keyword.includes("旅游")) {
        foundDomains.add("旅行");
      } else if (keyword.includes("健身") || keyword.includes("运动")) {
        foundDomains.add("健身");
      } else if (keyword.includes("科技") || keyword.includes("数码")) {
        foundDomains.add("科技");
      } else if (keyword.includes("小红书") || keyword.includes("抖音")) {
        foundDomains.add("社媒");
      }
    }
  });
  data.domainTags = Array.from(foundDomains);

  // 提取受众信息
  const audiencePatterns = [
    /(\d+)[-~到至](\d+)岁/g,
    /(\d+)岁/g,
    /(一二|三四|一二三)线城市/g,
    /(青年|年轻人|Z世代|00后|90后|95后)/g,
    /(学生|白领|职场|创业者)/g,
  ];

  const audienceMatches: string[] = [];
  audiencePatterns.forEach((pattern) => {
    const matches = textToAnalyze.match(pattern);
    if (matches) {
      audienceMatches.push(...matches);
    }
  });

  if (audienceMatches.length > 0) {
    // 尝试提取完整的受众描述
    const audienceContext = textToAnalyze.match(/目标受众[：:]([^。\n]+)|受众[：:]([^。\n]+)|人群[：:]([^。\n]+)/i);
    if (audienceContext) {
      data.audience = audienceContext[1] || audienceContext[2] || audienceContext[3] || audienceMatches.join("、");
    } else {
      data.audience = audienceMatches.slice(0, 3).join("、");
    }
  }

  // 提取表达风格关键词
  const voiceKeywords = ["中英夹杂", "年轻化", "口语化", "专业", "轻松", "幽默", "严肃"];
  const toneKeywords = ["微醺", "沉浸式", "氛围感", "温暖", "冷静", "热情", "低调"];
  const styleKeywords = ["碎片化", "场景叙事", "实用", "安利", "测评", "分享"];

  voiceKeywords.forEach((keyword) => {
    if (textToAnalyze.includes(keyword) && !data.voice) {
      data.voice = `表达口吻：${keyword}`;
    }
  });

  toneKeywords.forEach((keyword) => {
    if (textToAnalyze.includes(keyword) && !data.tone) {
      data.tone = `语气氛围：${keyword}`;
    }
  });

  styleKeywords.forEach((keyword) => {
    if (textToAnalyze.includes(keyword) && !data.style) {
      data.style = `表达风格：${keyword}`;
    }
  });

  // 提取人设名称（从对话中寻找可能的名称）
  const namePatterns = [
    /(?:人设|账号|角色)[名称：:]([^，。\n]{2,8})/i,
    /(?:叫|名为|名字是)([^，。\n]{2,8})/i,
    /品牌[：:]([^，。\n]{2,20})/i,
  ];

  for (const pattern of namePatterns) {
    const match = textToAnalyze.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      if (name.length >= 2 && name.length <= 20) {
        data.name = name;
        break;
      }
    }
  }

  // 如果没有找到名称，尝试从品牌名提取（但要避免提取到无意义的前几个字符）
  if (!data.name) {
    // 只在前100个字符中查找，避免匹配到长文本中的无关内容
    const shortText = textToAnalyze.substring(0, 100);
    const brandMatch = shortText.match(/(OnBeat|品牌|公司账号|个人账号)([^，。\n\s\(（]{0,15})/i);
    if (brandMatch) {
      const extracted = brandMatch[0].trim();
      // 确保提取的内容有意义（不包含特殊字符、括号等）
      if (extracted.length >= 2 && extracted.length <= 20 && !extracted.match(/[\(（\)）]/)) {
        data.name = extracted;
      }
    }
  }
  
  // 如果还是没有找到，且文本太长，不要提取前几个字符作为名称
  if (!data.name && textToAnalyze.length > 200) {
    // 对于长文本，不自动提取名称，避免提取到无意义的前几个字符
    data.name = undefined;
  }

  // 提取标签/口号
  const taglinePatterns = [
    /(?:标签|口号|slogan)[：:]([^。\n]{4,20})/i,
    /(?:定位|特色)[：:]([^。\n]{4,20})/i,
  ];

  for (const pattern of taglinePatterns) {
    const match = textToAnalyze.match(pattern);
    if (match && match[1]) {
      data.tagline = match[1].trim();
      break;
    }
  }

  // 提取内容支柱（从对话中识别内容方向）
  const contentKeywords = [
    "穿搭指南", "穿搭", "搭配",
    "香氛", "香水推荐",
    "派对", "夜生活",
    "音乐", "独立音乐",
    "艺术展", "展览",
    "探店", "美食",
    "测评", "评测",
  ];

  const foundPillars = new Set<string>();
  contentKeywords.forEach((keyword) => {
    if (textToAnalyze.includes(keyword)) {
      if (keyword.includes("穿搭")) {
        foundPillars.add("穿搭指南");
      } else if (keyword.includes("香氛") || keyword.includes("香水")) {
        foundPillars.add("香氛推荐");
      } else if (keyword.includes("派对") || keyword.includes("夜生活")) {
        foundPillars.add("夜生活体验");
      } else if (keyword.includes("音乐")) {
        foundPillars.add("音乐分享");
      } else if (keyword.includes("艺术") || keyword.includes("展览")) {
        foundPillars.add("艺术展探访");
      } else if (keyword.includes("探店") || keyword.includes("美食")) {
        foundPillars.add("探店分享");
      } else if (keyword.includes("测评")) {
        foundPillars.add("产品测评");
      }
    }
  });
  data.contentPillars = Array.from(foundPillars).slice(0, 5);

  // 提取背景信息
  const backgroundPatterns = [
    /(?:背景|故事|人设背景)[：:]([^。\n]{10,100})/i,
    /(?:是|作为)([^，。\n]{5,50})(?:的|，)/i,
  ];

  for (const pattern of backgroundPatterns) {
    const match = textToAnalyze.match(pattern);
    if (match && match[1]) {
      const bg = match[1].trim();
      if (bg.length >= 5) {
        data.background = bg;
        break;
      }
    }
  }

  // 提取 CTA
  const ctaPatterns = [
    /(?:互动|号召|呼吁)[：:]([^。\n]{5,30})/i,
    /(?:标记|关注|点赞|评论)([^。\n]{5,30})/i,
  ];

  for (const pattern of ctaPatterns) {
    const match = textToAnalyze.match(pattern);
    if (match && match[1]) {
      data.callToAction = match[1].trim();
      break;
    }
  }

  return data;
}

