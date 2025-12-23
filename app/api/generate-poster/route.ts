/**
 * Generate Poster API
 *
 * 接收Canvas生成的图片，上传到TOS并返回URL
 */

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

    const body = await req.json() as { imageData?: string };
    const { imageData } = body;

    if (!imageData) {
      return NextResponse.json(
        { ok: false, message: "缺少图片数据" },
        { status: 400 }
      );
    }

    // 将base64图片数据转换为Buffer
    // imageData格式: data:image/png;base64,xxxxx
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // 生成唯一的对象键
    const timestamp = Date.now();
    const uuid = randomUUID();
    const objectKey = `posters/${user.id}/${timestamp}-${uuid}.png`;

    // 上传到TOS
    await client.putObject({
      bucket: bucketName,
      key: objectKey,
      body: buffer,
      contentType: "image/png",
    });

    // 生成预签名 URL（24小时有效），用于前端直接访问私有 bucket 中的图片
    const signedUrl = client.getPreSignedUrl({
      bucket: bucketName,
      key: objectKey,
      expires: 86400, // 24 小时
    });

    console.log("[GeneratePoster] uploaded poster to TOS:", {
      bucket: bucketName,
      objectKey,
      signedUrl: signedUrl.substring(0, 100) + "...", // 只打印前 100 字符
    });

    return NextResponse.json({
      ok: true,
      posterUrl: signedUrl, // 返回预签名 URL，前端可以直接使用
      objectKey, // 返回 path，用于存储到数据库
      message: "大字报生成成功",
    });
  } catch (error) {
    console.error("Generate poster failed:", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "生成大字报失败",
      },
      { status: 500 }
    );
  }
}
