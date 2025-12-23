/**
 * Optimize Poster API (Enhanced)
 *
 * 使用 AI 分析帖子内容，生成具有小红书风格、高差异化的视觉方案
 */

import { NextResponse } from "next/server";
import { deepseek } from "@ai-sdk/deepseek";
import { generateText } from "ai";
import { getSessionUser } from "@/app/actions/utils";
import { z } from "zod";

export const maxDuration = 30;

// 扩展后的 Schema（兼容旧字段 + 新设计语义）
const PosterStyleSchema = z.object({
  // 兼容旧字段：背景样式 0-5
  backgroundStyle: z.number().int().min(0).max(5),
  showDecoration: z.boolean(),
  decorationPattern: z.enum(["?", "•", "○", "◇"]).optional(),

  // 新增：精简文案（保持）
  simplifiedText: z.string().min(10).max(60),

  // 文字样式
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  fontSize: z.number().int().min(56).max(72),
  fontWeight: z.enum(["normal", "bold"]),
  textPosition: z.enum(["center", "left-top", "right-bottom", "floating"]),

  // Emoji
  emojis: z.array(z.string()).min(1).max(3),

  // 设计增强
  backgroundTexture: z.enum(["none", "noise", "watercolor", "paper"]),
  decorationElements: z.array(z.enum(["hand-line", "dashed-box", "sticker", "border"])).max(2),
  emojiPlacement: z.enum(["corner", "inline", "top", "floating"]),

  // 语义标签
  emotion: z.string(),
  theme: z.string(),
});

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "请先登录" }, { status: 401 });
    }

    const { title, content } = await req.json();
    if (!title && !content) {
      return NextResponse.json({ ok: false, message: "缺少内容" }, { status: 400 });
    }

    const fullText = `${title || ""}\n${content || ""}`.trim();

    // === 调用 AI 生成增强版视觉方案 ===
    const result = await generateText({
      model: deepseek("deepseek-chat"),
      temperature: 0.8,
      system: `你是一个专业的小红书视觉设计师，擅长将文字转化为有温度、有生活感、高互动率的大字报。
你的任务是分析内容的情感、主题和人设，生成一个详细的视觉设计方案。

小红书风格核心：
- 背景：浅色系 + 可选纹理（噪点、水彩、纸纹）
- 布局：不局限于居中！可左上、右下、浮动排版
- 装饰：手绘线条、虚线框、贴纸风、毛边
- Emoji：生活化（🌸✨💖🥺😊🌈💫🌟），可嵌入文字或浮动
- 整体：清新、有呼吸感、有细节、避免模板化

请返回严格符合以下 JSON schema 的对象：`,
      prompt: `内容如下：
标题：${title || "无"}
内容：${content || "无"}

请分析后返回 JSON（不要任何其他文字）：
{
  "backgroundStyle": 0-5,
  "showDecoration": true/false,
  "decorationPattern": "?" 或 "•" 或 "○" 或 "◇",
  "simplifiedText": "精简到20-50字，有温度、抓重点",
  "textColor": "#222222" 等深色,
  "fontSize": 56-72,
  "fontWeight": "bold" 或 "normal",
  "textPosition": "center" | "left-top" | "right-bottom" | "floating",
  "emojis": ["✨", "🌸"],
  "backgroundTexture": "none" | "noise" | "watercolor" | "paper",
  "decorationElements": ["hand-line", "dashed-box"],
  "emojiPlacement": "corner" | "inline" | "top" | "floating",
  "emotion": "如：温暖、开心、专业、治愈",
  "theme": "如：生活分享、旅行、护肤、职场"
}`,
    });

    // === 解析 AI 响应 ===
    let parsedJson;
    try {
      const text = result.text.trim();
      // 提取 JSON（兼容代码块或裸 JSON）
      const jsonMatch = text.match(/```(?:json)?\s*({[\s\S]*})\s*```/) || text.match(/{[\s\S]*}/);
      const jsonStr = jsonMatch ? jsonMatch[1] : text;
      parsedJson = JSON.parse(jsonStr);
    } catch (e) {
      console.error("[Poster] JSON parse failed:", e);
      throw new Error("AI 返回格式无效");
    }

    // === 验证并填充默认值 ===
    const validated = PosterStyleSchema.parse({
      backgroundStyle: Math.max(0, Math.min(5, parsedJson.backgroundStyle ?? 0)),
      showDecoration: parsedJson.showDecoration ?? false,
      decorationPattern: parsedJson.decorationPattern || "•",
      simplifiedText: (parsedJson.simplifiedText || fullText.slice(0, 50)).slice(0, 60),
      textColor: parsedJson.textColor?.match(/^#[0-9a-fA-F]{6}$/) ? parsedJson.textColor : "#222222",
      fontSize: Math.max(56, Math.min(72, parsedJson.fontSize ?? 64)),
      fontWeight: parsedJson.fontWeight === "bold" ? "bold" : "normal",
      textPosition: ["center", "left-top", "right-bottom", "floating"].includes(parsedJson.textPosition)
        ? parsedJson.textPosition
        : "center",
      emojis: Array.isArray(parsedJson.emojis) ? parsedJson.emojis.slice(0, 3).filter(e => typeof e === 'string') : ["✨"],
      backgroundTexture: ["none", "noise", "watercolor", "paper"].includes(parsedJson.backgroundTexture)
        ? parsedJson.backgroundTexture
        : "none",
      decorationElements: Array.isArray(parsedJson.decorationElements)
        ? parsedJson.decorationElements.filter(e => ["hand-line", "dashed-box", "sticker", "border"].includes(e)).slice(0, 2)
        : [],
      emojiPlacement: ["corner", "inline", "top", "floating"].includes(parsedJson.emojiPlacement)
        ? parsedJson.emojiPlacement
        : "corner",
      emotion: parsedJson.emotion || "中性",
      theme: parsedJson.theme || "生活分享",
    });

    console.log("[OptimizePoster] Generated enhanced style:", {
      emotion: validated.emotion,
      theme: validated.theme,
      position: validated.textPosition,
      texture: validated.backgroundTexture,
    });

    return NextResponse.json({ ok: true, style: validated });
  } catch (error) {
    console.error("Optimize poster failed:", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "生成视觉方案失败",
      },
      { status: 500 }
    );
  }
}