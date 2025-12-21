"use server";

/**
 * Persona Post Actions
 *
 * 处理帖子相关的Server Actions
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { dbAvailable, getCurrentUser } from "./utils";
import type { PersonaPostMetadata } from "@/modules/agent/adapters/persona-post";

export async function createPersonaPostAction(data: {
  personaId: string;
  title: string;
  content: string;
  status?: "draft" | "published";
  metadata?: PersonaPostMetadata;
}): Promise<{ ok: boolean; message: string; postId?: string }> {
  if (!(await dbAvailable())) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    // 验证人设是否属于当前用户
    const persona = await prisma.persona.findFirst({
      where: {
        id: data.personaId,
        userId: user.id,
      },
    });

    if (!persona) {
      return { ok: false, message: "人设不存在或无权访问" };
    }

    // 创建帖子
    const post = await prisma.personaPost.create({
      data: {
        personaId: data.personaId,
        title: data.title,
        content: data.content,
        status: data.status || "draft",
        metadata: (data.metadata || {}) as Prisma.InputJsonValue,
      },
    });

    revalidatePath("/persona-posts");
    revalidatePath(`/personas/${data.personaId}`);

    return {
      ok: true,
      message: "帖子创建成功",
      postId: post.id,
    };
  } catch (error) {
    console.error("Create persona post failed:", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "创建帖子失败",
    };
  }
}

export async function updatePersonaPostAction(
  postId: string,
  data: {
    title?: string;
    content?: string;
    status?: "draft" | "published" | "archived";
    metadata?: PersonaPostMetadata;
  }
): Promise<{ ok: boolean; message: string }> {
  if (!(await dbAvailable())) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    // 验证帖子是否属于当前用户
    const post = await prisma.personaPost.findFirst({
      where: {
        id: postId,
      },
      include: {
        persona: true,
      },
    });

    if (!post || post.persona.userId !== user.id) {
      return { ok: false, message: "帖子不存在或无权访问" };
    }

    // 更新帖子
    await prisma.personaPost.update({
      where: { id: postId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content && { content: data.content }),
        ...(data.status && { status: data.status }),
        ...(data.metadata && { metadata: data.metadata as Prisma.InputJsonValue }),
      },
    });

    revalidatePath("/persona-posts");
    revalidatePath(`/personas/${post.personaId}`);

    return {
      ok: true,
      message: "帖子更新成功",
    };
  } catch (error) {
    console.error("Update persona post failed:", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "更新帖子失败",
    };
  }
}

export async function deletePersonaPostAction(
  postId: string
): Promise<{ ok: boolean; message: string }> {
  if (!(await dbAvailable())) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    // 验证帖子是否属于当前用户
    const post = await prisma.personaPost.findFirst({
      where: {
        id: postId,
      },
      include: {
        persona: true,
      },
    });

    if (!post || post.persona.userId !== user.id) {
      return { ok: false, message: "帖子不存在或无权访问" };
    }

    // 删除帖子
    await prisma.personaPost.delete({
      where: { id: postId },
    });

    revalidatePath("/persona-posts");
    revalidatePath(`/personas/${post.personaId}`);

    return {
      ok: true,
      message: "帖子删除成功",
    };
  } catch (error) {
    console.error("Delete persona post failed:", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "删除帖子失败",
    };
  }
}

export async function getPersonaPostsAction(
  personaId?: string
): Promise<{ ok: boolean; message: string; posts?: any[] }> {
  if (!(await dbAvailable())) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    const posts = await prisma.personaPost.findMany({
      where: personaId
        ? {
            personaId,
            persona: {
              userId: user.id,
            },
          }
        : {
            persona: {
              userId: user.id,
            },
          },
      include: {
        persona: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      ok: true,
      message: "获取成功",
      posts,
    };
  } catch (error) {
    console.error("Get persona posts failed:", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "获取帖子列表失败",
    };
  }
}
