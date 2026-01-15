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
import {
  Image as ImageIcon,
  Loader2,
  Copy,
  Trash2,
  Pencil,
  Download,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { usePosterUrl } from "../hooks/use-poster-url";
import { cn } from "@/lib/utils";
import { updatePersonaPostAction } from "@/app/actions/persona-post";
import { useAvatarUrl } from "@/app/(dashboard)/(personas)/hooks/use-avatar-url";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface PersonaPostPreviewProps {
  post: PersonaPostResult | null;
  posterUrl: string | null;
  generatingPoster: boolean;
  /** 人设信息（可选，如果帖子已保存则包含） */
  persona?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  /** 复制当前帖子（不传则使用内置复制到剪贴板逻辑） */
  onCopy?: () => void;
  /** 编辑当前帖子（例如回填到输入框） */
  onEdit?: () => void;
  /** 删除当前帖子（例如清空预览） */
  onDelete?: () => void;
  /** 紧凑模式，点击弹出对话框显示详情 */
  compactView?: boolean;
}

export function PersonaPostPreview({
  post,
  posterUrl,
  generatingPoster,
  persona,
  onCopy,
  onEdit,
  onDelete,
  compactView = false,
}: PersonaPostPreviewProps) {
  const [showCanvas, setShowCanvas] = React.useState(false);
  const [showFullContent, setShowFullContent] = React.useState(false);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
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

  // 处理人设头像显示
  const isPersonaAvatarObjectKey = persona?.avatarUrl && persona.avatarUrl.startsWith("avatars/") && !persona.avatarUrl.startsWith("http");
  const { url: signedPersonaAvatarUrl, loading: loadingPersonaAvatarUrl } = useAvatarUrl(
    isPersonaAvatarObjectKey ? persona.avatarUrl : null
  );
  const displayPersonaAvatarUrl = signedPersonaAvatarUrl || (isPersonaAvatarObjectKey ? null : persona?.avatarUrl);

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

        // 如果当前帖子已经有数据库ID，直接使用 Server Action 写入 metadata（只存 path，不存 URL）
        if (post?.id && nextPosterPath) {
          try {
            await updatePersonaPostAction(post.id, {
              metadata: {
                ...(post.metadata || {}),
                posterPath: nextPosterPath,
              },
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

  const PreviewContent = () => (
    <div className="h-full flex flex-col">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <h3 className="font-semibold text-lg transition-colors duration-200">{post.title || "帖子预览"}</h3>
        <div className="flex items-center gap-1">
          {/* 复制 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 transition-all duration-200 hover:bg-primary/10 hover:text-primary hover:scale-110"
            title="复制"
            onClick={(e) => {
              e.stopPropagation();
              if (onCopy) {
                onCopy();
                return;
              }
              const text = `${post.title}\n\n${post.content}`;
              navigator.clipboard.writeText(text);
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>

          {/* 编辑 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 transition-all duration-200 hover:bg-primary/10 hover:text-primary hover:scale-110"
            title="编辑"
            onClick={(e) => {
              e.stopPropagation();
              if (onEdit) onEdit();
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>

          {/* 删除 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive transition-all duration-200 hover:bg-destructive/10 hover:scale-110"
            title="删除"
            onClick={(e) => {
              e.stopPropagation();
              if (onDelete) onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

          {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="space-y-4 rounded-xl border bg-card shadow-sm p-6 transition-all duration-300 hover:shadow-md">
          {/* 人设信息（如果有） */}
          {persona && (
            <div className="flex items-center gap-3 pb-2">
              {displayPersonaAvatarUrl ? (
                <img
                  src={displayPersonaAvatarUrl}
                  alt={persona.name}
                  className="h-10 w-10 rounded-full border object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded-full border bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground text-xs font-bold">
                  {persona.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-base truncate">{persona.name}</div>
                <div className="text-xs text-muted-foreground">基于人设风格生成</div>
              </div>
            </div>
          )}

          {persona && <Separator className="opacity-50" />}

          {/* 标题 */}
          <div className="space-y-1">
            <h2 className="text-xl font-bold break-words leading-tight">
              {post.title}
            </h2>
          </div>

          {/* 大字报配图 */}
          <div className="space-y-2">
            {!showCanvas && !displayPosterUrl && (
              <Button
                onClick={async () => {
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
                      }
                    }
                  } catch (error) {
                    console.error("[PersonaPost] Failed to get AI style:", error);
                  } finally {
                    setLoadingAiStyle(false);
                    setShowCanvas(true);
                  }
                }}
                variant="outline"
                className="w-full h-12 rounded-xl border-dashed transition-all duration-300 hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm hover:-translate-y-0.5"
                disabled={generatingPoster || loadingAiStyle}
              >
                {generatingPoster || loadingAiStyle ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {loadingAiStyle ? "AI 分析中..." : "生成中..."}
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
                    生成大字报配图
                  </>
                )}
              </Button>
            )}

            {showCanvas && (
              <div className="mt-2 rounded-xl overflow-hidden border">
                <PosterCanvas
                  title={post.title}
                  content={post.content}
                  onImageGenerated={handleImageGenerated}
                  aiStyle={aiStyle || undefined}
                />
              </div>
            )}

            {displayPosterUrl && !showCanvas && (
              <div className="mt-2 relative group/poster rounded-xl overflow-hidden border">
                {loadingSignedUrl ? (
                  <div className="flex items-center justify-center h-48 border bg-muted/30">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <img
                      src={displayPosterUrl}
                      alt="大字报"
                      className="w-full"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/poster:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        asChild
                        size="sm"
                        variant="secondary"
                        className="rounded-full px-4"
                      >
                        <a href={displayPosterUrl} download>
                          <Download className="h-4 w-4 mr-2" />
                          下载图片
                        </a>
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <Separator className="opacity-50" />

          {/* 内容 */}
          <div className="space-y-2">
            <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed text-foreground/90">
              <p className="whitespace-pre-wrap">
                {post.content}
              </p>
            </div>
          </div>

          {/* 标签 */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {post.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="bg-primary/5 hover:bg-primary/10 text-primary border-none px-2 py-0.5 font-normal">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (compactView) {
    return (
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogTrigger asChild>
          <div className="p-5 cursor-pointer hover:bg-muted/50 transition-all h-full flex flex-col gap-3 group/card">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="font-medium text-[10px] h-5 bg-primary/10 text-primary border-none">
                {post.metadata?.platform === "xiaohongshu" ? "小红书" : post.metadata?.platform === "weibo" ? "微博" : "其他"}
              </Badge>
              <div className="text-[10px] text-muted-foreground">
                {new Date().toLocaleDateString()}
              </div>
            </div>

            {/* 人设头像和名称 */}
            {persona && (
              <div className="flex items-center gap-2">
                {displayPersonaAvatarUrl ? (
                  <img
                    src={displayPersonaAvatarUrl}
                    alt={persona.name}
                    className="h-6 w-6 rounded-full border object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full border bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground text-[8px] font-bold">
                    {persona.name.charAt(0)}
                  </div>
                )}
                <span className="text-xs font-medium text-muted-foreground truncate">{persona.name}</span>
              </div>
            )}

            <h3 className="font-bold text-sm line-clamp-2 leading-snug group-hover/card:text-primary transition-colors">
              {post.title}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed flex-1">
              {post.content}
            </p>
            <div className="flex items-center justify-between mt-2">
              <div className="flex flex-wrap gap-1">
                {post.tags && post.tags.slice(0, 2).map((tag, i) => (
                  <span key={i} className="text-[10px] text-primary/70">#{tag}</span>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover/card:opacity-100 transition-opacity">
                <ChevronRightIcon className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </DialogTrigger>
        <DialogContent className="max-w-2xl h-[85vh] p-0 overflow-hidden flex flex-col gap-0 rounded-2xl shadow-2xl border-none">
          <DialogTitle className="sr-only">帖子详情</DialogTitle>
          <PreviewContent />
        </DialogContent>
      </Dialog>
    );
  }

  return <PreviewContent />;
}
