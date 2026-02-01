import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const maxDuration = 30;

/**
 * 释放超时锁定的任务
 * GET /api/task-distribution/release-timeout
 * 定时任务调用此接口，释放超过30分钟的锁定任务
 */
export async function GET() {
  try {
    // 锁定超时时间：30分钟
    const LOCK_TIMEOUT_MS = 30 * 60 * 1000;
    const timeoutDate = new Date(Date.now() - LOCK_TIMEOUT_MS);

    // 查找所有超时的锁定任务
    const result = await prisma.taskComment.updateMany({
      where: {
        status: "locked",
        lockedAt: {
          lt: timeoutDate,
        },
      },
      data: {
        status: "pending",
        lockedAt: null,
        lockedBy: null,
      },
    });

    return NextResponse.json({
      ok: true,
      message: `释放了 ${result.count} 个超时锁定的任务`,
      data: {
        releasedCount: result.count,
      },
    });
  } catch (error) {
    console.error("[ReleaseTimeout] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "释放超时任务失败",
      },
      { status: 500 }
    );
  }
}

