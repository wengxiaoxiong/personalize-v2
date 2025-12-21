"use client";

/**
 * Persona Post Preview
 *
 * 帖子预览组件
 */

import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PosterCanvas } from "@/components/persona-post/poster-canvas";
import type { PersonaPostResult } from "@/modules/agent/adapters/persona-post";
import { Save, Image as ImageIcon, X, Loader2 } from "lucide-react";

export interface PersonaPostPreviewProps {
  post: PersonaPostResult | null;
  posterUrl: string | null;
  generatingPoster: boolean;
  onSave: () => void;
  onClose: () => void;
}

export function PersonaPostPreview({
  post,
  posterUrl,
  generatingPoster,
  onSave,
  onClose,
}: PersonaPostPreviewProps) {
  const [showCanvas, setShowCanvas] = React.useState(false);

  const handleImageGenerated = useCallback(
    async (dataUrl: string) => {
      // 自动上传到服务器
      try {
        const response = await fetch("/api/generate-poster", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageData: dataUrl,
            title: post?.title,
          }),
        });

        if (response.ok) {
          await response.json();
          // posterUrl会通过orchestrator更新
        }
      } catch (error) {
        console.error("Failed to upload poster:", error);
      }
    },
    [post?.title]
  );

  if (!post) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          <p>生成帖子后将在这里预览</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">帖子预览</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 标题 */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            标题
          </h4>
          <h2 className="text-xl font-bold">{post.title}</h2>
        </div>

        <Separator />

        {/* 内容 */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            内容
          </h4>
          <div className="prose dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap">{post.content}</p>
          </div>
        </div>

        {/* 标签 */}
        {post.tags && post.tags.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                标签
              </h4>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 大字报生成 */}
        <Separator />
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            大字报配图
          </h4>
          {!showCanvas && !posterUrl && (
            <Button
              onClick={() => setShowCanvas(true)}
              variant="outline"
              className="w-full"
              disabled={generatingPoster}
            >
              {generatingPoster ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  生成大字报
                </>
              )}
            </Button>
          )}

          {showCanvas && (
            <div className="mt-4">
              <PosterCanvas
                title={post.title}
                content={post.content}
                onImageGenerated={handleImageGenerated}
              />
            </div>
          )}

          {posterUrl && !showCanvas && (
            <div className="mt-4">
              <img
                src={posterUrl}
                alt="大字报"
                className="w-full border rounded-lg"
              />
            </div>
          )}
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="p-4 border-t">
        <Button onClick={onSave} className="w-full" size="lg">
          <Save className="h-4 w-4 mr-2" />
          保存帖子
        </Button>
      </div>
    </div>
  );
}
