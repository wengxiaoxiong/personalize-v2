import { createOpenAI } from "@ai-sdk/openai";

// DeepSeek AI 配置
export const deepseek = createOpenAI({
  name: "deepseek",
  apiKey: process.env.DEEPSEEK_API_KEY || "",
  baseURL: "https://api.deepseek.com/v1",
});

// 默认模型
export const DEFAULT_MODEL = "deepseek-chat";
