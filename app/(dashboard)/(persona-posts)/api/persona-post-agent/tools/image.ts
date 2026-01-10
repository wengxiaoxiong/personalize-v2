import { tool } from "ai";
import { z } from "zod";

export const createSearchPexelsImageTool = () => tool({
  description: "从 Pexels 搜索高质量的图片。当需要为海报寻找背景图或插图时使用。返回图片的 URL 和作者信息。",
  inputSchema: z.object({
    query: z.string().describe("搜索关键词，建议使用英文以获得更好的结果，如 'minimal nature', 'technology abstract'"),
    per_page: z.number().optional().default(1).describe("返回结果数量"),
    orientation: z.enum(["landscape", "portrait", "square"]).optional().default("portrait").describe("图片方向"),
  }),
  execute: async ({ query, per_page, orientation }) => {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        message: "未配置 PEXELS_API_KEY 环境变量",
      };
    }

    try {
      const url = new URL("https://api.pexels.com/v1/search");
      url.searchParams.append("query", query);
      url.searchParams.append("per_page", per_page.toString());
      if (orientation) {
        url.searchParams.append("orientation", orientation);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: apiKey,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "请求 Pexels 失败");
      }

      const data = await response.json();
      
      interface PexelsPhoto {
        id: number;
        src: {
          large2x: string;
          medium: string;
          portrait: string;
        };
        photographer: string;
        alt: string;
      }

      const photos = data.photos.map((photo: PexelsPhoto) => ({
        id: photo.id,
        url: photo.src.large2x,
        thumbnail: photo.src.medium,
        portrait: photo.src.portrait,
        photographer: photo.photographer,
        alt: photo.alt,
      }));

      return {
        success: true,
        photos,
      };
    } catch (error) {
      console.error("Pexels search error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "搜索图片失败",
      };
    }
  },
});
