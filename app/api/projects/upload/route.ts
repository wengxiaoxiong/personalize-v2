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

    return NextResponse.json({
      ok: true,
      objectKey,
      message: "文件上传成功",
    });
  } catch (error) {
    console.error("Upload file to TOS failed:", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "上传文件失败，请稍后再试",
      },
      { status: 500 }
    );
  }
}

