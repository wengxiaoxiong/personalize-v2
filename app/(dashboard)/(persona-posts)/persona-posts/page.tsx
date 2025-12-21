"use client";

/**
 * Persona Post Generator Page
 *
 * 帖子生成Agent页面
 */

import { PersonaPostGenerator } from "../components/persona-post-generator";

export default function PersonaPostsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">帖子生成</h1>
        <p className="text-muted-foreground mt-2">
          使用AI助手生成社交媒体帖子，支持读取项目知识库和自动生成配图
        </p>
      </div>

      <PersonaPostGenerator />
    </div>
  );
}
