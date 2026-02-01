import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

export const maxDuration = 30;

/**
 * 用户获取任务
 * GET /api/task-distribution/user/task?platform={platform}&batch={batchId}
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const platform = searchParams.get("platform");
    const batchId = searchParams.get("batch");

    if (!platform) {
      return NextResponse.json(
        { ok: false, message: "缺少必要参数 platform" },
        { status: 400 }
      );
    }

    // 生成会话 ID
    const sessionId = randomUUID();

    // 构建查询条件
    const where: {
      status: "pending";
      post: { platform: string; batchId?: string };
    } = {
      status: "pending",
      post: {
        platform,
      },
    };

    if (batchId) {
      where.post.batchId = batchId;
    }

    // 查询可用的评论（随机选择）
    const comments = await prisma.taskComment.findMany({
      where,
      include: {
        post: {
          select: {
            id: true,
            url: true,
            platform: true,
          },
        },
      },
      take: 10, // 取10个候选，然后随机选择一个
    });

    if (comments.length === 0) {
      return NextResponse.json(
        { ok: false, message: "暂无可用任务" },
        { status: 404 }
      );
    }

    // 随机选择一个
    const randomComment = comments[Math.floor(Math.random() * comments.length)];

    // 锁定评论
    await prisma.taskComment.update({
      where: { id: randomComment.id },
      data: {
        status: "locked",
        lockedAt: new Date(),
        lockedBy: sessionId,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        task: {
          commentId: randomComment.id,
          content: randomComment.content,
          url: randomComment.post.url,
          platform: randomComment.post.platform,
          sessionId,
        },
      },
    });
  } catch (error) {
    console.error("[UserTask] Get task error:", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "获取任务失败",
      },
      { status: 500 }
    );
  }
}

