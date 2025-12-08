"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/db";
import { client, bucketName } from "@/lib/tos";
import { hashPassword, verifyPassword } from "@/lib/auth";
import type { PersonaParseResult } from "@/lib/persona-parser";
import type { KosPersona } from "@/lib/generated/prisma";
import { xiaohongshuDataSchema } from "@/lib/xiaohongshu-parser";

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

export type PostSummary = {
  id?: string;
  title: string;
  persona: string;
  platform: string;
  status: string;
  created: string;
};

export type RecommendationSummary = {
  id?: string;
  title: string;
  source: string;
  time: string;
  score: string;
  product: string;
  persona: string;
  platform: string;
};

export type MaterialSummary = {
  id?: string;
  name: string;
  type: string;
  sizeLabel: string;
  createdAt?: string;
};

export type DashboardSnapshot = {
  personas: PersonaSummary[];
  posts: PostSummary[];
  recommendations: RecommendationSummary[];
  materials: MaterialSummary[];
};

type MaterialKind = "document" | "image";

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
  posts: [
    {
      title: "小红书 | 护手霜秋冬保湿测评",
      persona: "宝妈体验官 Mia",
      platform: "XiaoHongShu",
      status: "待发布",
      created: "2024-12-01 09:30",
    },
    {
      title: "Instagram | Lifestyle 氛围感大片",
      persona: "小众设计师 Leo",
      platform: "Instagram",
      status: "草稿",
      created: "2024-11-29 16:10",
    },
    {
      title: "LinkedIn | AI SaaS 发布公告",
      persona: "职场达人 Jane",
      platform: "LinkedIn",
      status: "已发布",
      created: "2024-11-28 10:00",
    },
  ],
  recommendations: [
    {
      title: "环保政策落地，绿色消费热度飙升",
      source: "36Kr",
      time: "08:00",
      score: "0.93",
      product: "智能空气净化器",
      persona: "科技测评师 Alex",
      platform: "LinkedIn / X",
    },
    {
      title: "双十二家居新品榜单出炉",
      source: "小红书热榜",
      time: "07:30",
      score: "0.87",
      product: "北欧极简落地灯",
      persona: "小众设计师 Leo",
      platform: "XiaoHongShu",
    },
  ],
  materials: [
    {
      name: "产品卖点白皮书.pdf",
      type: "document",
      sizeLabel: "1.2MB",
    },
    {
      name: "护手霜场景图.jpg",
      type: "image",
      sizeLabel: "840KB",
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

const materialSchema = z.object({
  name: z.string().min(2).optional(),
  type: z.enum(["document", "image"]),
  userId: z.string().uuid().optional(),
});

const generationSchema = z.object({
  title: z.string().min(2),
  persona: z.string().min(1),
  platform: z.string().min(1),
  content: z.string().min(10),
  userId: z.string().uuid().optional(),
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
        posts: [],
        recommendations: [],
        materials: [],
      };
    }

    const [personas, posts, recommendations, materials] = await Promise.all([
      prisma.kosPersona.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
      prisma.contentGeneration.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { kosPersona: true },
      }),
      prisma.recommendation.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { recommendedPersona: true },
      }),
      prisma.productMaterial.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

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
      posts: posts.map((post) => {
        const contentPack = post.contentPack as { title?: string; headline?: string } | null;
        const title = contentPack?.title || contentPack?.headline || post.id;
        const platformList =
          Array.isArray(post.platforms) && post.platforms.length > 0
            ? (post.platforms as string[]).join(", ")
            : String(post.platforms);

        return {
          id: post.id,
          title: String(title),
          persona: post.kosPersona?.name || "未命名人设",
          platform: platformList,
          status: post.status,
          created: post.createdAt.toISOString(),
        };
      }),
      recommendations: recommendations.map((rec) => ({
        id: rec.id,
        title: rec.newsTitle,
        source: rec.newsSource,
        time: rec.bestPublishTime.toISOString(),
        score: rec.relevanceScore.toString(),
        product: rec.recommendedProductId || "重点产品",
        persona: rec.recommendedPersona?.name || "推荐人设",
        platform: Array.isArray(rec.recommendedPlatforms)
          ? (rec.recommendedPlatforms as string[]).join(", ")
          : String(rec.recommendedPlatforms),
      })),
      materials: materials.map((material) => ({
        id: material.id,
        name: material.fileName,
        type: material.materialType,
        sizeLabel: `${Number(material.fileSize) / 1024 / 1024 < 0.1 ? `${Number(material.fileSize) / 1024}KB` : `${(Number(material.fileSize) / 1024 / 1024).toFixed(1)}MB`}`,
        createdAt: material.createdAt.toISOString(),
      })),
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

    await prisma.kosPersona.create({
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

export async function createMaterialAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string | null;

  if (!file) {
    return { ok: false, message: "请选择要上传的文件" };
  }

  if (!type || (type !== "document" && type !== "image")) {
    return { ok: false, message: "请选择素材类型（文档或图片）" };
  }

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
  
  const parsed = materialSchema.safeParse({
    name: formData.get("name") || file.name,
    type: type as "document" | "image",
    userId: userId, // 如果无效或不存在，传递 undefined，让 .optional() 生效
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "素材信息不完整" };
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
    
    // 上传文件到 TOS
    const fileExtension = file.name.split(".").pop() || "";
    const fileName = `${randomUUID()}.${fileExtension}`;
    const objectKey = `materials/${user.id}/${fileName}`;
    
    const fileBuffer = await file.arrayBuffer();
    const fileSize = fileBuffer.byteLength;

    await client.putObject({
      bucket: bucketName,
      key: objectKey,
      body: Buffer.from(fileBuffer),
      contentType: file.type || (parsed.data.type === "document" ? "application/pdf" : "image/jpeg"),
    });

    // 构建 TOS URL（根据你的 TOS 配置调整）
    const tosUrl = `https://${bucketName}.tos-cn-shanghai.volces.com/${objectKey}`;

    // 保存到数据库
    await prisma.productMaterial.create({
      data: {
        userId: user.id, // 始终使用当前登录用户的ID
        materialType: parsed.data.type as MaterialKind,
        filePath: tosUrl,
        fileName: parsed.data.name || file.name,
        fileSize: BigInt(fileSize),
        mimeType: file.type || (parsed.data.type === "document" ? "application/pdf" : "image/jpeg"),
        parsedContent: {},
      },
    });

    revalidatePath("/");
    revalidatePath("/dashboard/materials");
    return { ok: true, message: "素材已上传并保存" };
  } catch (error) {
    console.error("Create material failed", error);
    return { ok: false, message: "上传素材失败，请稍后再试" };
  }
}

export async function recordGenerationAction(
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
  
  const parsed = generationSchema.safeParse({
    title: formData.get("title"),
    persona: formData.get("persona"),
    platform: formData.get("platform"),
    content: formData.get("content"),
    userId: userId, // 如果无效或不存在，传递 undefined，让 .optional() 生效
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "内容不完整" };
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

    // 查找人设，确保只能使用属于当前用户的人设
    const existingPersona =
      (parsed.data.persona.length === 36
        ? await prisma.kosPersona.findFirst({
            where: { id: parsed.data.persona, userId: user.id },
          })
        : await prisma.kosPersona.findFirst({
            where: { userId: user.id, name: parsed.data.persona },
          })) ?? undefined;

    const persona =
      existingPersona ||
      (await prisma.kosPersona.create({
        data: {
          userId: user.id,
          name: parsed.data.persona,
          domainTags: ["社媒", "营销"],
          expressionStyle: "AI 生成文案",
        },
      }));

    const stylePack = await prisma.stylePack.upsert({
      where: { id: "default-style-pack" },
      update: {},
      create: {
        id: "default-style-pack",
        name: "默认风格包",
        category: "通用",
        imageStyles: { palette: "vivid" },
        tone: "balanced",
        recommendedTags: ["AI", "营销"],
        isBuiltin: true,
      },
    });

    const material = await prisma.productMaterial.upsert({
      where: { id: "demo-material" },
      update: {},
      create: {
        id: "demo-material",
        userId: user.id,
        materialType: "document",
        filePath: "/uploads/demo.pdf",
        fileName: "Demo PDF",
        fileSize: BigInt(2048),
        mimeType: "application/pdf",
        parsedContent: { summary: "AI 生成内容" },
      },
    });

    await prisma.contentGeneration.create({
      data: {
        userId: user.id,
        productMaterialId: material.id,
        kosPersonaId: persona.id,
        stylePackId: stylePack.id,
        platforms: [parsed.data.platform],
        contentPack: { title: parsed.data.title, body: parsed.data.content },
        status: "success",
        completedAt: new Date(),
      },
    });

    revalidatePath("/");
    return { ok: true, message: "生成内容已落库" };
  } catch (error) {
    console.error("Record generation failed", error);
    return { ok: false, message: "记录生成结果失败" };
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

    const persona = await prisma.kosPersona.findFirst({
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
function convertDbPersonaToParseResult(dbPersona: KosPersona): PersonaParseResult {
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

    const persona = await prisma.kosPersona.findFirst({
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
    const existingPersona = await prisma.kosPersona.findFirst({
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

    await prisma.kosPersona.update({
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
    const originalPersona = await prisma.kosPersona.findFirst({
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
    await prisma.kosPersona.create({
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
    const existingPersona = await prisma.kosPersona.findFirst({
      where: {
        id: personaId,
        userId: user.id,
      },
    });

    if (!existingPersona) {
      return { ok: false, message: "人设不存在或无权访问" };
    }

    // 删除人设
    await prisma.kosPersona.delete({
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

/**
 * 保存小红书导入的JSON数据到数据库
 * 使用 Zod schema 进行严格验证，数据结构不符合预期则不保存
 */
export async function saveXiaohongshuPostAction(
  rawData: unknown
): Promise<ActionState> {
  console.log("saveXiaohongshuPostAction called with data:", JSON.stringify(rawData).substring(0, 200));
  
  // 使用 Zod schema 验证数据结构
  const validationResult = xiaohongshuDataSchema.safeParse(rawData);
  
  if (!validationResult.success) {
    const errorMessages = validationResult.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "根对象";
      return `${path}: ${issue.message}`;
    }).join("; ");
    console.error("小红书数据结构验证失败:", errorMessages);
    console.error("详细错误:", validationResult.error.format());
    return { 
      ok: false, 
      message: `数据结构不符合预期: ${errorMessages}` 
    };
  }

  const validatedData = validationResult.data;
  
  if (!dbAvailable()) {
    console.error("数据库未连接");
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error("用户未登录");
      return { ok: false, message: "请先登录" };
    }

    console.log("当前用户ID:", user.id);

    // 提取常用字段方便查询
    const userInfo = validatedData.userInfo;
    const nickname = userInfo?.nickname || null;
    const redId = userInfo?.redId || null;
    const avatar = userInfo?.avatar || null;
    const description = userInfo?.description || null;
    const feedCount = validatedData.count ?? validatedData.feeds?.length ?? null;
    const sourceUrl = validatedData.url || null;

    console.log("准备保存数据:", {
      userId: user.id,
      nickname,
      redId,
      feedCount,
    });

    // 检查 Prisma 客户端是否包含 personaPost 模型
    if (!prisma.personaPost) {
      const errorMsg = "Prisma 客户端未包含 personaPost 模型。请运行: npx prisma generate";
      console.error(errorMsg);
      return { ok: false, message: errorMsg };
    }

    // 保存到数据库 - validatedData 已经通过 Zod 验证，类型安全
    // 将数据转换为 Prisma 接受的 JSON 格式（序列化后再解析以确保类型正确）
    const jsonData = JSON.parse(JSON.stringify(validatedData));
    
    const result = await prisma.personaPost.create({
      data: {
        userId: user.id,
        rawData: jsonData, // 已验证并序列化的数据
        nickname,
        redId,
        avatar,
        description,
        feedCount,
        sourceUrl,
      },
    });

    console.log("小红书数据已保存，ID:", result.id);
    return { ok: true, message: "小红书数据已保存" };
  } catch (error) {
    console.error("Save Xiaohongshu post failed", error);
    if (error instanceof Error) {
      console.error("错误详情:", error.message);
      console.error("错误堆栈:", error.stack);
    }
    return { ok: false, message: `保存小红书数据失败: ${error instanceof Error ? error.message : "未知错误"}` };
  }
}