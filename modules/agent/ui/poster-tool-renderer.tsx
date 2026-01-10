"use client";

import React, { useEffect, useRef, useState } from "react";
import type { ToolUIPart } from "ai";
import html2canvas from "html2canvas-pro";
import { Button } from "@/components/ui/button";
import { Loader2, Download, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { uploadPosterAction } from "@/app/actions/tos";
import { usePersonaPostState } from "@/modules/persona-post/usePersonaPostState";

interface PosterToolRendererProps {
  part: ToolUIPart;
}

export function PosterToolRenderer({ part }: PosterToolRendererProps) {
  const output = "output" in part ? (part.output as { html?: string; postId?: string }) : null;
  const html = output?.html;
  const postId = output?.postId;
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "uploading" | "success" | "error">("idle");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { setPosterUrl } = usePersonaPostState();

  const generateAndUpload = async () => {
    if (!containerRef.current || !html) return;

    try {
      setStatus("generating");
      setError(null);

      // 1. 等待图片加载
      const images = containerRef.current.querySelectorAll("img");
      await Promise.all(
        Array.from(images).map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete) resolve(null);
              else {
                img.onload = () => resolve(null);
                img.onerror = () => resolve(null);
              }
            })
        )
      );

      // 2. 转换 Canvas
      const canvas = await html2canvas(containerRef.current, {
        useCORS: true,
        scale: 1, // 保持 900x1200
        width: 900,
        height: 1200,
        backgroundColor: null,
      });

      setStatus("uploading");

      // 3. 转换为 WebP Blob (压缩)
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/webp", 0.8)
      );

      if (!blob) throw new Error("无法生成图片数据");

      // 4. 使用 Server Action 后端上传并绑定
      const formData = new FormData();
      formData.append("file", blob, "poster.webp");
      if (postId) {
        formData.append("postId", postId);
      }

      const uploadRes = await uploadPosterAction(formData);

      if (!uploadRes.ok) {
        throw new Error(uploadRes.message || "后端上传失败");
      }

      // 5. 获取最终 URL (由后端返回的预签名链接)
      const finalUrl = uploadRes.url || canvas.toDataURL("image/webp", 0.8);
      setImageUrl(finalUrl);
      
      // 更新全局状态，以便预览组件显示
      setPosterUrl(finalUrl);
      
      setStatus("success");
    } catch (err) {
      console.error("Poster generation error:", err);
      setError(err instanceof Error ? err.message : "生成海报失败");
      setStatus("error");
    }
  };

  useEffect(() => {
    if (part.state === "output-available" && html && status === "idle") {
      generateAndUpload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part.state, html]);

  if (!html) return null;

  return (
    <div className="mt-2 space-y-3">
      {/* 隐藏的渲染区域 - 固定尺寸 */}
      <div className="fixed -left-[2000px] -top-[2000px] pointer-events-none">
        <div
          ref={containerRef}
          dangerouslySetInnerHTML={{ __html: html }}
          style={{ width: 900, height: 1200, overflow: "hidden" }}
        />
      </div>

      {/* 状态展示 */}
      <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
        <div className="flex items-center gap-3">
          {status === "generating" || status === "uploading" ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : status === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : status === "error" ? (
            <AlertCircle className="h-5 w-5 text-destructive" />
          ) : (
            <div className="h-5 w-5 rounded-full border-2 border-primary/30" />
          )}
          
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {status === "generating" && "正在渲染海报..."}
              {status === "uploading" && "正在保存并绑定到帖子..."}
              {status === "success" && "海报已生成并成功绑定"}
              {status === "error" && "操作失败"}
              {status === "idle" && "等待渲染..."}
            </span>
            {error && <span className="text-xs text-destructive">{error}</span>}
          </div>
        </div>

        {status === "success" && imageUrl && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            onClick={() => {
              const link = document.createElement("a");
              link.href = imageUrl;
              link.download = "poster.webp";
              link.click();
            }}
          >
            <Download className="h-3.5 w-3.5" />
            下载
          </Button>
        )}
      </div>

      {/* 预览图 (如果有) */}
      {imageUrl && (
        <div className="relative aspect-3/4 w-full max-w-[200px] mx-auto overflow-hidden rounded-lg border shadow-sm group">
          <img src={imageUrl} className="w-full h-full object-cover" alt="Poster Preview" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button size="icon" variant="ghost" className="text-white hover:text-white hover:bg-white/20" onClick={() => window.open(imageUrl, '_blank')}>
              <Sparkles className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
