"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { randomUUID } from "crypto";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { client as tosClient, bucketName as tosBucketName } from "@/lib/tos";
import { getCurrentUser, dbAvailable } from "./utils";
import type { ActionState } from "./types";

/**
 * 检测字符串是否可能是 GBK 编码的二进制数据（base64）
 */
function isBase64(str: string): boolean {
  try {
    return btoa(atob(str)) === str;
  } catch {
    return false;
  }
}

/**
 * CSV 文件内容解析
 * 支持 UTF-8 优先，GBK 备选
 */
async function parseCsv(csvText: string, encoding: "utf-8" | "gbk" = "utf-8"): Promise<Record<string, string>[]> {
  let text = csvText;

  // 如果是 base64 编码的 GBK 数据，需要解码
  if (encoding === "gbk" && isBase64(csvText)) {
    try {
      // 将 base64 解码为 Uint8Array
      const binaryString = atob(csvText);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // 尝试使用 TextDecoder 解码 GBK（Node.js 18+ 支持）
      // 如果失败，尝试使用 iconv-lite（如果已安装）
      try {
        const decoder = new TextDecoder("gbk");
        text = decoder.decode(bytes);
      } catch {
        // 如果 TextDecoder 不支持 GBK，尝试使用 iconv-lite
        try {
          // 动态导入 iconv-lite（使用 ES6 import，保持类型安全）
          const iconvModule = await import("iconv-lite");
          const iconv = iconvModule.default || iconvModule;
          text = iconv.decode(Buffer.from(bytes), "gbk");
        } catch {
          // 如果都失败，返回错误提示
          throw new Error(
            "无法解码 GBK 编码。请确保使用 Node.js 18+ 或安装 iconv-lite: npm install iconv-lite"
          );
        }
      }
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "GBK 解码失败，请确保文件是 GBK 编码或安装 iconv-lite"
      );
    }
  }
  
  // 使用解码后的文本（如果是 GBK 编码，text 已被解码；否则 text === csvText）
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return [];

  // 解析 CSV 行（简单实现，支持引号内的逗号）
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length !== headers.length) continue; // 跳过格式不正确的行

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    rows.push(row);
  }

  return rows;
}

/**
 * 创建任务批次（从 CSV 文件）
 */
const createBatchSchema = z.object({
  fileContent: z.string(),
  fileName: z.string().optional(),
  taskName: z.string().optional(),
  encoding: z.enum(["utf-8", "gbk"]).optional().default("utf-8"),
});

const batchIdSchema = z.string().uuid("批次 ID 格式无效");

export async function createTaskBatchFromCsv(
  input: unknown
): Promise<ActionState & { data?: { batchId: string; platformStats: Record<string, number> } }> {
  if (!(await dbAvailable())) {
    return { ok: false, message: "数据库未连接" };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "未登录" };
  }

  try {
    // 验证输入
    const result = createBatchSchema.safeParse(input);
    if (!result.success) {
      const firstError = result.error.issues[0];
      return { ok: false, message: firstError?.message || "输入格式错误" };
    }

    const { fileContent, taskName, encoding } = result.data;

    // 解析 CSV（优先 UTF-8，失败则尝试 GBK）
    let rows: Record<string, string>[];
    try {
      rows = await parseCsv(fileContent, encoding);
    } catch (error) {
      // 如果指定编码失败，尝试另一种编码
      if (encoding === "utf-8") {
        try {
          rows = await parseCsv(fileContent, "gbk");
        } catch {
          return {
            ok: false,
            message: error instanceof Error ? error.message : "CSV 解析失败，请检查文件编码",
          };
        }
      } else {
        return {
          ok: false,
          message: error instanceof Error ? error.message : "CSV 解析失败，请检查文件编码",
        };
      }
    }
    if (rows.length === 0) {
      return { ok: false, message: "CSV 文件为空或格式错误" };
    }

    // 验证必要字段
    const firstRow = rows[0];
    if (!firstRow.platform || !firstRow.url) {
      return { ok: false, message: "CSV 必须包含 platform 和 url 列" };
    }

    // 获取评论列（comment1, comment2, ...）
    const commentKeys = Object.keys(firstRow).filter((key) =>
      key.toLowerCase().startsWith("comment")
    );

    if (commentKeys.length === 0) {
      return { ok: false, message: "CSV 必须包含至少一列评论（comment1, comment2...）" };
    }

    // 创建批次
    const batchId = randomUUID();
    const platformStats: Record<string, number> = {};

    // 使用事务批量插入
    await prisma.$transaction(async (tx) => {
      // 创建批次记录
      await tx.taskBatch.create({
        data: {
          id: batchId,
          userId: user.id,
          name: taskName || undefined,
        },
      });

      // 遍历 CSV 行，创建帖子和评论
      for (const row of rows) {
        const platform = row.platform.trim();
        const url = row.url.trim();

        if (!platform || !url) continue;

        // 统计平台
        platformStats[platform] = (platformStats[platform] || 0) + 1;

        // 创建帖子
        const post = await tx.taskPost.create({
          data: {
            batchId,
            platform,
            url,
          },
        });

        // 创建评论
        for (const commentKey of commentKeys) {
          const commentContent = row[commentKey]?.trim();
          if (commentContent) {
            await tx.taskComment.create({
              data: {
                postId: post.id,
                content: commentContent,
                status: "pending",
              },
            });
          }
        }
      }

      // 更新批次的统计信息
      await tx.taskBatch.update({
        where: { id: batchId },
        data: {
          metadata: {
            platformStats,
            totalPosts: rows.length,
            totalComments: rows.reduce((sum, row) => {
              return (
                sum +
                commentKeys.filter((key) => row[key]?.trim()).length
              );
            }, 0),
          },
        },
      });
    });

    // 自动为每个平台生成二维码和 PC 端链接
    const qrCodes: Array<{
      platform: string;
      qrUrl: string; // PC 端直接访问链接
      qrImageUrl?: string; // 二维码图片 URL（可选，如果生成失败则为 undefined）
    }> = [];

    try {
      const platforms = Object.keys(platformStats);
      
      // PC 端访问 URL（使用 localhost）
      const pcBaseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ||
        process.env.VERCEL_URL ||
        "http://localhost:3000";
      
      // 手机端访问 URL（使用内网 IP，用于二维码）
      const mobileBaseUrl =
        process.env.NEXT_PUBLIC_MOBILE_BASE_URL ||
        "http://192.168.5.13:3000";

      // qrcode 和 TOS 客户端已在文件顶部导入

      for (const platform of platforms) {
        try {
          // PC 端直接访问链接
          const pcUrl = `${pcBaseUrl}/user?platform=${encodeURIComponent(platform)}&batch=${batchId}`;
          
          // 手机端二维码 URL（使用内网 IP）
          const mobileUrl = `${mobileBaseUrl}/user?platform=${encodeURIComponent(platform)}&batch=${batchId}`;

          let qrImageUrl: string | undefined;

          // 生成二维码图片（使用手机端 URL）
          try {
            // 生成二维码图片（Buffer）- 使用手机端 URL
            const qrBuffer = await QRCode.toBuffer(mobileUrl, {
              width: 400,
              margin: 2,
              color: {
                dark: "#000000",
                light: "#FFFFFF",
              },
            });

            // 上传到 TOS
            const timestamp = Date.now();
            const uuid = randomUUID();
            const objectKey = `task-qrcodes/${user.id}/${batchId}-${platform}-${timestamp}-${uuid}.png`;

            await tosClient.putObject({
              bucket: tosBucketName,
              key: objectKey,
              body: qrBuffer,
              contentType: "image/png",
            });

            // 生成预签名 URL（1小时有效期）
            qrImageUrl = tosClient.getPreSignedUrl({
              bucket: tosBucketName,
              key: objectKey,
              expires: 3600,
            });
          } catch (error) {
            console.error(`生成 ${platform} 二维码图片失败:`, error);
            // 即使二维码图片生成失败，也继续提供 PC 端链接
          }

          qrCodes.push({
            platform,
            qrUrl: pcUrl, // PC 端直接访问链接（localhost）
            qrImageUrl, // 二维码图片（可选，包含手机端 URL）
          });
        } catch (error) {
          console.error(`处理 ${platform} 失败:`, error);
          // 即使出错，也至少提供链接
          const pcUrl = `${pcBaseUrl}/user?platform=${encodeURIComponent(platform)}&batch=${batchId}`;
          qrCodes.push({
            platform,
            qrUrl: pcUrl,
          });
        }
      }

      // 更新批次的二维码信息
      if (qrCodes.length > 0) {
        const batch = await prisma.taskBatch.findUnique({
          where: { id: batchId },
          select: { metadata: true },
        });

        const existingMetadata = (batch?.metadata as Record<string, unknown>) || {};
        
        await prisma.taskBatch.update({
          where: { id: batchId },
          data: {
            metadata: {
              ...existingMetadata,
              platformStats,
              totalPosts: rows.length,
              totalComments: rows.reduce((sum, row) => {
                return (
                  sum +
                  commentKeys.filter((key) => row[key]?.trim()).length
                );
              }, 0),
              qrCodes: qrCodes.map((qr) => ({
                platform: qr.platform,
                qrImageUrl: qr.qrImageUrl,
                qrUrl: qr.qrUrl,
              })),
            },
          },
        });
      }
    } catch (error) {
      console.error("生成二维码失败:", error);
      // 即使二维码生成失败，也返回成功（批次已创建）
    }

    revalidatePath("/task-distribution");
    return {
      ok: true,
      message: "批次创建成功",
      data: {
        batchId,
        platformStats,
        qrCodes: qrCodes.length > 0 ? qrCodes : undefined,
      },
    };
  } catch (error) {
    console.error("[TaskDistribution] createTaskBatchFromCsv error:", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "创建批次失败",
    };
  }
}

/**
 * 获取任务批次列表
 */
export async function getTaskBatches(): Promise<
  ActionState & {
    data?: Array<{
      id: string;
      name: string | null;
      createdAt: Date;
      metadata: Record<string, unknown> | null;
      _count: { posts: number; comments: number };
    }>;
  }
> {
  if (!(await dbAvailable())) {
    return { ok: false, message: "数据库未连接" };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "未登录" };
  }

  try {
    const batches = await prisma.taskBatch.findMany({
      where: {
        userId: user.id,
      },
      include: {
        _count: {
          select: {
            posts: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 获取每个批次的评论数量
    const batchesWithCounts = await Promise.all(
      batches.map(async (batch) => {
        const commentCount = await prisma.taskComment.count({
          where: {
            post: {
              batchId: batch.id,
            },
          },
        });

        return {
          id: batch.id,
          name: batch.name,
          createdAt: batch.createdAt,
          metadata: batch.metadata as Record<string, unknown> | null,
          _count: {
            posts: batch._count.posts,
            comments: commentCount,
          },
        };
      })
    );

    return {
      ok: true,
      message: "获取成功",
      data: batchesWithCounts,
    };
  } catch (error) {
    console.error("[TaskDistribution] getTaskBatches error:", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "获取批次列表失败",
    };
  }
}

/**
 * 获取任务批次详情
 */
export async function getTaskBatchById(
  batchId: unknown
): Promise<
  ActionState & {
    data?: {
      id: string;
      name: string | null;
      createdAt: Date;
      metadata: Record<string, unknown> | null;
      posts: Array<{
        id: string;
        platform: string;
        url: string;
        _count: { comments: number };
      }>;
      stats: {
        totalPosts: number;
        totalComments: number;
        pending: number;
        locked: number;
        completed: number;
        platformStats: Record<string, number>;
      };
      /** 用户已提交的截图列表（评论内容 + 截图 key，用于发布者查看） */
      submissions: Array<{
        commentId: string;
        content: string;
        completedAt: Date;
        screenshotKey: string | null;
        post: { platform: string; url: string };
      }>;
    };
  }
> {
  if (!(await dbAvailable())) {
    return { ok: false, message: "数据库未连接" };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "未登录" };
  }

  const parsed = batchIdSchema.safeParse(batchId);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "批次 ID 无效" };
  }
  const id = parsed.data;

  try {
    // 验证批次属于当前用户
    const batch = await prisma.taskBatch.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        posts: {
          include: {
            _count: {
              select: {
                comments: true,
              },
            },
          },
        },
      },
    });

    if (!batch) {
      return { ok: false, message: "批次不存在或无权访问" };
    }

    // 获取评论统计
    const commentStats = await prisma.taskComment.groupBy({
      by: ["status"],
      where: {
        post: {
          batchId: batch.id,
        },
      },
      _count: {
        id: true,
      },
    });

    // 获取平台统计
    const platformStats = await prisma.taskPost.groupBy({
      by: ["platform"],
      where: {
        batchId: batch.id,
      },
      _count: {
        id: true,
      },
    });

    const stats = {
      totalPosts: batch.posts.length,
      totalComments: batch.posts.reduce((sum, post) => sum + post._count.comments, 0),
      pending:
        commentStats.find((s) => s.status === "pending")?._count.id || 0,
      locked:
        commentStats.find((s) => s.status === "locked")?._count.id || 0,
      completed:
        commentStats.find((s) => s.status === "completed")?._count.id || 0,
      platformStats: platformStats.reduce(
        (acc, stat) => {
          acc[stat.platform] = stat._count.id;
          return acc;
        },
        {} as Record<string, number>
      ),
    };

    const completedComments = await prisma.taskComment.findMany({
      where: {
        post: { batchId: batch.id },
        status: "completed",
      },
      select: {
        id: true,
        content: true,
        completedAt: true,
        screenshotUrl: true,
        post: { select: { platform: true, url: true } },
      },
      orderBy: { completedAt: "desc" },
    });

    const submissions = completedComments.map((c) => ({
      commentId: c.id,
      content: c.content,
      completedAt: c.completedAt!,
      screenshotKey: c.screenshotUrl,
      post: c.post,
    }));

    return {
      ok: true,
      message: "获取成功",
      data: {
        id: batch.id,
        name: batch.name,
        createdAt: batch.createdAt,
        metadata: batch.metadata as Record<string, unknown> | null,
        posts: batch.posts.map((post) => ({
          id: post.id,
          platform: post.platform,
          url: post.url,
          _count: { comments: post._count.comments },
        })),
        stats,
        submissions,
      },
    };
  } catch (error) {
    console.error("[TaskDistribution] getTaskBatchById error:", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "获取批次详情失败",
    };
  }
}

/**
 * 生成批次二维码（为每个平台生成）
 */
export async function generateBatchQRCodes(
  batchId: unknown
): Promise<
  ActionState & {
    data?: Array<{
      platform: string;
      qrUrl: string;
      qrImageUrl?: string;
    }>;
  }
> {
  if (!(await dbAvailable())) {
    return { ok: false, message: "数据库未连接" };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "未登录" };
  }

  const parsed = batchIdSchema.safeParse(batchId);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "批次 ID 无效" };
  }
  const id = parsed.data;

  try {
    // 验证批次属于当前用户
    const batch = await prisma.taskBatch.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        posts: true,
      },
    });

    if (!batch) {
      return { ok: false, message: "批次不存在或无权访问" };
    }

    const batchId = id; // 用于下方 URL 拼接
    // 获取所有平台
    const platforms = Array.from(new Set(batch.posts.map((post) => post.platform)));

    // qrcode 和 TOS 客户端已在文件顶部导入
    
    // PC 端访问 URL（使用 localhost）
    const pcBaseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.VERCEL_URL ||
      "http://localhost:3000";
    
    // 手机端访问 URL（使用内网 IP，用于二维码）
    const mobileBaseUrl =
      process.env.NEXT_PUBLIC_MOBILE_BASE_URL ||
      "http://192.168.5.13:3000";

    // 为每个平台生成二维码（直接使用 qrcode 库，不通过 API）
    const qrCodes = await Promise.all(
      platforms.map(async (platform) => {
        try {
          // PC 端直接访问链接
          const pcUrl = `${pcBaseUrl}/user?platform=${encodeURIComponent(platform)}&batch=${batchId}`;
          
          // 手机端二维码 URL（使用内网 IP）
          const mobileUrl = `${mobileBaseUrl}/user?platform=${encodeURIComponent(platform)}&batch=${batchId}`;

          // 生成二维码图片（Buffer）- 使用手机端 URL
          const qrBuffer = await QRCode.toBuffer(mobileUrl, {
            width: 400,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
          });

          // 上传到 TOS
          const timestamp = Date.now();
          const uuid = randomUUID();
          const objectKey = `task-qrcodes/${user.id}/${batchId}-${platform}-${timestamp}-${uuid}.png`;

          await tosClient.putObject({
            bucket: tosBucketName,
            key: objectKey,
            body: qrBuffer,
            contentType: "image/png",
          });

          // 生成预签名 URL（1小时有效期）
          const qrImageUrl = tosClient.getPreSignedUrl({
            bucket: tosBucketName,
            key: objectKey,
            expires: 3600,
          });

          return {
            platform,
            qrUrl: pcUrl, // PC 端链接（localhost）
            qrImageUrl, // 二维码图片（包含手机端 URL）
          };
        } catch (error) {
          console.error(`生成 ${platform} 二维码失败:`, error);
          // 即使二维码生成失败，也返回链接
          const pcUrl = `${pcBaseUrl}/user?platform=${encodeURIComponent(platform)}&batch=${batchId}`;
          return {
            platform,
            qrUrl: pcUrl,
            qrImageUrl: undefined,
          };
        }
      })
    );

    // 更新批次的二维码信息
    await prisma.taskBatch.update({
      where: { id: batchId },
      data: {
        metadata: {
          ...((batch.metadata as Record<string, unknown>) || {}),
          qrCodes: qrCodes.map((qr) => ({
            platform: qr.platform,
            qrImageUrl: qr.qrImageUrl,
          })),
        },
      },
    });

    return {
      ok: true,
      message: "二维码生成成功",
      data: qrCodes,
    };
  } catch (error) {
    console.error("[TaskDistribution] generateBatchQRCodes error:", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "生成二维码失败",
    };
  }
}

/**
 * 释放超时锁定的任务（定时任务调用）
 */
export async function releaseTimeoutTasks(): Promise<
  ActionState & { data?: { releasedCount: number } }
> {
  if (!(await dbAvailable())) {
    return { ok: false, message: "数据库未连接" };
  }

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

    return {
      ok: true,
      message: `释放了 ${result.count} 个超时锁定的任务`,
      data: {
        releasedCount: result.count,
      },
    };
  } catch (error) {
    console.error("[TaskDistribution] releaseTimeoutTasks error:", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "释放超时任务失败",
    };
  }
}

/**
 * 删除任务批次
 */
export async function deleteTaskBatch(batchId: unknown): Promise<ActionState> {
  if (!(await dbAvailable())) {
    return { ok: false, message: "数据库未连接" };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "未登录" };
  }

  const parsed = batchIdSchema.safeParse(batchId);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "批次 ID 无效" };
  }
  const id = parsed.data;

  try {
    // 验证批次属于当前用户（Prisma 的 onDelete: Cascade 会自动删除关联的 posts 和 comments）
    const batch = await prisma.taskBatch.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!batch) {
      return { ok: false, message: "批次不存在或无权访问" };
    }

    await prisma.taskBatch.delete({
      where: { id },
    });

    revalidatePath("/task-distribution");
    return {
      ok: true,
      message: "删除成功",
    };
  } catch (error) {
    console.error("[TaskDistribution] deleteTaskBatch error:", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "删除失败",
    };
  }
}

