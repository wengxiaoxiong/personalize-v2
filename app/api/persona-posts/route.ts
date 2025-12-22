/**
 * Persona Posts API
 *
 * 处理帖子的CRUD操作
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/app/actions/utils";

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

    const { personaId, title, content, status, metadata } = await req.json();

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
    const post = await prisma.personaPost.create({
      data: {
        personaId,
        title,
        content,
        status: status || "draft",
        metadata: metadata || {},
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

    const { postId } = await req.json();

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

    const { postId, title, content, status, metadata } = await req.json();

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

    const updated = await prisma.personaPost.update({
      where: { id: postId },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(status && { status }),
        ...(metadata && { metadata }),
      },
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