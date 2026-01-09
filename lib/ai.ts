import { createDeepSeek } from "@ai-sdk/deepseek";

// DeepSeek AI 配置
export const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY || "",
});

// 默认模型
export const DEFAULT_MODEL = "deepseek-chat";
