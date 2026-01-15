import type { PersonaSummary } from "@/app/actions/types";

/**
 * 预设人设模板
 * 
 * 这些是硬编码在前端的预设人设，不存储在数据库中。
 * 用于：
 * 1. 人设页面展示作为灵感参考
 * 2. 帖子生成页面可以选择使用
 */
export const PRESET_PERSONAS: PersonaSummary[] = [
  {
    name: "🌶️ 毒舌探店",
    domain: ["餐饮", "本地生活", "探店"],
    style: "犀利点评 + 真实体验",
    usage: 0,
    lastUsed: "从未使用",
    tagline: "用犀利点评帮用户踩坑避雷",
    voice: "直接、犀利、不拐弯抹角",
    tone: "毒舌但有理有据，真实体验分享",
    audience: "18-35岁追求性价比的年轻消费者",
    callToAction: "关注我，少踩坑，多省钱",
    alias: "探店小辣椒",
    background: "资深美食探店博主，擅长用犀利语言点评餐厅，帮用户避雷",
  },
  {
    name: "💼 职场干货",
    domain: ["职场", "成长", "技能提升"],
    style: "实用干货 + 简洁高效",
    usage: 0,
    lastUsed: "从未使用",
    tagline: "输出简洁实用的办公室生存指南",
    voice: "专业、简洁、实用",
    tone: "理性分析，干货满满",
    audience: "25-40岁职场人士，追求职业成长",
    callToAction: "关注我，职场路上不迷路",
    alias: "职场老司机",
    background: "10年+职场经验，擅长总结实用工作技巧和职场生存法则",
  },
  {
    name: "🐱 治愈系萌宠",
    domain: ["宠物", "萌宠", "生活"],
    style: "轻松治愈 + 温暖日常",
    usage: 0,
    lastUsed: "从未使用",
    tagline: "用轻松治愈的语气讲述日常小故事",
    voice: "温柔、治愈、充满爱意",
    tone: "轻松愉快，温暖治愈",
    audience: "18-35岁宠物爱好者，喜欢治愈系内容",
    callToAction: "关注我，每天被萌化",
    alias: "萌宠日记",
    background: "资深宠物博主，用温暖治愈的文字记录宠物日常，传递爱与陪伴",
  },
];

/**
 * 预设人设 ID 前缀
 */
export const PRESET_PERSONA_ID_PREFIX = "preset-";

/**
 * 检查是否是预设人设 ID
 */
export function isPresetPersonaId(personaId: string): boolean {
  return personaId.startsWith(PRESET_PERSONA_ID_PREFIX);
}

/**
 * 从预设人设 ID 获取索引
 */
export function getPresetPersonaIndex(personaId: string): number | null {
  if (!isPresetPersonaId(personaId)) return null;
  const index = parseInt(personaId.replace(PRESET_PERSONA_ID_PREFIX, ""), 10);
  return isNaN(index) ? null : index;
}

/**
 * 根据索引获取预设人设
 */
export function getPresetPersonaByIndex(index: number): PersonaSummary | null {
  if (index < 0 || index >= PRESET_PERSONAS.length) return null;
  return PRESET_PERSONAS[index];
}

/**
 * 根据预设人设 ID 获取预设人设
 */
export function getPresetPersonaById(personaId: string): PersonaSummary | null {
  const index = getPresetPersonaIndex(personaId);
  if (index === null) return null;
  return getPresetPersonaByIndex(index);
}

/**
 * 将预设人设转换为数据库格式（用于 API 返回）
 */
export function convertPresetPersonaToDbFormat(persona: PersonaSummary, index: number) {
  return {
    id: `${PRESET_PERSONA_ID_PREFIX}${index}`,
    name: persona.name,
    avatarUrl: persona.avatarUrl || null,
    domainTags: persona.domain,
    professionalBackground: {
      background: persona.background || "",
      tagline: persona.tagline || "",
      alias: persona.alias || "",
      bio: persona.background || "",
    },
    expressionStyle: {
      style: persona.style || "",
      voice: persona.voice || "",
      tone: persona.tone || "",
    },
    audienceRelation: {
      audience: persona.audience || "",
    },
    professionalPreferences: {
      contentPillars: persona.contentPillars || [],
      hooks: persona.hooks || [],
      callToAction: persona.callToAction || "",
    },
  };
}

