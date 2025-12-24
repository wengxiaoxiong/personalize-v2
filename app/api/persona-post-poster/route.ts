/**
 * Persona Post Poster API
 *
 * 根据 posterPath 生成预签名 URL，用于访问私有 bucket 中的图片
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

    if (!path) {
      return NextResponse.json(
        { ok: false, message: "缺少 path 参数" },
        { status: 400 }
      );
    }

    // 生成预签名 URL，有效期 24 小时（86400 秒）
    const signedUrl = client.getPreSignedUrl({
      bucket: bucketName,
      key: path,
      expires: 86400, // 24 小时
    });

    console.log("[PersonaPostPoster] generated pre-signed URL:", {
      path,
      signedUrl: signedUrl.substring(0, 100) + "...", // 只打印前 100 字符，避免日志过长
    });

    return NextResponse.json({
      ok: true,
      url: signedUrl,
      path,
      expiresIn: 86400,
    });
  } catch (error) {
    console.error("Generate pre-signed URL failed:", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "生成预签名 URL 失败",
      },
      { status: 500 }
    );
  }
}

