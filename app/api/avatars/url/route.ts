/**
 * Avatar URL API
 *
 * 根据 avatarPath (objectKey) 生成预签名 URL，用于访问私有 bucket 中的头像
 */

import { NextResponse } from "next/server";
import { client, bucketName } from "@/lib/tos";
import { getSessionUser } from "@/app/actions/utils";

export const maxDuration = 30;

export async function GET(req: Request) {
  try {
    // 验证用户身份
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, message: "请先登录" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");

    if (!path || typeof path !== "string") {
      return NextResponse.json(
        { ok: false, message: "缺少 path 参数" },
        { status: 400 }
      );
    }

    // 验证路径格式（必须是 avatars/ 开头）
    if (!path.startsWith("avatars/")) {
      return NextResponse.json(
        { ok: false, message: "无效的头像路径格式" },
        { status: 400 }
      );
    }

    // 防止路径遍历攻击（检查是否包含 .. 或 //）
    if (path.includes("..") || path.includes("//")) {
      return NextResponse.json(
        { ok: false, message: "无效的头像路径格式" },
        { status: 400 }
      );
    }

    // 验证路径是否属于当前用户（安全验证）
    const expectedPrefix = `avatars/${user.id}/`;
    if (!path.startsWith(expectedPrefix)) {
      return NextResponse.json(
        { ok: false, message: "无权访问此头像" },
        { status: 403 }
      );
    }

    // 验证路径长度（防止过长的路径）
    if (path.length > 500) {
      return NextResponse.json(
        { ok: false, message: "头像路径过长" },
        { status: 400 }
      );
    }

    // 生成预签名 URL，有效期 24 小时（86400 秒）
    const signedUrl = client.getPreSignedUrl({
      bucket: bucketName,
      key: path,
      expires: 86400, // 24 小时
    });

    console.log("[AvatarUrl] generated pre-signed URL:", {
      path,
      urlLength: signedUrl.length,
    });

    return NextResponse.json({
      ok: true,
      url: signedUrl,
      path,
      expiresIn: 86400,
    });
  } catch (error) {
    console.error("Generate avatar pre-signed URL failed:", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "生成预签名 URL 失败",
      },
      { status: 500 }
    );
  }
}

