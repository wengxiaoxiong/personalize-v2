import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { client, bucketName } from "@/lib/tos";
import { getSessionUser } from "@/app/actions/utils";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // 验证用户身份
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, message: "请先登录" },
        { status: 401 }
      );
    }

    // 解析 FormData
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, message: "缺少文件" },
        { status: 400 }
      );
    }

    // 验证文件类型（只允许图片）
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { ok: false, message: "只支持图片格式（JPG、PNG、GIF、WebP）" },
        { status: 400 }
      );
    }

    // 验证文件大小（最大 5MB）
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { ok: false, message: "图片大小不能超过 5MB" },
        { status: 400 }
      );
    }

    // 生成唯一的对象键（使用 avatars 目录）
    const timestamp = Date.now();
    const uuid = randomUUID();
    // 安全地获取文件扩展名，默认为 jpg
    const fileNameParts = file.name.split(".");
    const extension = fileNameParts.length > 1 && fileNameParts[fileNameParts.length - 1]
      ? fileNameParts[fileNameParts.length - 1].toLowerCase()
      : "jpg";
    // 验证扩展名（只允许图片格式）
    const allowedExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
    const safeExtension = allowedExtensions.includes(extension) ? extension : "jpg";
    const objectKey = `avatars/${user.id}/${timestamp}-${uuid}.${safeExtension}`;

    // 将文件转换为 Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 上传文件到 TOS
    await client.putObject({
      bucket: bucketName,
      key: objectKey,
      body: buffer,
      contentType: file.type,
    });

    // 生成预签名下载 URL（用于返回给前端）
    const downloadUrl = client.getPreSignedUrl({
      bucket: bucketName,
      key: objectKey,
      expires: 60 * 60 * 24 * 365, // 1年有效期
    });

    console.log("[AvatarUpload] Generated pre-signed URL:", {
      objectKey,
      urlLength: downloadUrl.length,
      urlPreview: downloadUrl.substring(0, 150),
    });

    return NextResponse.json({
      ok: true,
      objectKey,
      url: downloadUrl, // 确保返回完整的URL
      message: "头像上传成功",
    });
  } catch (error) {
    console.error("Upload avatar to TOS failed:", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "上传头像失败，请稍后再试",
      },
      { status: 500 }
    );
  }
}

