/**
 * Persona Posts API
 *
 * 处理帖子的CRUD操作
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/app/actions/utils";
import type { PersonaPostMetadata } from "@/modules/agent/adapters/persona-post";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, message: "请先登录" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const personaId = searchParams.get("personaId");

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

    return NextResponse.json({
      ok: true,
      posts,
    });
  } catch (error) {
    console.error("Get persona posts failed:", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "获取帖子列表失败",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, message: "请先登录" },
        { status: 401 }
      );
    }

    const body = await req.json() as {
      personaId?: string;
      title?: string;
      content?: string;
      status?: string;
      metadata?: unknown;
    };
    const { personaId, title, content, status, metadata } = body;

    // 验证必需字段
    if (!personaId || typeof personaId !== 'string') {
      return NextResponse.json(
        { ok: false, message: "缺少人设ID" },
        { status: 400 }
      );
    }

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { ok: false, message: "缺少帖子标题" },
        { status: 400 }
      );
    }

    // 验证人设是否属于当前用户
    const persona = await prisma.persona.findFirst({
      where: {
        id: personaId,
        userId: user.id,
      },
    });

    if (!persona) {
      return NextResponse.json(
        { ok: false, message: "人设不存在或无权访问" },
        { status: 403 }
      );
    }

    // 创建帖子
    // 确保 metadata 是 JSON-safe 对象，使用 PersonaPostMetadata 类型（包含索引签名）
    const safeMetadata: PersonaPostMetadata = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? metadata as PersonaPostMetadata
      : {};
    
    const post = await prisma.personaPost.create({
      data: {
        personaId,
        title,
        content: content || null, // content 是可选的，可以是 null
        status: (status === "published" ? "published" : "draft") as "draft" | "published",
        metadata: safeMetadata,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "帖子创建成功",
      post,
    });
  } catch (error) {
    console.error("Create persona post failed:", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "创建帖子失败",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, message: "请先登录" },
        { status: 401 }
      );
    }

    const body = await req.json() as { postId?: string };
    const { postId } = body;

    if (!postId) {
      return NextResponse.json(
        { ok: false, message: "缺少帖子ID" },
        { status: 400 }
      );
    }

    const post = await prisma.personaPost.findFirst({
      where: { id: postId },
      include: {
        persona: true,
      },
    });

    if (!post || post.persona.userId !== user.id) {
      return NextResponse.json(
        { ok: false, message: "帖子不存在或无权访问" },
        { status: 403 }
      );
    }

    await prisma.personaPost.delete({
      where: { id: postId },
    });

    return NextResponse.json({
      ok: true,
      message: "帖子删除成功",
    });
  } catch (error) {
    console.error("Delete persona post failed:", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "删除帖子失败",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, message: "请先登录" },
        { status: 401 }
      );
    }

    const body = await req.json() as {
      postId?: string;
      title?: string;
      content?: string;
      status?: string;
      metadata?: unknown;
    };
    const { postId, title, content, status, metadata } = body;

    if (!postId) {
      return NextResponse.json(
        { ok: false, message: "缺少帖子ID" },
        { status: 400 }
      );
    }

    const post = await prisma.personaPost.findFirst({
      where: { id: postId },
      include: {
        persona: true,
      },
    });

    if (!post || post.persona.userId !== user.id) {
      return NextResponse.json(
        { ok: false, message: "帖子不存在或无权访问" },
        { status: 403 }
      );
    }

    // 确保 metadata 是 JSON-safe 对象，使用 PersonaPostMetadata 类型
    const safeMetadata: PersonaPostMetadata | undefined = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? metadata as PersonaPostMetadata
      : undefined;
    
    // 构建更新数据，只包含提供的字段
    const updateData: {
      title?: string;
      content?: string | null;
      status?: "draft" | "published" | "archived";
      metadata?: PersonaPostMetadata;
    } = {};
    
    if (title !== undefined && typeof title === 'string') {
      updateData.title = title;
    }
    
    if (content !== undefined) {
      updateData.content = typeof content === 'string' ? content : null;
    }
    
    if (status !== undefined && typeof status === 'string') {
      if (status === "published" || status === "draft" || status === "archived") {
        updateData.status = status;
      }
    }
    
    if (safeMetadata) {
      updateData.metadata = safeMetadata;
    }
    
    const updated = await prisma.personaPost.update({
      where: { id: postId },
      data: updateData,
    });

    return NextResponse.json({
      ok: true,
      message: "帖子更新成功",
      post: updated,
    });
  } catch (error) {
    console.error("Update persona post failed:", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "更新帖子失败",
      },
      { status: 500 }
    );
  }
}