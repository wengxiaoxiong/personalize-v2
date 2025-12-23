/**
 * Optimize Poster API
 *
 * 使用 AI 分析帖子内容，生成适合小红书风格的大字报视觉方案
 */

import { NextResponse } from "next/server";
import { deepseek } from "@ai-sdk/deepseek";
import { generateText } from "ai";
import { getSessionUser } from "@/app/actions/utils";
import { z } from "zod";

export const maxDuration = 30;

const PosterStyleSchema = z.object({
  // 背景样式：0=纯白, 1=浅粉渐变, 2=浅蓝渐变, 3=浅紫渐变, 4=浅绿渐变, 5=浅黄渐变
  backgroundStyle: z.number().int().min(0).max(5),
  // 是否显示装饰纹理
  showDecoration: z.boolean(),
  // 装饰图案：?, •, ○, ◇
  decorationPattern: z.string().optional(),
  // 精简后的文案（1-2句话，20-40字）
  simplifiedText: z.string(),
  // 文字颜色（深色系）
  textColor: z.string(),
  // 字体大小（56-72px）
  fontSize: z.number().int().min(56).max(72),
  // Emoji 列表（1-3个）
  emojis: z.array(z.string()).min(1).max(3),
  // 情感标签（用于匹配风格）
  emotion: z.string(),
  // 主题标签
  theme: z.string(),
});

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

    const { title, content } = await req.json();

    if (!title && !content) {
      return NextResponse.json(
        { ok: false, message: "缺少内容" },
        { status: 400 }
      );
    }

    const fullText = `${title || ""}\n${content || ""}`.trim();

    // 调用 AI 生成视觉方案
    const result = await generateText({
      model: deepseek("deepseek-chat"),
      system: `你是一个专业的小红书内容视觉设计师。你的任务是根据帖子内容，生成适合小红书风格的大字报视觉方案。

小红书风格特点：
- 背景：清新浅色系（纯白、浅粉、浅蓝、浅紫、浅绿、浅黄）
- 文字：大号粗体、居中、易读、有温度
- Emoji：可爱、生活化、有温度（如：🌸 ✨ 💖 🥺 😊 🌈 💫 🌟）
- 整体：简洁、清新、有活力、有生活感

请分析内容的情感、主题，然后生成最匹配的视觉方案。`,
      prompt: `请分析以下帖子内容，生成适合小红书风格的大字报视觉方案：

标题：${title || "无"}
内容：${content || "无"}

请返回 JSON 格式，包含以下字段：
{
  "backgroundStyle": 0-5的整数（0=纯白, 1=浅粉渐变, 2=浅蓝渐变, 3=浅紫渐变, 4=浅绿渐变, 5=浅黄渐变），
  "showDecoration": true/false（是否显示装饰纹理，50%概率），
  "decorationPattern": "?" 或 "•" 或 "○" 或 "◇"（如果showDecoration为true），
  "simplifiedText": "精简后的文案，1-2句话，20-40字，要吸引人、有温度",
  "textColor": "#222222" 或 "#1a1a1a" 或 "#2d2d2d" 或 "#1e293b" 或 "#334155"（深色系），
  "fontSize": 56-72之间的整数（根据内容重要性调整），
  "emojis": ["emoji1", "emoji2"]（1-3个，根据内容情感和主题选择，要可爱、生活化），
  "emotion": "情感标签，如：开心、温暖、专业、自然、浪漫等",
  "theme": "主题标签，如：生活分享、美食探店、旅行、穿搭、护肤等"
}

要求：
1. simplifiedText 要精简有力，抓住核心观点，适合大字报展示
2. emojis 要符合内容情感和主题，选择可爱、生活化的表情
3. backgroundStyle 要根据情感选择（开心→粉色/黄色，专业→蓝色，自然→绿色，浪漫→紫色）
4. 整体风格要符合小红书：清新、有温度、有生活感`,
      temperature: 0.7,
    });

    // 解析 AI 返回的 JSON
    let styleData;
    try {
      // 尝试提取 JSON（可能被 markdown 代码块包裹）
      const jsonMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/) || 
                        result.text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : result.text;
      styleData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("[OptimizePoster] Failed to parse AI response:", parseError);
      // 降级方案：使用默认值
      styleData = {
        backgroundStyle: 0,
        showDecoration: false,
        simplifiedText: title || content.slice(0, 40) + "...",
        textColor: "#222222",
        fontSize: 64,
        emojis: ["✨"],
        emotion: "中性",
        theme: "生活分享",
      };
    }

    // 验证并规范化数据
    const validated = PosterStyleSchema.parse({
      backgroundStyle: styleData.backgroundStyle ?? 0,
      showDecoration: styleData.showDecoration ?? false,
      decorationPattern: styleData.decorationPattern,
      simplifiedText: styleData.simplifiedText || title || content.slice(0, 40) + "...",
      textColor: styleData.textColor || "#222222",
      fontSize: styleData.fontSize ?? 64,
      emojis: Array.isArray(styleData.emojis) && styleData.emojis.length > 0
        ? styleData.emojis.slice(0, 3)
        : ["✨"],
      emotion: styleData.emotion || "中性",
      theme: styleData.theme || "生活分享",
    });

    console.log("[OptimizePoster] Generated style:", {
      emotion: validated.emotion,
      theme: validated.theme,
      backgroundStyle: validated.backgroundStyle,
      emojis: validated.emojis,
    });

    return NextResponse.json({
      ok: true,
      style: validated,
    });
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

