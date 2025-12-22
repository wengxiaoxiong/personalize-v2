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
import { PosterCanvas, type PosterStyle } from "@/components/persona-post/poster-canvas";
import type { PersonaPostResult } from "@/modules/agent/adapters/persona-post";
import { Image as ImageIcon, Loader2, Copy, Trash2, Pencil } from "lucide-react";
import { usePosterUrl } from "../hooks/use-poster-url";

export interface PersonaPostPreviewProps {
  post: PersonaPostResult | null;
  posterUrl: string | null;
  generatingPoster: boolean;
  /** 复制当前帖子（不传则使用内置复制到剪贴板逻辑） */
  onCopy?: () => void;
  /** 编辑当前帖子（例如回填到输入框） */
  onEdit?: () => void;
  /** 删除当前帖子（例如清空预览） */
  onDelete?: () => void;
}

export function PersonaPostPreview({
  post,
  posterUrl,
  generatingPoster,
  onCopy,
  onEdit,
  onDelete,
}: PersonaPostPreviewProps) {
  const [showCanvas, setShowCanvas] = React.useState(false);
  const [showFullContent, setShowFullContent] = React.useState(false);
  const [aiStyle, setAiStyle] = React.useState<PosterStyle | null>(null);
  const [loadingAiStyle, setLoadingAiStyle] = React.useState(false);

  const MAX_PREVIEW_CHARS = 160;

  // 从 metadata.posterPath 获取预签名 URL
  // 优先使用 posterPath（数据库中的真实路径），如果不存在才使用传入的 posterUrl（刚生成时）
  const posterPath = post?.metadata?.posterPath as string | undefined;
  const { url: signedPosterUrl, loading: loadingSignedUrl } = usePosterUrl(
    posterPath || null
  );

  // 优先使用预签名 URL（从 posterPath 获取），否则使用传入的 posterUrl（刚生成时）
  const displayPosterUrl = signedPosterUrl || posterUrl;

  const handleImageGenerated = useCallback(
    async (dataUrl: string) => {
      // 自动上传到服务器，并在有 postId 时立刻写入数据库 metadata（posterPath + posterUrl）
      try {
        const response = await fetch("/api/generate-poster", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageData: dataUrl,
            title: post?.title,
          }),
        });

        if (!response.ok) {
          console.error("Failed to upload poster:", await response.text());
          return;
        }

        const result = await response.json();
        const nextPosterPath: string | undefined = result.objectKey;

        // 如果当前帖子已经有数据库ID，直接更新数据库中的 metadata（只存 path，不存 URL）
        if (post?.id && nextPosterPath) {
          try {
            await fetch("/api/persona-posts", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                postId: post.id,
                metadata: {
                  ...(post.metadata || {}),
                  posterPath: nextPosterPath,
                },
              }),
            });
          } catch (e) {
            console.error("Failed to persist poster metadata:", e);
          }
        }

        // posterUrl 的前端状态更新会通过后续重新加载历史列表或编辑回填时体现出来
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
        <div className="flex items-center gap-1">
          {/* 复制 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              if (onCopy) {
                onCopy();
                return;
              }
              if (!post) return;
              const text = `${post.title}\n\n${post.content}`;
              if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(text).catch((err) => {
                  console.error("Failed to copy post:", err);
                });
              }
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>

          {/* 编辑 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              if (onEdit) onEdit();
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>

          {/* 删除 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => {
              if (onDelete) onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4 rounded-lg border bg-card/70 shadow-sm p-4">
          {/* 标题 */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              标题
            </h4>
            <h2 className="text-xl font-bold">{post.title}</h2>
          </div>

          <Separator />

          {/* 内容（可折叠） */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              内容
            </h4>
            <div className="prose dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap">
                {showFullContent || post.content.length <= MAX_PREVIEW_CHARS
                  ? post.content
                  : `${post.content.slice(0, MAX_PREVIEW_CHARS)}...`}
              </p>
            </div>
            {post.content.length > MAX_PREVIEW_CHARS && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 px-0 text-xs text-primary"
                onClick={() => setShowFullContent((v) => !v)}
              >
                {showFullContent ? "收起内容" : "查看更多"}
              </Button>
            )}
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
            {!showCanvas && !displayPosterUrl && (
              <Button
                onClick={async () => {
                  // 先调用 AI 生成样式方案
                  setLoadingAiStyle(true);
                  try {
                    const response = await fetch("/api/optimize-poster", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        title: post.title,
                        content: post.content,
                      }),
                    });

                    if (response.ok) {
                      const result = await response.json();
                      if (result.ok && result.style) {
                        setAiStyle(result.style);
                        console.log("[PersonaPost] AI style generated:", result.style);
                      }
                    }
                  } catch (error) {
                    console.error("[PersonaPost] Failed to get AI style:", error);
                    // AI 失败时使用随机样式（aiStyle 为 null）
                  } finally {
                    setLoadingAiStyle(false);
                    setShowCanvas(true);
                  }
                }}
                variant="outline"
                className="w-full"
                disabled={generatingPoster || loadingAiStyle}
              >
                {generatingPoster || loadingAiStyle ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {loadingAiStyle ? "AI 分析中..." : "生成中..."}
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
                  aiStyle={aiStyle || undefined}
                />
              </div>
            )}

            {displayPosterUrl && !showCanvas && (
              <div className="mt-4">
                {loadingSignedUrl ? (
                  <div className="flex items-center justify-center h-48 border rounded-lg">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <img
                    src={displayPosterUrl}
                    alt="大字报"
                    className="w-full border rounded-lg"
                    onError={(e) => {
                      console.error(
                        "[PersonaPost] failed to load poster image in preview:",
                        {
                          posterUrl: displayPosterUrl,
                          error: e,
                        }
                      );
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部已去掉“保存帖子”按钮，改为在卡片顶部提供操作按钮 */}
    </div>
  );
}
