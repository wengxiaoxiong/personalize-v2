"use server";

import { randomUUID } from "crypto";
import { client, bucketName } from "@/lib/tos";
import { dbAvailable, getCurrentUser } from "./utils";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function getPresignedUploadUrl(
  fileName: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  contentType: string,
): Promise<{ ok: boolean; url?: string; objectKey?: string; message?: string }> {
  if (!(await dbAvailable())) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    // 生成唯一的对象键
    const timestamp = Date.now();
    const uuid = randomUUID();
    const extension = fileName.split(".").pop();
    const objectKey = `projects/${user.id}/${timestamp}-${uuid}.${extension}`;

    // 生成预签名上传 URL (使用 PUT 方法)
    const url = client.getPreSignedUrl({
      bucket: bucketName,
      key: objectKey,
      expires: 3600, // 1小时有效期
      method: 'PUT',
      // headers: {
      //   'Content-Type': contentType,
      // },
    });

    return {
      ok: true,
      url,
      objectKey,
    };
  } catch (error) {
    console.error("Failed to get presigned upload URL", error);
    return { ok: false, message: "获取上传链接失败" };
  }
}

export async function uploadPosterAction(
  formData: FormData
): Promise<{ ok: boolean; message: string; url?: string; objectKey?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, message: "未登录" };

    const file = formData.get("file") as File;
    const postId = formData.get("postId") as string;

    if (!file) return { ok: false, message: "文件不能为空" };

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const objectKey = `posters/${user.id}/${timestamp}-${file.name}`;

    // 1. 上传到 TOS (后端直接上传)
    await client.putObject({
      bucket: bucketName,
      key: objectKey,
      body: buffer,
    });

    // 2. 获取下载链接 (用于前端显示)
    const url = client.getPreSignedUrl({
      bucket: bucketName,
      key: objectKey,
      expires: 3600,
    });

    // 3. 如果提供了 postId，自动绑定到帖子
    if (postId) {
      const post = await prisma.personaPost.findUnique({
        where: { id: postId },
        select: { metadata: true },
      });

      if (post) {
        const metadata = (post.metadata || {}) as Record<string, unknown>;
        await prisma.personaPost.update({
          where: { id: postId },
          data: {
            metadata: {
              ...metadata,
              posterUrl: url,
              posterPath: objectKey,
            },
          },
        });
      }
      revalidatePath("/persona-posts");
    }

    return {
      ok: true,
      message: "上传成功",
      url,
      objectKey,
    };
  } catch (error) {
    console.error("Upload poster failed:", error);
    return { ok: false, message: "上传失败" };
  }
}

export async function getPresignedDownloadUrl(
  objectKey: string,
): Promise<{ ok: boolean; url?: string; message?: string }> {
  if (!(await dbAvailable())) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    // 验证对象键是否属于当前用户
    // 对象键格式: projects/{userId}/{timestamp}-{uuid}.{ext}
    if (!objectKey.startsWith(`projects/${user.id}/`)) {
      return { ok: false, message: "无权访问此文件" };
    }

    // 生成预签名下载 URL
    const url = client.getPreSignedUrl({
      bucket: bucketName,
      key: objectKey,
      expires: 3600, // 1小时有效期
    });

    return {
      ok: true,
      url,
    };
  } catch (error) {
    console.error("Failed to get presigned download URL", error);
    return { ok: false, message: "获取下载链接失败" };
  }
}

