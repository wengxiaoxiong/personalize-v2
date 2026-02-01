import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import QRCode from "qrcode";
import { client, bucketName } from "@/lib/tos";
import { getSessionUser } from "@/app/actions";

export const maxDuration = 30;

/**
 * 生成二维码图片
 * GET /api/task-distribution/qrcode?batchId={batchId}&platform={platform}
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "未登录" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const batchId = searchParams.get("batchId");
    const platform = searchParams.get("platform");

    if (!batchId || !platform) {
      return NextResponse.json(
        { ok: false, message: "缺少必要参数 batchId 或 platform" },
        { status: 400 }
      );
    }

    // PC 端访问 URL（使用 localhost）
    const pcBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || "http://localhost:3000";
    
    // 手机端访问 URL（使用内网 IP，用于二维码）
    const mobileBaseUrl = process.env.NEXT_PUBLIC_MOBILE_BASE_URL || "http://192.168.5.13:3000";
    
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

    await client.putObject({
      bucket: bucketName,
      key: objectKey,
      body: qrBuffer,
      contentType: "image/png",
    });

    // 生成预签名 URL（1小时有效期）
    const qrImageUrl = client.getPreSignedUrl({
      bucket: bucketName,
      key: objectKey,
      expires: 3600,
    });

    return NextResponse.json({
      ok: true,
      data: {
        qrUrl: pcUrl, // PC 端直接访问链接（localhost）
        mobileUrl, // 手机端二维码 URL（内网 IP）
        qrImageUrl, // 二维码图片 URL
        objectKey, // TOS 存储路径
      },
    });
  } catch (error) {
    console.error("[QRCode] Generate error:", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "生成二维码失败",
      },
      { status: 500 }
    );
  }
}

