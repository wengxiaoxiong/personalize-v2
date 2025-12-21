"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { randomUUID } from "crypto";
import { generateText } from "ai";

import { prisma } from "@/lib/db";
import { client, bucketName } from "@/lib/tos";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { deepseek, DEFAULT_MODEL } from "@/lib/ai";
import type { PersonaParseResult } from "@/lib/persona-parser";
import type { Persona } from "@/lib/generated/prisma";

export type PersonaSummary = {
  id?: string;
  name: string;
  domain: string[];
  style: string;
  usage: number;
  lastUsed: string;
  badge?: string;
  avatarUrl?: string | null;
  // 扩展字段
  alias?: string;
  tagline?: string;
  audience?: string;
  voice?: string;
  tone?: string;
  background?: string;
  bio?: string;
  callToAction?: string;
  contentPillars?: string[];
  hooks?: string[];
};

export type DashboardSnapshot = {
  personas: PersonaSummary[];
};

export type ActionState = {
  ok: boolean;
  message: string;
};

export async function getAuthUser() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("auth-user")?.value;
  return authCookie ?? null;
}

export async function getSessionUser() {
  const email = await getAuthUser();
  if (!email) {
    return null;
  }

  if (!dbAvailable()) {
    // 如果没有数据库，返回一个默认的用户对象
    return {
      id: DEMO_USER_ID,
      email,
      username: email.split("@")[0], // 使用邮箱前缀作为用户名
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });
    // 如果数据库中没有找到用户，返回 null（表示未登录）
    if (!user) {
      return null;
    }
    return user;
  } catch (error) {
    console.error("Failed to get session user", error);
    return null;
  }
}

export async function getCurrentUser() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !dbAvailable()) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
    });
    return user;
  } catch (error) {
    console.error("Failed to get current user", error);
    return null;
  }
}

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
  avatarUrl: z.union([z.string().url(), z.literal("")]).optional(),
});


const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(2).optional(),
});

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

function dbAvailable() {
  return Boolean(process.env.DATABASE_URL);
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, message: "请提供有效的邮箱和至少6位密码" };
  }

  if (!dbAvailable()) {
    return { ok: false, message: "数据库未连接，无法登录" };
  }

  try {
    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (!user) {
      return { ok: false, message: "邮箱或密码错误" };
    }

    // 验证密码
    const isValid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!isValid) {
      return { ok: false, message: "邮箱或密码错误" };
    }

    // 设置认证 cookie
    const cookieStore = await cookies();
    cookieStore.set("auth-user", parsed.data.email, {
      path: "/",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return { ok: true, message: "登录成功" };
  } catch (error) {
    console.error("Login failed", error);
    return { ok: false, message: "登录失败，请稍后再试" };
  }
}

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    username: formData.get("username"),
  });

  if (!parsed.success) {
    return { ok: false, message: "请填写有效邮箱、用户名和至少6位密码" };
  }

  if (!parsed.data.username) {
    return { ok: false, message: "用户名是必填项" };
  }

  if (!dbAvailable()) {
    return { ok: false, message: "数据库未连接，无法注册" };
  }

  try {
    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (existingUser) {
      return { ok: false, message: "该邮箱已被注册" };
    }

    // 检查用户名是否已存在
    const existingUsername = await prisma.user.findUnique({
      where: { username: parsed.data.username },
    });

    if (existingUsername) {
      return { ok: false, message: "该用户名已被使用" };
    }

    // 哈希密码
    const passwordHash = await hashPassword(parsed.data.password);

    // 创建用户
    await prisma.user.create({
      data: {
        email: parsed.data.email,
        username: parsed.data.username,
        passwordHash,
      },
    });

    // 设置认证 cookie
    const cookieStore = await cookies();
    cookieStore.set("auth-user", parsed.data.email, {
      path: "/",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return { ok: true, message: "注册成功" };
  } catch (error) {
    console.error("Register failed", error);
    return { ok: false, message: "注册失败，请稍后再试" };
  }
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  if (!dbAvailable()) {
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
    });

    return {
      personas: personas.map((p) => {
        const professionalBackground = p.professionalBackground as ProfessionalBackground | null;
        const expressionStyle = p.expressionStyle as ExpressionStyle;
        const audienceRelation = p.audienceRelation as AudienceRelation | null;
        const professionalPreferences = p.professionalPreferences as ProfessionalPreferences | null;

        return {
          id: p.id,
          name: p.name,
          domain: (p.domainTags as string[]) || [],
          style: expressionStyle.style || "结构化表达",
          usage: 0,
          lastUsed: p.updatedAt.toLocaleDateString("zh-CN"),
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

  if (!dbAvailable()) {
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
  if (!dbAvailable()) {
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

// JSON 字段的类型定义
type ProfessionalBackground = {
  background?: string;
  tagline?: string;
  alias?: string;
  bio?: string;
};

type ExpressionStyle = {
  style?: string;
  voice?: string;
  tone?: string;
};

type AudienceRelation = {
  audience?: string;
};

type ProfessionalPreferences = {
  contentPillars?: string[];
  hooks?: string[];
  reminders?: string[];
  callToAction?: string;
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

// 获取用于编辑的persona数据（返回 PersonaParseResult 格式）
export async function getPersonaForEdit(personaId: string): Promise<PersonaParseResult | null> {
  if (!dbAvailable()) {
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

  const parsed = personaSchema.safeParse({
    name: formData.get("name"),
    domain: formData.get("domain"),
    style: formData.get("style"),
    background: formData.get("background"),
    audience: formData.get("audience"),
    voice: formData.get("voice"),
    tone: formData.get("tone"),
    tagline: formData.get("tagline"),
    alias: formData.get("alias"),
    contentPillars: formData.get("contentPillars"),
    hooks: formData.get("hooks"),
    reminders: formData.get("reminders"),
    bio: formData.get("bio"),
    callToAction: formData.get("callToAction"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "输入不合法" };
  }

  if (!dbAvailable()) {
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

  if (!dbAvailable()) {
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

  if (!dbAvailable()) {
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

// ==================== Project Actions ====================

const projectSchema = z.object({
  name: z.string().min(1, "项目名称不能为空"),
  metadata: z.record(z.unknown()).optional(),
});

export async function createProjectAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    metadata: formData.get("metadata")
      ? JSON.parse(formData.get("metadata") as string)
      : undefined,
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "输入不合法" };
  }

  if (!dbAvailable()) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    await prisma.project.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        metadata: parsed.data.metadata || {},
      },
    });

    revalidatePath("/projects");
    return { ok: true, message: "项目已创建" };
  } catch (error) {
    console.error("Create project failed", error);
    return { ok: false, message: "创建项目失败，请稍后再试" };
  }
}

export async function getProjects() {
  if (!dbAvailable()) {
    return [];
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        assets: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
      },
    });

    return projects;
  } catch (error) {
    console.error("Failed to get projects", error);
    return [];
  }
}

export async function getProjectById(projectId: string) {
  if (!dbAvailable()) {
    return null;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
      include: {
        assets: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return project;
  } catch (error) {
    console.error("Failed to get project", error);
    return null;
  }
}

export async function updateProjectAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const projectId = formData.get("projectId") as string | null;
  if (!projectId) {
    return { ok: false, message: "项目ID不能为空" };
  }

  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    metadata: formData.get("metadata")
      ? JSON.parse(formData.get("metadata") as string)
      : undefined,
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "输入不合法" };
  }

  if (!dbAvailable()) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    // 检查项目是否存在且属于当前用户
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
    });

    if (!existingProject) {
      return { ok: false, message: "项目不存在或无权访问" };
    }

    await prisma.project.update({
      where: { id: projectId },
      data: {
        name: parsed.data.name,
        metadata: parsed.data.metadata,
      },
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);
    return { ok: true, message: "项目已更新" };
  } catch (error) {
    console.error("Update project failed", error);
    return { ok: false, message: "更新项目失败，请稍后再试" };
  }
}

export async function deleteProjectAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const projectId = formData.get("projectId") as string | null;
  if (!projectId) {
    return { ok: false, message: "项目ID不能为空" };
  }

  if (!dbAvailable()) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    // 检查项目是否存在且属于当前用户
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
    });

    if (!existingProject) {
      return { ok: false, message: "项目不存在或无权访问" };
    }

    // 删除项目（级联删除所有资产）
    await prisma.project.delete({
      where: { id: projectId },
    });

    revalidatePath("/projects");
    return { ok: true, message: "项目已删除" };
  } catch (error) {
    console.error("Delete project failed", error);
    return { ok: false, message: "删除项目失败，请稍后再试" };
  }
}

// ==================== ProjectAsset Actions ====================

const projectAssetSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1, "文件名不能为空"),
  tosObjectKey: z.string().min(1, "TOS对象键不能为空"),
  metadata: z.record(z.unknown()).optional(),
});

export async function createProjectAssetAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = projectAssetSchema.safeParse({
    projectId: formData.get("projectId"),
    name: formData.get("name"),
    tosObjectKey: formData.get("tosObjectKey"),
    metadata: formData.get("metadata")
      ? JSON.parse(formData.get("metadata") as string)
      : undefined,
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "输入不合法" };
  }

  if (!dbAvailable()) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    // 检查项目是否存在且属于当前用户
    const project = await prisma.project.findFirst({
      where: {
        id: parsed.data.projectId,
        userId: user.id,
      },
    });

    if (!project) {
      return { ok: false, message: "项目不存在或无权访问" };
    }

    await prisma.projectAsset.create({
      data: {
        projectId: parsed.data.projectId,
        name: parsed.data.name,
        tosObjectKey: parsed.data.tosObjectKey,
        metadata: parsed.data.metadata || {},
      },
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${parsed.data.projectId}`);
    return { ok: true, message: "文档已上传" };
  } catch (error) {
    console.error("Create project asset failed", error);
    return { ok: false, message: "上传文档失败，请稍后再试" };
  }
}

export async function getProjectAssets(projectId: string) {
  if (!dbAvailable()) {
    return [];
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    // 验证项目属于当前用户
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
    });

    if (!project) {
      return [];
    }

    const assets = await prisma.projectAsset.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return assets;
  } catch (error) {
    console.error("Failed to get project assets", error);
    return [];
  }
}

export async function getProjectAssetById(assetId: string) {
  if (!dbAvailable()) {
    return null;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    const asset = await prisma.projectAsset.findFirst({
      where: { id: assetId },
      include: {
        project: {
          select: {
            userId: true,
          },
        },
      },
    });

    // 验证资产属于当前用户的项目
    if (!asset || asset.project.userId !== user.id) {
      return null;
    }

    return asset;
  } catch (error) {
    console.error("Failed to get project asset", error);
    return null;
  }
}

export async function updateProjectAssetAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const assetId = formData.get("assetId") as string | null;
  if (!assetId) {
    return { ok: false, message: "文档ID不能为空" };
  }

  const metadataStr = formData.get("metadata") as string | null;
  let metadata: Record<string, unknown> | undefined;

  if (metadataStr) {
    try {
      metadata = JSON.parse(metadataStr);
    } catch {
      return { ok: false, message: "metadata格式不正确" };
    }
  }

  if (!dbAvailable()) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    // 检查资产是否存在且属于当前用户的项目
    const existingAsset = await prisma.projectAsset.findFirst({
      where: { id: assetId },
      include: {
        project: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!existingAsset || existingAsset.project.userId !== user.id) {
      return { ok: false, message: "文档不存在或无权访问" };
    }

    await prisma.projectAsset.update({
      where: { id: assetId },
      data: {
        metadata,
      },
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${existingAsset.projectId}`);
    return { ok: true, message: "文档已更新" };
  } catch (error) {
    console.error("Update project asset failed", error);
    return { ok: false, message: "更新文档失败，请稍后再试" };
  }
}

export async function deleteProjectAssetAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const assetId = formData.get("assetId") as string | null;
  if (!assetId) {
    return { ok: false, message: "文档ID不能为空" };
  }

  if (!dbAvailable()) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    // 检查资产是否存在且属于当前用户的项目
    const existingAsset = await prisma.projectAsset.findFirst({
      where: { id: assetId },
      include: {
        project: {
          select: {
            userId: true,
            id: true,
          },
        },
      },
    });

    if (!existingAsset || existingAsset.project.userId !== user.id) {
      return { ok: false, message: "文档不存在或无权访问" };
    }

    // 删除资产
    await prisma.projectAsset.delete({
      where: { id: assetId },
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${existingAsset.project.id}`);
    return { ok: true, message: "文档已删除" };
  } catch (error) {
    console.error("Delete project asset failed", error);
    return { ok: false, message: "删除文档失败，请稍后再试" };
  }
}

// ==================== TOS Actions ====================

export async function getPresignedUploadUrl(
  fileName: string,
  contentType: string,
): Promise<{ ok: boolean; url?: string; objectKey?: string; message?: string }> {
  if (!dbAvailable()) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    // 生成唯一的对象键
    const timestamp = Date.now();
    const uuid = randomUUID();
    const extension = fileName.split(".").pop();
    const objectKey = `projects/${user.id}/${timestamp}-${uuid}.${extension}`;

    // 生成预签名上传 URL
    const response = await client.preSignedPutObject({
      bucket: bucketName,
      key: objectKey,
      expires: 3600, // 1小时有效期
      contentType,
    });

    return {
      ok: true,
      url: response.data.signedUrl,
      objectKey,
    };
  } catch (error) {
    console.error("Failed to get presigned upload URL", error);
    return { ok: false, message: "获取上传链接失败" };
  }
}

export async function getPresignedDownloadUrl(
  objectKey: string,
): Promise<{ ok: boolean; url?: string; message?: string }> {
  if (!dbAvailable()) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    // 验证对象键是否属于当前用户
    // 对象键格式: projects/{userId}/{timestamp}-{uuid}.{ext}
    if (!objectKey.startsWith(`projects/${user.id}/`)) {
      return { ok: false, message: "无权访问此文件" };
    }

    // 生成预签名下载 URL
    const response = await client.preSignedGetObject({
      bucket: bucketName,
      key: objectKey,
      expires: 3600, // 1小时有效期
    });

    return {
      ok: true,
      url: response.data.signedUrl,
    };
  } catch (error) {
    console.error("Failed to get presigned download URL", error);
    return { ok: false, message: "获取下载链接失败" };
  }
}

// ==================== AI Knowledge Base Generation ====================

interface ProjectAssetMetadata {
  textContent?: string;
  fileType?: string;
  fileSize?: number;
  pageCount?: number;
  aiSummary?: string;
  extractedAt?: string;
}

interface KnowledgeBaseMetadata {
  aiKnowledgeBase?: string;
  summary?: string;
  keyPoints?: string[];
  categories?: string[];
  generatedAt?: string;
  documentCount?: number;
  totalTextLength?: number;
}

export async function generateKnowledgeBaseAction(
  projectId: string,
): Promise<{ ok: boolean; message: string; data?: KnowledgeBaseMetadata }> {
  if (!dbAvailable()) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    // 1. 获取项目信息
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
      include: {
        assets: true,
      },
    });

    if (!project) {
      return { ok: false, message: "项目不存在或无权访问" };
    }

    // 2. 提取所有文档的文本内容
    const texts = project.assets
      .map((asset) => {
        const metadata = asset.metadata as ProjectAssetMetadata;
        const text = metadata.textContent || "";
        return {
          name: asset.name,
          text,
        };
      })
      .filter((item) => item.text.length > 0);

    if (texts.length === 0) {
      return { ok: false, message: "项目中没有可用的文档内容" };
    }

    // 3. 合并所有文本
    const allText = texts.map((item) => `# ${item.name}\n\n${item.text}`).join("\n\n---\n\n");
    const totalTextLength = allText.length;

    // 4. 使用 AI 生成知识库
    const { text: aiResponse } = await generateText({
      model: deepseek(DEFAULT_MODEL),
      messages: [
        {
          role: "system",
          content: `你是一个专业的文档分析助手。你的任务是分析用户提供的文档内容，生成结构化的知识库总结。

请按照以下 JSON 格式返回结果：
{
  "summary": "整体总结（200-300字）",
  "keyPoints": ["关键点1", "关键点2", "关键点3", ...],
  "categories": ["分类1", "分类2", ...]
}

要求：
1. summary 要简洁明了，概括文档的核心内容
2. keyPoints 要提取3-8个最重要的要点
3. categories 要归纳文档所属的2-5个主题分类
4. 必须返回有效的 JSON 格式`,
        },
        {
          role: "user",
          content: `请分析以下文档内容并生成知识库总结：\n\n${allText.substring(0, 50000)}`, // 限制在 50k 字符
        },
      ],
      temperature: 0.7,
      maxTokens: 2000,
    });

    // 5. 解析 AI 响应
    let parsedResponse: { summary: string; keyPoints: string[]; categories: string[] };
    try {
      // 尝试从响应中提取 JSON
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        // 如果没有找到 JSON，使用默认格式
        parsedResponse = {
          summary: aiResponse.substring(0, 300),
          keyPoints: ["AI 响应格式解析失败"],
          categories: ["未分类"],
        };
      }
    } catch (parseError) {
      console.error("Failed to parse AI response", parseError);
      parsedResponse = {
        summary: aiResponse.substring(0, 300),
        keyPoints: ["AI 响应格式解析失败"],
        categories: ["未分类"],
      };
    }

    // 6. 构建知识库元数据
    const knowledgeBaseMetadata: KnowledgeBaseMetadata = {
      aiKnowledgeBase: allText.substring(0, 100000), // 存储前 100k 字符
      summary: parsedResponse.summary,
      keyPoints: parsedResponse.keyPoints,
      categories: parsedResponse.categories,
      generatedAt: new Date().toISOString(),
      documentCount: texts.length,
      totalTextLength,
    };

    // 7. 更新项目 metadata
    await prisma.project.update({
      where: { id: projectId },
      data: {
        metadata: knowledgeBaseMetadata,
      },
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);

    return {
      ok: true,
      message: "知识库生成成功",
      data: knowledgeBaseMetadata,
    };
  } catch (error) {
    console.error("Generate knowledge base failed", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "生成知识库失败，请稍后再试",
    };
  }
}
