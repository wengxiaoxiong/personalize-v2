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

  // 1. 获取完整的人设信息（支持预设人设）
  let persona;
  if (personaId?.startsWith("preset-")) {
    // 预设人设：从共享常量获取
    const { getPresetPersonaById, convertPresetPersonaToDbFormat } = await import("@/lib/preset-personas");
    const presetPersona = getPresetPersonaById(personaId);
    if (!presetPersona) throw new Error("预设人设不存在");
    const index = parseInt(personaId.replace("preset-", ""), 10);
    persona = convertPresetPersonaToDbFormat(presetPersona, index);
  } else {
    // 用户创建的人设：从数据库获取
    const dbPersona = await prisma.persona.findFirst({
      where: { id: personaId, userId },
    });
    if (!dbPersona) throw new Error("人设不存在或无权访问");
    persona = dbPersona;
  }

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

2. **真实自然**：
   - **严禁使用**这些标志性AI文案套路：
     * "Hello 大家好，我是XXX"
     * "姐妹们/兄弟们谁懂啊"
     * "今天来分享一下"
     * "话不多说，直接上干货"
     * "建议收藏+关注"
   - **鼓励**：
     * 从一个具体场景、情绪、或观察切入
     * 像朋友聊天一样自然过渡到主题
     * 用"我最近发现..."、"有个事儿想聊聊..."、"说实话..."这种更生活化的开场
     * Emoji 用得克制，不要每句话都加，只在关键情绪点使用

3. **价值密度**：内容要言之有物，结合提供的知识库信息，提炼对用户有价值的点，而不是空泛的堆砌词藻。

4. **平台适配**：
   - **小红书**：
     * 标题要有钩子，但不要喊口号式
     * 正文分段清晰，但避免"1234"式的机械列举（可以用小标题、场景描述来串联）
     * 结尾互动引导要自然，不要生硬的"快来评论区告诉我"
   - **微博**：简洁、直击痛点、适合转发讨论、Emoji点缀。

5. **结构优化**：标题吸睛、正文有逻辑、标签精准、CTA（行动号召）自然融入内容。

## 反模式警示（绝对禁止）
❌ "大家好，我是XXX，今天给大家分享..."
❌ "姐妹们/兄弟们冲啊！"
❌ 每个段落开头都是："第一、第二、第三..."
❌ 结尾永远是："觉得有用的话记得点赞收藏哦～"
❌ Emoji 过载：每句话都加 3+ 个表情

## 正确示范
✅ 从具体场景切入："昨天被一个需求搞到凌晨三点，突然发现..."
✅ 自然过渡："说个最近的感悟..."
✅ 真实对话感："老实说，我之前也觉得这玩意儿没用..."
✅ 有个性的结尾："反正我是这么干的，你随意。"或"有啥想法评论区见？"

## 输出约束
- 禁止输出任何 Markdown 格式符号（如 \`\`\`json 块）。
- 必须直接输出符合 JSON 结构的文本。

## Few-Shot 示例（改进版）
{
  "title": "凌晨三点被需求逼疯后，我发现了这个救命的AI工作流",
  "content": "昨天又是一个典型的加班夜。\\n\\n产品经理说要改方案，设计师说要重新出图，开发说要调接口...我坐在电脑前，突然想：能不能有个东西帮我把这些重复劳动自动化掉？\\n\\n然后我花了两个小时，搭了个 Agent 工作流。\\n\\n现在的状态是：我只需要丢个需求描述，剩下的事儿它自己跑。生成文案、配图、甚至排版，全自动。\\n\\n**核心就三个步骤：**\\n- 需求解析 Agent（理解你要干啥）\\n- 内容生成 Agent（写文案+配图）\\n- 质检 Agent（自己给自己挑刺）\\n\\n说实话，刚开始我也怀疑这玩意儿靠不靠谱。但用了一周后，我现在的工作节奏是：早上花 10 分钟设置任务，中午回来看结果。\\n\\n有人可能会说这不就是偷懒吗？我觉得不是。把时间花在重复劳动上才是真的浪费。\\n\\n对了，如果你也想试试，评论区说一声，我把工作流的配置丢给你。",
  "tags": ["AI工作流", "效率工具", "Agent"],
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
    // 是否为预设人设（仅影响 metadata 记录，不影响 personaId 字段本身）
    const isPreset = personaId?.startsWith("preset-");
    
    const post = await prisma.personaPost.create({
      data: {
        // 数据库层始终写入 personaId，保持外键完整性
        personaId,
        title: result.title,
        content: result.content,
        status: "draft",
        metadata: {
          tags: result.tags,
          platform: result.platform || platform || "other",
          projectId: projectId || null,
          generatedBy: "PersonaWriter",
          // 如果是预设人设，额外在 metadata 中记录预设人设信息
          ...(isPreset && personaId ? { presetPersonaId: personaId, presetPersonaName: persona.name } : {}),
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
