"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { client, bucketName } from "@/lib/tos";
import { dbAvailable, getCurrentUser } from "./utils";
import type { ActionState } from "./types";
import type { Prisma } from "@prisma/client";

const projectAssetSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1, "文件名不能为空"),
  tosObjectKey: z.string().min(1, "TOS对象键不能为空"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * 上传项目文件（服务器端处理，避免 CORS 问题）
 * 接收文件、提取的文本和元数据，在服务器端上传到 TOS 并创建记录
 */
export async function uploadProjectFileAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await dbAvailable())) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    const projectId = formData.get("projectId") as string;
    const file = formData.get("file") as File | null;
    const textContent = formData.get("textContent") as string | null;
    const pageCount = formData.get("pageCount") as string | null;
    const metadataStr = formData.get("metadata") as string | null;

    if (!projectId || !file) {
      return { ok: false, message: "缺少必要参数" };
    }

    // 验证项目是否存在且属于当前用户
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
    });

    if (!project) {
      return { ok: false, message: "项目不存在或无权访问" };
    }

    // 生成唯一的对象键
    const timestamp = Date.now();
    const uuid = randomUUID();
    const extension = file.name.split(".").pop();
    const objectKey = `projects/${user.id}/${timestamp}-${uuid}.${extension}`;

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

    // 解析元数据
    let metadata: Record<string, unknown> = {};
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr) as Record<string, unknown>;
      } catch {
        console.warn("Failed to parse metadata, using defaults");
      }
    }

    // 合并元数据
    const finalMetadata = {
      fileType: file.name.split(".").pop()?.toLowerCase() || "unknown",
      fileSize: file.size,
      mimeType: file.type,
      textContent: textContent || "",
      extractedAt: new Date().toISOString(),
      pageCount: pageCount ? parseInt(pageCount, 10) : 0,
      ...metadata,
    };

    // 创建文档记录
    await prisma.projectAsset.create({
      data: {
        projectId,
        name: file.name,
        tosObjectKey: objectKey,
        metadata: finalMetadata,
      },
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);
    return { ok: true, message: "文档已上传" };
  } catch (error) {
    console.error("Upload project file failed", error);
    return { ok: false, message: "上传文档失败，请稍后再试" };
  }
}

export async function createProjectAssetAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = projectAssetSchema.safeParse({
    projectId: formData.get("projectId"),
    name: formData.get("name"),
    tosObjectKey: formData.get("tosObjectKey"),
    metadata: formData.get("metadata")
      ? JSON.parse(formData.get("metadata") as string)
      : undefined,
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "输入不合法" };
  }

  if (!(await dbAvailable())) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    // 检查项目是否存在且属于当前用户
    const project = await prisma.project.findFirst({
      where: {
        id: parsed.data.projectId,
        userId: user.id,
      },
    });

    if (!project) {
      return { ok: false, message: "项目不存在或无权访问" };
    }

    await prisma.projectAsset.create({
      data: {
        projectId: parsed.data.projectId,
        name: parsed.data.name,
        tosObjectKey: parsed.data.tosObjectKey,
        metadata: (parsed.data.metadata || {}) as Prisma.InputJsonValue,
      },
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${parsed.data.projectId}`);
    return { ok: true, message: "文档已上传" };
  } catch (error) {
    console.error("Create project asset failed", error);
    return { ok: false, message: "上传文档失败，请稍后再试" };
  }
}

export async function getProjectAssets(projectId: string) {
  if (!(await dbAvailable())) {
    return [];
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    // 验证项目属于当前用户
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
    });

    if (!project) {
      return [];
    }

    const assets = await prisma.projectAsset.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return assets;
  } catch (error) {
    console.error("Failed to get project assets", error);
    return [];
  }
}

export async function getProjectAssetById(assetId: string) {
  if (!(await dbAvailable())) {
    return null;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    const asset = await prisma.projectAsset.findFirst({
      where: { id: assetId },
      include: {
        project: {
          select: {
            userId: true,
          },
        },
      },
    });

    // 验证资产属于当前用户的项目
    if (!asset || asset.project.userId !== user.id) {
      return null;
    }

    return asset;
  } catch (error) {
    console.error("Failed to get project asset", error);
    return null;
  }
}

export async function updateProjectAssetAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const assetId = formData.get("assetId") as string | null;
  if (!assetId) {
    return { ok: false, message: "文档ID不能为空" };
  }

  const metadataStr = formData.get("metadata") as string | null;
  let metadata: Record<string, unknown> | undefined;

  if (metadataStr) {
    try {
      metadata = JSON.parse(metadataStr);
    } catch {
      return { ok: false, message: "metadata格式不正确" };
    }
  }

  if (!(await dbAvailable())) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    // 检查资产是否存在且属于当前用户的项目
    const existingAsset = await prisma.projectAsset.findFirst({
      where: { id: assetId },
      include: {
        project: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!existingAsset || existingAsset.project.userId !== user.id) {
      return { ok: false, message: "文档不存在或无权访问" };
    }

    await prisma.projectAsset.update({
      where: { id: assetId },
      data: {
        metadata: metadata as Prisma.InputJsonValue,
      },
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${existingAsset.projectId}`);
    return { ok: true, message: "文档已更新" };
  } catch (error) {
    console.error("Update project asset failed", error);
    return { ok: false, message: "更新文档失败，请稍后再试" };
  }
}

export async function deleteProjectAssetAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const assetId = formData.get("assetId") as string | null;
  if (!assetId) {
    return { ok: false, message: "文档ID不能为空" };
  }

  if (!(await dbAvailable())) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    // 检查资产是否存在且属于当前用户的项目
    const existingAsset = await prisma.projectAsset.findFirst({
      where: { id: assetId },
      include: {
        project: {
          select: {
            userId: true,
            id: true,
          },
        },
      },
    });

    if (!existingAsset || existingAsset.project.userId !== user.id) {
      return { ok: false, message: "文档不存在或无权访问" };
    }

    // 删除资产
    await prisma.projectAsset.delete({
      where: { id: assetId },
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${existingAsset.project.id}`);
    return { ok: true, message: "文档已删除" };
  } catch (error) {
    console.error("Delete project asset failed", error);
    return { ok: false, message: "删除文档失败，请稍后再试" };
  }
}

