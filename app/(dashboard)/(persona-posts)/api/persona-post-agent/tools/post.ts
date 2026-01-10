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

export const createGeneratePosterTool = (context: AgentContext) => tool({
  description: "生成 3:4 比例的高级感海报 HTML 代码。通常在帖文生成完毕后调用。你可以根据帖文提取最具冲击力的金句作为海报文字。建议先调用 searchPexelsImage 获取一张相关的配图。",
  inputSchema: z.object({
    title: z.string().describe("海报主标题（金句）"),
    imageUrl: z.string().optional().describe("海报配图 URL。建议从 searchPexelsImage 获取"),
    footerText: z.string().optional().default("3分钟观点表达").describe("底部展示的小字标题"),
    footerSubtext: z.string().optional().default("PitchLab.pro").describe("底部展示的辅助小字"),
    postId: z.string().optional().describe("关联的帖子ID。如果之前已经生成了帖子，请务必提供此ID以完成自动绑定"),
  }),
  execute: async ({ title, imageUrl, footerText, footerSubtext, postId }) => {
    // 基础容器样式 (900x1200)
    const containerStyle = `
      width: 900px;
      height: 1200px;
      background: white;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      font-family: system-ui, -apple-system, 'PingFang SC', 'Noto Serif SC', serif;
      box-shadow: 0 40px 100px rgba(0,0,0,0.1);
    `;

    const html = `
<div style="${containerStyle}">
  <!-- 上半部分：图片 -->
  <div style="height: 600px; width: 100%; overflow: hidden; position: relative; background: #f3f4f6;">
    ${imageUrl ? `
      <img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="Poster Image" />
    ` : `
      <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #d1d5db; font-size: 40px;">
        Beautiful Imagery
      </div>
    `}
  </div>

  <!-- 下半部分：内容 -->
  <div style="flex: 1; padding: 80px; display: flex; flex-direction: column; justify-content: space-between; background: white; position: relative;">
    <!-- 引用样式主体 -->
    <div style="display: flex; gap: 40px; align-items: stretch;">
      <!-- 竖线装饰 -->
      <div style="width: 12px; background: #111827; border-radius: 6px; flex-shrink: 0;"></div>
      
      <!-- 金句内容 -->
      <div style="font-size: 64px; font-weight: 500; line-height: 1.5; color: #111827; letter-spacing: -0.02em;">
        ${title}
      </div>
    </div>

    <!-- 底部标识 -->
    <div style="display: flex; justify-content: space-between; items: center; border-top: 2px solid #f9fafb; padding-top: 40px;">
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <span style="font-size: 24px; font-weight: 800; color: #1f2937; letter-spacing: 0.05em; text-transform: uppercase;">
          ${footerText}
        </span>
        <span style="font-size: 20px; font-weight: 500; color: #9ca3af; font-family: ui-monospace, monospace;">
          ${footerSubtext}
        </span>
      </div>
      <!-- 右下角点缀 -->
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 40px; height: 40px; border-radius: 50%; border: 4px solid #f3f4f6;"></div>
      </div>
    </div>
  </div>
</div>
    `.trim();

    return {
      success: true,
      html,
      title,
      imageUrl,
      postId: postId || context.lastPostId, // 尝试从上下文获取 postId
    };
  },
});
