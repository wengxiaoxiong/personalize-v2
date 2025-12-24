"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { PersonaParseResult } from "@/lib/persona-parser";
import type { Persona } from "@/lib/generated/prisma";
import { dbAvailable, getCurrentUser } from "./utils";
import type {
  ActionState,
  DashboardSnapshot,
  ProfessionalBackground,
  ExpressionStyle,
  AudienceRelation,
  ProfessionalPreferences,
} from "./types";

const personaSchema = z.object({
  name: z.string().min(2),
  domain: z.string().min(2),
  style: z.string().min(2),
  userId: z.string().uuid().optional(),
  background: z.string().optional(),
  audience: z.string().optional(),
  voice: z.string().optional(),
  tone: z.string().optional(),
  tagline: z.string().optional(),
  alias: z.string().optional(),
  contentPillars: z.string().optional(),
  hooks: z.string().optional(),
  reminders: z.string().optional(),
  bio: z.string().optional(),
  callToAction: z.string().optional(),
  // avatarUrl 可以是完整的 URL 或 objectKey（路径格式，以 avatars/ 开头）
  avatarUrl: z
    .union([
      z.string().url(), // 完整的 URL（向后兼容）
      z.string().regex(/^avatars\/.+/), // objectKey 格式：avatars/userId/...
      z.literal(""),
    ])
    .optional(),
});

const fallbackSnapshot: DashboardSnapshot = {
  personas: [
    {
      name: "科技测评师 Alex",
      domain: ["科技", "3C"],
      style: "理性 + 专业评测口吻",
      usage: 128,
      lastUsed: "2 小时前",
      badge: "最近使用",
    },
    {
      name: "宝妈体验官 Mia",
      domain: ["母婴", "生活方式"],
      style: "温柔体贴 + 使用体验",
      usage: 96,
      lastUsed: "昨天",
      badge: "高频",
    },
    {
      name: "小众设计师 Leo",
      domain: ["设计", "家居"],
      style: "美学叙事 + 质感强调",
      usage: 64,
      lastUsed: "3 天前",
      badge: "热门",
    },
  ],
};

// 将数据库格式转换为 PersonaParseResult 格式（后端处理）
function convertDbPersonaToParseResult(dbPersona: Persona): PersonaParseResult {
  const domainTags = Array.isArray(dbPersona.domainTags) 
    ? (dbPersona.domainTags as string[]) 
    : [];
  
  const professionalBackground = (dbPersona.professionalBackground as ProfessionalBackground | null) || {};
  const expressionStyle = (dbPersona.expressionStyle as ExpressionStyle) || {};
  const audienceRelation = (dbPersona.audienceRelation as AudienceRelation | null) || {};
  const professionalPreferences = (dbPersona.professionalPreferences as ProfessionalPreferences | null) || {};

  return {
    name: dbPersona.name,
    alias: professionalBackground.alias || "",
    tagline: professionalBackground.tagline || "",
    audience: audienceRelation.audience || "",
    voice: expressionStyle.voice || "",
    tone: expressionStyle.tone || "",
    domainTags,
    style: expressionStyle.style || "",
    background: professionalBackground.background || "",
    contentPillars: Array.isArray(professionalPreferences.contentPillars)
      ? professionalPreferences.contentPillars
      : [],
    hooks: Array.isArray(professionalPreferences.hooks) ? professionalPreferences.hooks : [],
    reminders: Array.isArray(professionalPreferences.reminders) ? professionalPreferences.reminders : [],
    bio: professionalBackground.bio || "",
    callToAction: professionalPreferences.callToAction || "",
    rawMarkdown: "",
  };
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  if (!(await dbAvailable())) {
    return fallbackSnapshot;
  }

  try {
    // 获取当前登录用户
    const user = await getCurrentUser();
    if (!user) {
      // 如果没有登录用户，返回空数据
      return {
        personas: [],
      };
    }

    const personas = await prisma.persona.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: {
        posts: {
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    return {
      personas: personas.map((p: (typeof personas)[number]) => {
        const professionalBackground = p.professionalBackground as ProfessionalBackground | null;
        const expressionStyle = p.expressionStyle as ExpressionStyle;
        const audienceRelation = p.audienceRelation as AudienceRelation | null;
        const professionalPreferences = p.professionalPreferences as ProfessionalPreferences | null;

        // 统计使用次数（帖子数量）
        const usage = p.posts.length;

        // 计算最近使用时间
        // 如果有帖子，使用最新帖子的创建时间；否则使用人设的更新时间
        const lastUsedDate = p.posts.length > 0 
          ? p.posts[0].createdAt 
          : p.updatedAt;
        
        // 格式化时间显示
        const now = new Date();
        const diffMs = now.getTime() - lastUsedDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        
        let lastUsed: string;
        if (diffMinutes < 1) {
          lastUsed = "刚刚";
        } else if (diffMinutes < 60) {
          lastUsed = `${diffMinutes}分钟前`;
        } else if (diffHours < 24) {
          lastUsed = `${diffHours}小时前`;
        } else if (diffDays < 7) {
          lastUsed = `${diffDays}天前`;
        } else {
          lastUsed = lastUsedDate.toLocaleDateString("zh-CN");
        }

        return {
          id: p.id,
          name: p.name,
          domain: (p.domainTags as string[]) || [],
          style: expressionStyle.style || "结构化表达",
          usage,
          lastUsed,
          avatarUrl: p.avatarUrl,
          alias: professionalBackground?.alias,
          tagline: professionalBackground?.tagline,
          audience: audienceRelation?.audience,
          voice: expressionStyle.voice,
          tone: expressionStyle.tone,
          background: professionalBackground?.background,
          bio: professionalBackground?.bio,
          callToAction: professionalPreferences?.callToAction,
          contentPillars: professionalPreferences?.contentPillars || [],
          hooks: professionalPreferences?.hooks || [],
        };
      }),
    } satisfies DashboardSnapshot;
  } catch (error) {
    console.error("Failed to read dashboard snapshot", error);
    return fallbackSnapshot;
  }
}

export async function createPersonaAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userIdValue = formData.get("userId");
  let userId: string | undefined;

  if (userIdValue && typeof userIdValue === "string") {
    const trimmed = userIdValue.trim();
    // 验证是否为有效的 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (trimmed && uuidRegex.test(trimmed)) {
      userId = trimmed;
    }
  }

  // 辅助函数：将 FormData 的 null 值转换为 undefined（Zod optional() 需要 undefined，不接受 null）
  const getFormValue = (key: string): string | undefined => {
    const value = formData.get(key);
    return value === null ? undefined : (typeof value === "string" ? value : undefined);
  };

  const parsed = personaSchema.safeParse({
    name: formData.get("name"),
    domain: formData.get("domain"),
    style: formData.get("style"),
    userId: userId, // 如果无效或不存在，传递 undefined，让 .optional() 生效
    background: getFormValue("background"),
    audience: getFormValue("audience"),
    voice: getFormValue("voice"),
    tone: getFormValue("tone"),
    tagline: getFormValue("tagline"),
    alias: getFormValue("alias"),
    contentPillars: getFormValue("contentPillars"),
    hooks: getFormValue("hooks"),
    reminders: getFormValue("reminders"),
    bio: getFormValue("bio"),
    callToAction: getFormValue("callToAction"),
    avatarUrl: getFormValue("avatarUrl"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "输入不合法" };
  }

  if (!(await dbAvailable())) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    // 获取当前登录用户
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    // Parse array fields: support both JSON string and multiline text
    const parseArrayField = (value: string | undefined): string[] => {
      if (!value) return [];
      const trimmed = value.trim();
      if (!trimmed) return [];
      
      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => typeof item === "string" && item.trim());
        }
      } catch {
        // Not JSON, treat as multiline text
      }
      
      // Split by newlines and filter empty lines
      return trimmed
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    };

    const contentPillars = parseArrayField(parsed.data.contentPillars);
    const hooks = parseArrayField(parsed.data.hooks);
    const reminders = parseArrayField(parsed.data.reminders);

    await prisma.persona.create({
      data: {
        userId: user.id, // 始终使用当前登录用户的ID
        name: parsed.data.name,
        avatarUrl: parsed.data.avatarUrl && parsed.data.avatarUrl.trim() ? parsed.data.avatarUrl.trim() : null,
        domainTags: parsed.data.domain.split(",").map((tag) => tag.trim()),
        professionalBackground: parsed.data.background ? {
          background: parsed.data.background,
          tagline: parsed.data.tagline,
          alias: parsed.data.alias,
          bio: parsed.data.bio,
        } : {},
        expressionStyle: {
          style: parsed.data.style,
          voice: parsed.data.voice,
          tone: parsed.data.tone,
        },
        audienceRelation: parsed.data.audience ? {
          audience: parsed.data.audience,
        } : {},
        professionalPreferences: {
          contentPillars,
          hooks,
          reminders,
          callToAction: parsed.data.callToAction,
        },
      },
    });

    revalidatePath("/");
    return { ok: true, message: "人设已创建" };
  } catch (error) {
    console.error("Create persona failed", error);
    return { ok: false, message: "创建人设失败，请稍后再试" };
  }
}

// 获取单个persona数据（用于编辑）
export async function getPersonaById(personaId: string) {
  if (!(await dbAvailable())) {
    return null;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    const persona = await prisma.persona.findFirst({
      where: {
        id: personaId,
        userId: user.id, // 确保只能获取当前用户的人设
      },
    });

    return persona;
  } catch (error) {
    console.error("Failed to get persona", error);
    return null;
  }
}

// 获取用于编辑的persona数据（返回 PersonaParseResult 格式）
export async function getPersonaForEdit(personaId: string): Promise<PersonaParseResult | null> {
  if (!(await dbAvailable())) {
    return null;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    const persona = await prisma.persona.findFirst({
      where: {
        id: personaId,
        userId: user.id, // 确保只能获取当前用户的人设
      },
    });

    if (!persona) {
      return null;
    }

    return convertDbPersonaToParseResult(persona);
  } catch (error) {
    console.error("Failed to get persona for edit", error);
    return null;
  }
}

// 更新人设
export async function updatePersonaAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const personaId = formData.get("personaId") as string | null;
  if (!personaId) {
    return { ok: false, message: "人设ID不能为空" };
  }

  // 辅助函数：将 FormData 的 null 值转换为 undefined
  const getFormValue = (key: string): string | undefined => {
    const value = formData.get(key);
    return value === null ? undefined : (typeof value === "string" ? value : undefined);
  };

  const parsed = personaSchema.safeParse({
    name: formData.get("name"),
    domain: formData.get("domain"),
    style: formData.get("style"),
    background: getFormValue("background"),
    audience: getFormValue("audience"),
    voice: getFormValue("voice"),
    tone: getFormValue("tone"),
    tagline: getFormValue("tagline"),
    alias: getFormValue("alias"),
    contentPillars: getFormValue("contentPillars"),
    hooks: getFormValue("hooks"),
    reminders: getFormValue("reminders"),
    bio: getFormValue("bio"),
    callToAction: getFormValue("callToAction"),
    avatarUrl: getFormValue("avatarUrl"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "输入不合法" };
  }

  if (!(await dbAvailable())) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    // 检查人设是否存在且属于当前用户
    const existingPersona = await prisma.persona.findFirst({
      where: {
        id: personaId,
        userId: user.id,
      },
    });

    if (!existingPersona) {
      return { ok: false, message: "人设不存在或无权访问" };
    }

    // Parse array fields
    const parseArrayField = (value: string | undefined): string[] => {
      if (!value) return [];
      const trimmed = value.trim();
      if (!trimmed) return [];
      
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => typeof item === "string" && item.trim());
        }
      } catch {
        // Not JSON, treat as multiline text
      }
      
      return trimmed
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    };

    const contentPillars = parseArrayField(parsed.data.contentPillars);
    const hooks = parseArrayField(parsed.data.hooks);
    const reminders = parseArrayField(parsed.data.reminders);

    await prisma.persona.update({
      where: { id: personaId },
      data: {
        name: parsed.data.name,
        avatarUrl: parsed.data.avatarUrl && parsed.data.avatarUrl.trim() ? parsed.data.avatarUrl.trim() : null,
        domainTags: parsed.data.domain.split(",").map((tag) => tag.trim()),
        professionalBackground: parsed.data.background ? {
          background: parsed.data.background,
          tagline: parsed.data.tagline,
          alias: parsed.data.alias,
          bio: parsed.data.bio,
        } : {},
        expressionStyle: {
          style: parsed.data.style,
          voice: parsed.data.voice,
          tone: parsed.data.tone,
        },
        audienceRelation: parsed.data.audience ? {
          audience: parsed.data.audience,
        } : {},
        professionalPreferences: {
          contentPillars,
          hooks,
          reminders,
          callToAction: parsed.data.callToAction,
        },
      },
    });

    revalidatePath("/");
    revalidatePath("/dashboard/personas");
    return { ok: true, message: "人设已更新" };
  } catch (error) {
    console.error("Update persona failed", error);
    return { ok: false, message: "更新人设失败，请稍后再试" };
  }
}

// 复制人设
export async function copyPersonaAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const personaId = formData.get("personaId") as string | null;
  if (!personaId) {
    return { ok: false, message: "人设ID不能为空" };
  }

  if (!(await dbAvailable())) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    // 获取原人设数据
    const originalPersona = await prisma.persona.findFirst({
      where: {
        id: personaId,
        userId: user.id,
      },
    });

    if (!originalPersona) {
      return { ok: false, message: "人设不存在或无权访问" };
    }

    // 从原始数据中提取 JSON 字段并重新构造对象
    const domainTags = Array.isArray(originalPersona.domainTags) 
      ? (originalPersona.domainTags as string[])
      : [];
    
    const professionalBackground = originalPersona.professionalBackground as ProfessionalBackground | null;
    const expressionStyle = originalPersona.expressionStyle as ExpressionStyle;
    const audienceRelation = originalPersona.audienceRelation as AudienceRelation | null;
    const professionalPreferences = originalPersona.professionalPreferences as ProfessionalPreferences | null;

    // 创建新的人设，复制所有字段
    await prisma.persona.create({
      data: {
        userId: user.id,
        name: `${originalPersona.name} (副本)`,
        avatarUrl: originalPersona.avatarUrl,
        domainTags,
        professionalBackground: professionalBackground ? {
          background: professionalBackground.background,
          tagline: professionalBackground.tagline,
          alias: professionalBackground.alias,
          bio: professionalBackground.bio,
        } : {},
        expressionStyle: {
          style: expressionStyle.style,
          voice: expressionStyle.voice,
          tone: expressionStyle.tone,
        },
        audienceRelation: audienceRelation ? {
          audience: audienceRelation.audience,
        } : {},
        professionalPreferences: {
          contentPillars: professionalPreferences?.contentPillars || [],
          hooks: professionalPreferences?.hooks || [],
          reminders: professionalPreferences?.reminders || [],
          callToAction: professionalPreferences?.callToAction,
        },
        isTemplate: originalPersona.isTemplate,
        templateCategory: originalPersona.templateCategory,
      },
    });

    revalidatePath("/");
    revalidatePath("/dashboard/personas");
    return { ok: true, message: "人设已复制" };
  } catch (error) {
    console.error("Copy persona failed", error);
    return { ok: false, message: "复制人设失败，请稍后再试" };
  }
}

// 删除人设
export async function deletePersonaAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const personaId = formData.get("personaId") as string | null;
  if (!personaId) {
    return { ok: false, message: "人设ID不能为空" };
  }

  if (!(await dbAvailable())) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    // 检查人设是否存在且属于当前用户
    const existingPersona = await prisma.persona.findFirst({
      where: {
        id: personaId,
        userId: user.id,
      },
    });

    if (!existingPersona) {
      return { ok: false, message: "人设不存在或无权访问" };
    }

    // 删除人设
    await prisma.persona.delete({
      where: { id: personaId },
    });

    revalidatePath("/");
    revalidatePath("/dashboard/personas");
    return { ok: true, message: "人设已删除" };
  } catch (error) {
    console.error("Delete persona failed", error);
    return { ok: false, message: "删除人设失败，请稍后再试" };
  }
}

