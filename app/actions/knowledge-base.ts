"use server";

import { revalidatePath } from "next/cache";
import { generateText } from "ai";
import { prisma } from "@/lib/db";
import { deepseek, DEFAULT_MODEL } from "@/lib/ai";
import { dbAvailable, getCurrentUser } from "./utils";
import type { ProjectAssetMetadata, KnowledgeBaseMetadata } from "./types";

export async function generateKnowledgeBaseAction(
  projectId: string,
): Promise<{ ok: boolean; message: string; data?: KnowledgeBaseMetadata }> {
  if (!(await dbAvailable())) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    // 1. 获取项目信息
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
      include: {
        assets: true,
      },
    });

    if (!project) {
      return { ok: false, message: "项目不存在或无权访问" };
    }

    // 2. 提取所有文档的文本内容
    const texts = project.assets
      .map((asset) => {
        const metadata = asset.metadata as ProjectAssetMetadata;
        const text = metadata.textContent || "";
        return {
          name: asset.name,
          text,
        };
      })
      .filter((item) => item.text.length > 0);

    if (texts.length === 0) {
      return { ok: false, message: "项目中没有可用的文档内容" };
    }

    // 3. 合并所有文本
    const allText = texts.map((item) => `# ${item.name}\n\n${item.text}`).join("\n\n---\n\n");
    const totalTextLength = allText.length;

    // 4. 使用 AI 生成知识库
    const { text: aiResponse } = await generateText({
      model: deepseek.chat(DEFAULT_MODEL),
      messages: [
        {
          role: "system",
          content: `你是一个专业的文档分析助手。你的任务是分析用户提供的文档内容，生成结构化的知识库总结。

请按照以下 JSON 格式返回结果：
{
  "summary": "整体总结（200-300字）",
  "keyPoints": ["关键点1", "关键点2", "关键点3", ...],
  "categories": ["分类1", "分类2", ...]
}

要求：
1. summary 要简洁明了，概括文档的核心内容
2. keyPoints 要提取3-8个最重要的要点
3. categories 要归纳文档所属的2-5个主题分类
4. 必须返回有效的 JSON 格式`,
        },
        {
          role: "user",
          content: `请分析以下文档内容并生成知识库总结：\n\n${allText.substring(0, 50000)}`, // 限制在 50k 字符
        },
      ],
      temperature: 0.7,
    });

    // 5. 解析 AI 响应
    let parsedResponse: { summary: string; keyPoints: string[]; categories: string[] };
    try {
      // 尝试从响应中提取 JSON
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        // 如果没有找到 JSON，使用默认格式
        parsedResponse = {
          summary: aiResponse.substring(0, 300),
          keyPoints: ["AI 响应格式解析失败"],
          categories: ["未分类"],
        };
      }
    } catch (parseError) {
      console.error("Failed to parse AI response", parseError);
      parsedResponse = {
        summary: aiResponse.substring(0, 300),
        keyPoints: ["AI 响应格式解析失败"],
        categories: ["未分类"],
      };
    }

    // 6. 构建知识库元数据
    const knowledgeBaseMetadata: KnowledgeBaseMetadata = {
      aiKnowledgeBase: allText.substring(0, 100000), // 存储前 100k 字符
      summary: parsedResponse.summary,
      keyPoints: parsedResponse.keyPoints,
      categories: parsedResponse.categories,
      generatedAt: new Date().toISOString(),
      documentCount: texts.length,
      totalTextLength,
    };

    // 7. 更新项目 metadata
    await prisma.project.update({
      where: { id: projectId },
      data: {
        metadata: knowledgeBaseMetadata as any,
      },
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);

    return {
      ok: true,
      message: "知识库生成成功",
      data: knowledgeBaseMetadata,
    };
  } catch (error) {
    console.error("Generate knowledge base failed", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "生成知识库失败，请稍后再试",
    };
  }
}

