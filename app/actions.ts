"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { prisma } from "@/lib/db";

export type PersonaSummary = {
  id?: string;
  name: string;
  domain: string[];
  style: string;
  usage: number;
  lastUsed: string;
  badge?: string;
  avatarUrl?: string | null;
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
});

const materialSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["document", "image"]),
  sizeLabel: z.string().min(1),
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

async function ensureDemoUser() {
  const user = await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: {
      id: DEMO_USER_ID,
      email: "demo@personalize.ai",
      username: "demo_user",
      passwordHash: "demo",
      subscriptionPlan: "pro",
    },
  });
  return user;
}

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

  const cookieStore = await cookies();
  cookieStore.set("auth-user", parsed.data.email, {
    path: "/",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
  });

  return { ok: true, message: "登录成功" };
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

  const cookieStore = await cookies();
  cookieStore.set("auth-user", parsed.data.email, {
    path: "/",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
  });

  if (dbAvailable()) {
    await ensureDemoUser();
  }

  return { ok: true, message: "注册成功" };
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  if (!dbAvailable()) {
    return fallbackSnapshot;
  }

  try {
    const user = await ensureDemoUser();
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
      personas: personas.map((p) => ({
        id: p.id,
        name: p.name,
        domain: (p.domainTags as string[]) || [],
        style:
          typeof p.expressionStyle === "string"
            ? p.expressionStyle
            : Array.isArray(p.expressionStyle)
              ? p.expressionStyle.join(" · ")
              : "结构化表达",
        usage: 0,
        lastUsed: p.updatedAt.toLocaleDateString("zh-CN"),
        avatarUrl: p.avatarUrl,
      })),
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
  const parsed = personaSchema.safeParse({
    name: formData.get("name"),
    domain: formData.get("domain"),
    style: formData.get("style"),
    userId: formData.get("userId") || DEMO_USER_ID,
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message || "输入不合法" };
  }

  if (!dbAvailable()) {
    return { ok: true, message: "未连接数据库，已保存到演示列表" };
  }

  try {
    const user = await ensureDemoUser();
    await prisma.kosPersona.create({
      data: {
        userId: parsed.data.userId || user.id,
        name: parsed.data.name,
        domainTags: parsed.data.domain.split(",").map((tag) => tag.trim()),
        expressionStyle: parsed.data.style,
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
  const parsed = materialSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    sizeLabel: formData.get("size"),
    userId: formData.get("userId") || DEMO_USER_ID,
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message || "素材信息不完整" };
  }

  if (!dbAvailable()) {
    return { ok: true, message: "未连接数据库，已记录素材信息（演示）" };
  }

  try {
    const user = await ensureDemoUser();
    await prisma.productMaterial.create({
      data: {
        userId: parsed.data.userId || user.id,
          materialType: parsed.data.type as MaterialKind,
        filePath: `/uploads/${parsed.data.name}`,
        fileName: parsed.data.name,
        fileSize: 1024n * 1024n,
        mimeType: parsed.data.type === "document" ? "application/pdf" : "image/jpeg",
        parsedContent: {},
      },
    });
    revalidatePath("/");
    return { ok: true, message: "素材记录已保存" };
  } catch (error) {
    console.error("Create material failed", error);
    return { ok: false, message: "保存素材失败，请稍后再试" };
  }
}

export async function recordGenerationAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = generationSchema.safeParse({
    title: formData.get("title"),
    persona: formData.get("persona"),
    platform: formData.get("platform"),
    content: formData.get("content"),
    userId: formData.get("userId") || DEMO_USER_ID,
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message || "内容不完整" };
  }

  if (!dbAvailable()) {
    return { ok: true, message: "未连接数据库，已记录到演示生成列表" };
  }

  try {
    const user = await ensureDemoUser();

    const existingPersona =
      (parsed.data.persona.length === 36
        ? await prisma.kosPersona.findUnique({ where: { id: parsed.data.persona } })
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
        fileSize: 2048n,
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
