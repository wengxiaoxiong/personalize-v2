import { generateObject } from "ai";
import { deepseek } from "@ai-sdk/deepseek";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AgentContext } from "./types";

export interface GeneratePostInput {
  brief: string;
  personaId: string;
  projectId?: string;
  platform?: string;
}

/**
 * Writer: 负责最终帖子的生成与自动保存
 */
export async function generateAndSavePost(
  context: AgentContext,
  input: GeneratePostInput
) {
  const { brief, personaId, projectId, platform } = input;
  const userId = context.user.id;

  // 1. 获取完整的人设信息
  const persona = await prisma.persona.findFirst({
    where: { id: personaId, userId },
  });

  if (!persona) throw new Error("人设不存在或无权访问");

  // 2. 获取项目/知识库信息
  let knowledgeBase: string | null = null;
  let projectName: string | undefined;
  
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (project) {
      projectName = project.name;
      const metadata = project.metadata as Record<string, unknown> | null;
      knowledgeBase = typeof metadata?.aiKnowledgeBase === 'string' ? metadata.aiKnowledgeBase : null;
    }
  }

  // 解析人设相关字段
  const domainTags = Array.isArray(persona.domainTags) ? persona.domainTags as string[] : [];
  const expressionStyle = (persona.expressionStyle as Record<string, string> | null) || {};
  const professionalBackground = (persona.professionalBackground as Record<string, string> | null) || {};

  // 3. 构建优化的写作 System Prompt
  const writingSystemPrompt = `你是一个顶尖的社交媒体运营专家和文案写手。
你的任务是化身为指定的人设，基于用户提供的需求（Brief）和知识库内容，创作出一篇具有高度吸引力和人设一致性的社交媒体帖子。

## 创作背景
- **核心人设**：${persona.name}
- **人设领域**：${domainTags.join('、') || '通用'}
- **风格特征**：${expressionStyle.style || '自然'} / ${expressionStyle.voice || '亲切'} / ${expressionStyle.tone || '平和'}
- **背景介绍**：${professionalBackground.bio || '无'}
- **目标平台**：${platform || '小红书'}
${projectName ? `- **关联项目**：${projectName}` : ""}

## 创作准则
1. **灵魂契合**：文字必须像是由该人设亲手写就。严禁机械化、AI感重的表达。要融入人设特有的口癖、观点和情绪。
2. **价值密度**：内容要言之有物，结合提供的知识库信息，提炼对用户有价值的点，而不是空泛的堆砌词藻。
3. **平台适配**：
   - **小红书**：标题党、大量Emoji、分段清晰、强种草感、结尾要有互动引导。
   - **微博**：简洁、直击痛点、适合转发讨论、Emoji点缀。
4. **结构优化**：标题吸睛、正文有逻辑、标签精准、CTA（行动号召）明确。

## 输出约束
- 禁止输出任何 Markdown 格式符号（如 \`\`\`json 块）。
- 必须直接输出符合 JSON 结构的文本。

## Few-Shot 示例
{
  "title": "如何用AI提升创作效率？我的3个私藏技巧✨",
  "content": "哈喽大家！最近有很多朋友问我...\\n\\n1. 第一点...\\n2. 第二点...\\n\\n大家觉得怎么样？欢迎评论区交流～💬",
  "tags": ["AI工具", "效率提升", "干货分享"],
  "platform": "小红书"
}`;

  // 4. 使用 generateObject 生成结构化内容
  const { object: result } = await generateObject({
    model: deepseek("deepseek-chat"),
    schema: z.object({
      title: z.string().describe("帖子标题"),
      content: z.string().describe("帖子正文，包含合理的换行和 Emoji"),
      tags: z.array(z.string()).describe("3-5个相关话题标签"),
      platform: z.string().describe("实际创作所适配的平台"),
    }),
    system: writingSystemPrompt,
    prompt: `基于以下背景生成帖子：\n\n【用户需求】：${brief}\n\n【知识库内容】：${knowledgeBase || "无，请根据人设专业知识发挥"}`,
  });

  // 5. 硬编码自动保存到数据库
  try {
    const post = await prisma.personaPost.create({
      data: {
        personaId,
        title: result.title,
        content: result.content,
        status: "draft",
        metadata: {
          tags: result.tags,
          platform: result.platform || platform || "other",
          projectId: projectId || null,
          generatedBy: "PersonaWriter",
        },
      },
    });

    return {
      success: true,
      postId: post.id,
      title: post.title,
      content: post.content,
      message: `帖子已自动生成并保存为草稿`,
    };
  } catch (error) {
    console.error("Writer saving error:", error);
    throw new Error("保存帖子到数据库失败");
  }
}
