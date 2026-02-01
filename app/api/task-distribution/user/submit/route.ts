import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { client, bucketName } from "@/lib/tos";
import { randomUUID } from "crypto";

export const maxDuration = 60;

/**
 * 用户提交任务（上传截图）
 * POST /api/task-distribution/user/submit
 * Body: FormData { commentId, sessionId, screenshot: File }
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const commentId = formData.get("commentId") as string;
    const sessionId = formData.get("sessionId") as string;
    const screenshot = formData.get("screenshot") as File | null;

    if (!commentId || !sessionId) {
      return NextResponse.json(
        { ok: false, message: "缺少必要参数 commentId 或 sessionId" },
        { status: 400 }
      );
    }

    if (!screenshot) {
      return NextResponse.json(
        { ok: false, message: "缺少截图文件" },
        { status: 400 }
      );
    }

    // 验证文件类型
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(screenshot.type)) {
      return NextResponse.json(
        { ok: false, message: "截图格式不支持，仅支持 JPG/PNG" },
        { status: 400 }
      );
    }

    // 验证文件大小（5MB）
    const maxSize = 5 * 1024 * 1024;
    if (screenshot.size > maxSize) {
      return NextResponse.json(
        { ok: false, message: "截图文件过大，最大 5MB" },
        { status: 400 }
      );
    }

    // 验证任务状态和 session
    const comment = await prisma.taskComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return NextResponse.json(
        { ok: false, message: "任务不存在" },
        { status: 404 }
      );
    }

    if (comment.status === "completed") {
      return NextResponse.json(
        { ok: false, message: "任务已完成" },
        { status: 400 }
      );
    }

    if (comment.lockedBy !== sessionId) {
      return NextResponse.json(
        { ok: false, message: "无权操作此任务" },
        { status: 403 }
      );
    }

    // 上传截图到 TOS
    const timestamp = Date.now();
    const uuid = randomUUID();
    const extension = screenshot.name.split(".").pop() || "jpg";
    const objectKey = `task-screenshots/${commentId}/${timestamp}-${uuid}.${extension}`;

    const arrayBuffer = await screenshot.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await client.putObject({
      bucket: bucketName,
      key: objectKey,
      body: buffer,
      contentType: screenshot.type,
    });

    // 存 TOS 对象 key，发布者通过 /api/task-distribution/screenshot?key=xxx 查看（按需生成预签名 URL）
    await prisma.taskComment.update({
      where: { id: commentId },
      data: {
        status: "completed",
        completedAt: new Date(),
        screenshotUrl: objectKey,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "提交成功！",
    });
  } catch (error) {
    console.error("[UserTask] Submit error:", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "提交失败",
      },
      { status: 500 }
    );
  }
}

