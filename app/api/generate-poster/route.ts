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

    const { imageData } = await req.json();

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

    // 生成公开访问URL（根据你的TOS配置）
    // 假设格式: https://{bucket}.{endpoint}/{objectKey}
    const posterUrl = `https://${bucketName}.tos-cn-beijing.volces.com/${objectKey}`;

    return NextResponse.json({
      ok: true,
      posterUrl,
      objectKey,
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
