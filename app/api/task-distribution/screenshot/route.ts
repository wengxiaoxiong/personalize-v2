import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { client, bucketName } from "@/lib/tos";
import { getSessionUser } from "@/app/actions";

/**
 * 发布者查看用户上传的截图
 * GET /api/task-distribution/screenshot?key=task-screenshots/{commentId}/xxx.jpg
 * 校验当前用户拥有该评论所在批次后，重定向到 TOS 预签名 URL
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "未登录" }, { status: 401 });
    }

    const key = req.nextUrl.searchParams.get("key");
    if (!key || !key.startsWith("task-screenshots/")) {
      return NextResponse.json(
        { ok: false, message: "缺少或无效的 key 参数" },
        { status: 400 }
      );
    }

    // key 格式: task-screenshots/{commentId}/{timestamp}-{uuid}.{ext}
    const parts = key.split("/");
    const commentId = parts[1];
    if (!commentId) {
      return NextResponse.json(
        { ok: false, message: "无效的 key" },
        { status: 400 }
      );
    }

    const comment = await prisma.taskComment.findFirst({
      where: { id: commentId },
      include: {
        post: {
          include: {
            batch: true,
          },
        },
      },
    });

    if (!comment || comment.post.batch.userId !== user.id) {
      return NextResponse.json(
        { ok: false, message: "无权查看该截图" },
        { status: 403 }
      );
    }

    const signedUrl = client.getPreSignedUrl({
      bucket: bucketName,
      key,
      expires: 3600, // 1 小时
    });

    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error("[TaskDistribution] screenshot GET error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "获取截图失败" },
      { status: 500 }
    );
  }
}
