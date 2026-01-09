import { tool } from "ai";
import { z } from "zod";
import { AgentContext } from "../types";
import { generateAndSavePost } from "../writer";

export const createGeneratePostTool = (context: AgentContext) => tool({
  description: `根据用户提供的需求、已选定的人设和项目，调用专用的 Writer 生成最终的帖子内容并自动保存到数据库。
当用户确认了要写什么、用什么人设写、是否使用知识库后，应调用此工具完成最后一步。`,
  inputSchema: z.object({
    brief: z.string().describe("帖子的具体写作需求或简报"),
    personaId: z.string().describe("要使用的人设ID。必须从 searchPersonas 或当前上下文中获取"),
    projectId: z.string().optional().describe("要关联的项目/知识库ID。如果用户提到了特定项目，请提供此ID"),
    platform: z.string().optional().describe("目标发布平台，如 '小红书'、'微博'"),
  }),
  execute: async (input) => {
    try {
      const result = await generateAndSavePost(context, input);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "生成帖子失败",
      };
    }
  },
});

export const createGeneratePosterTool = () => tool({
  description: "生成3:4比例的大字报图片",
  inputSchema: z.object({
    title: z.string().describe("帖子标题"),
    content: z.string().describe("帖子内容摘要"),
  }),
  execute: async ({ title, content }) => {
    return {
      success: true,
      message: "大字报生成指令已发送",
      data: { title, content },
    };
  },
});
