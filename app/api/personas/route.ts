/**
 * Personas API
 *
 * 获取用户的人设列表
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/app/actions/utils";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, message: "请先登录" },
        { status: 401 }
      );
    }

    const personas = await prisma.persona.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        domainTags: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      personas,
    });
  } catch (error) {
    console.error("Get personas failed:", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "获取人设列表失败",
      },
      { status: 500 }
    );
  }
}
