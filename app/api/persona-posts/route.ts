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
