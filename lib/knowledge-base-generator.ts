/**
 * AI 知识库生成工具
 *
 * 用于从项目的所有文档中生成知识库
 */

import { getProjectAssets, updateProjectAction, getProjectById } from "@/app/actions";

export interface KnowledgeBaseMetadata {
  aiKnowledgeBase?: string;
  summary?: string;
  keyPoints?: string[];
  categories?: string[];
  generatedAt?: string;
  documentCount?: number;
  totalTextLength?: number;
}

export interface ProjectAssetMetadata {
  textContent?: string;
  fileType?: string;
  fileSize?: number;
  pageCount?: number;
  aiSummary?: string;
  extractedAt?: string;
}

/**
 * 从项目的所有文档中提取文本内容
 */
export async function extractAllTextsFromProject(projectId: string): Promise<{
  texts: Array<{ assetId: string; name: string; text: string }>;
  totalLength: number;
}> {
  const assets = await getProjectAssets(projectId);

  const texts = assets
    .map((asset) => {
      const metadata = asset.metadata as ProjectAssetMetadata;
      const text = metadata.textContent || "";

      return {
        assetId: asset.id,
        name: asset.name,
        text,
      };
    })
    .filter((item) => item.text.length > 0);

  const totalLength = texts.reduce((sum, item) => sum + item.text.length, 0);

  return { texts, totalLength };
}

/**
 * 生成知识库（需要接入 AI 服务）
 *
 * @example
 * ```typescript
 * const result = await generateKnowledgeBase(
 *   projectId,
 *   async (allText) => {
 *     // 调用你的 AI 服务
 *     const response = await yourAIService.summarize(allText);
 *     return {
 *       summary: response.summary,
 *       keyPoints: response.keyPoints,
 *       categories: response.categories,
 *     };
 *   }
 * );
 * ```
 */
export async function generateKnowledgeBase(
  projectId: string,
  aiSummarizer: (text: string) => Promise<{
    summary: string;
    keyPoints?: string[];
    categories?: string[];
  }>
): Promise<{ ok: boolean; message: string }> {
  try {
    // 1. 获取项目信息
    const project = await getProjectById(projectId);
    if (!project) {
      return { ok: false, message: "项目不存在" };
    }

    // 2. 提取所有文本
    const { texts, totalLength } = await extractAllTextsFromProject(projectId);

    if (texts.length === 0) {
      return { ok: false, message: "项目中没有可用的文档内容" };
    }

    // 3. 合并所有文本
    const allText = texts.map((item) => `# ${item.name}\n\n${item.text}`).join("\n\n---\n\n");

    // 4. 使用 AI 生成知识库
    const aiResult = await aiSummarizer(allText);

    // 5. 更新项目 metadata
    const newMetadata: KnowledgeBaseMetadata = {
      aiKnowledgeBase: allText, // 完整的文本内容
      summary: aiResult.summary,
      keyPoints: aiResult.keyPoints || [],
      categories: aiResult.categories || [],
      generatedAt: new Date().toISOString(),
      documentCount: texts.length,
      totalTextLength: totalLength,
    };

    const formData = new FormData();
    formData.append("projectId", projectId);
    formData.append("name", project.name);
    formData.append("metadata", JSON.stringify(newMetadata));

    const result = await updateProjectAction({ ok: true, message: "" }, formData);

    return result;
  } catch (error) {
    console.error("生成知识库失败:", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "生成知识库失败",
    };
  }
}

/**
 * 使用简单的总结策略（不依赖外部 AI 服务）
 * 仅用于演示，实际应该使用真实的 AI 服务
 */
export async function generateSimpleKnowledgeBase(projectId: string) {
  return generateKnowledgeBase(projectId, async (text) => {
    // 简单统计
    const wordCount = text.split(/\s+/).length;
    const charCount = text.length;

    // 提取前 500 个字符作为摘要
    const summary = text.substring(0, 500) + (text.length > 500 ? "..." : "");

    return {
      summary,
      keyPoints: [
        `文档总字数：${wordCount}`,
        `文档总字符数：${charCount}`,
        "这是一个简单的知识库生成示例",
      ],
      categories: ["示例分类"],
    };
  });
}

/**
 * 使用 AI 服务生成知识库的示例
 *
 * @example
 * ```typescript
 * import { generateAIKnowledgeBase } from "@/lib/knowledge-base-generator";
 *
 * // 在你的组件或服务中调用
 * const result = await generateAIKnowledgeBase(projectId);
 * if (result.ok) {
 *   console.log("知识库生成成功");
 * }
 * ```
 */
export async function generateAIKnowledgeBase(projectId: string) {
  return generateKnowledgeBase(projectId, async (text) => {
    // TODO: 替换为你实际的 AI 服务调用
    // 例如：使用 OpenAI、DeepSeek 或其他 AI 服务

    // 示例：调用 OpenAI
    // const response = await openai.chat.completions.create({
    //   model: "gpt-4",
    //   messages: [
    //     {
    //       role: "system",
    //       content: "你是一个专业的文档总结助手。请分析以下文档内容，生成总结、关键点和分类。",
    //     },
    //     {
    //       role: "user",
    //       content: `请总结以下文档内容：\n\n${text}`,
    //     },
    //   ],
    // });

    // 临时返回简单总结（请替换为实际的 AI 调用）
    const summary = text.substring(0, 500) + (text.length > 500 ? "..." : "");

    return {
      summary,
      keyPoints: ["请接入实际的 AI 服务"],
      categories: ["未分类"],
    };
  });
}
