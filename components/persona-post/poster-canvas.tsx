"use client";

/**
 * Poster Canvas Component
 *
 * 用Canvas渲染3:4大字报（海报）
 * 尺寸：900x1200px (3:4比例)
 */

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export interface PosterCanvasProps {
  title: string;
  content: string;
  onImageGenerated?: (dataUrl: string) => void;
  className?: string;
}

export function PosterCanvas({
  title,
  content,
  onImageGenerated,
  className,
}: PosterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageDataUrl = useRef<string>("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 设置背景渐变
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#667eea");
    gradient.addColorStop(1, "#764ba2");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 设置标题样式
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";

    // 绘制标题（支持多行）
    const titleLines = wrapText(ctx, title, canvas.width - 80);
    let y = 120;
    titleLines.forEach((line) => {
      ctx.fillText(line, canvas.width / 2, y);
      y += 60;
    });

    // 绘制分割线
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(100, y + 20);
    ctx.lineTo(canvas.width - 100, y + 20);
    ctx.stroke();

    // 设置内容样式
    ctx.fillStyle = "#ffffff";
    ctx.font = "28px sans-serif";
    ctx.textAlign = "left";

    // 绘制内容（支持多行）
    const contentLines = wrapText(ctx, content, canvas.width - 120);
    y += 80;
    contentLines.slice(0, 15).forEach((line) => {
      // 最多显示15行
      ctx.fillText(line, 60, y);
      y += 40;
    });

    // 如果内容太长，显示省略号
    if (contentLines.length > 15) {
      ctx.fillText("...", 60, y);
    }

    // 绘制底部装饰
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fillRect(0, canvas.height - 100, canvas.width, 100);

    // 绘制底部文字
    ctx.fillStyle = "#ffffff";
    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("由AI智能生成", canvas.width / 2, canvas.height - 50);

    // 生成图片并回调
    const dataUrl = canvas.toDataURL("image/png");
    imageDataUrl.current = dataUrl;
    onImageGenerated?.(dataUrl);
  }, [title, content, onImageGenerated]);

  const handleDownload = () => {
    if (!imageDataUrl.current) return;

    const link = document.createElement("a");
    link.download = `poster-${Date.now()}.png`;
    link.href = imageDataUrl.current;
    link.click();
  };

  return (
    <div className={className}>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={900}
          height={1200}
          className="w-full border rounded-lg shadow-lg"
        />
        <Button
          onClick={handleDownload}
          className="absolute bottom-4 right-4"
          size="sm"
          variant="secondary"
        >
          <Download className="h-4 w-4 mr-2" />
          下载图片
        </Button>
      </div>
    </div>
  );
}

/**
 * 文本换行辅助函数
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split("");
  const lines: string[] = [];
  let currentLine = "";

  for (const char of words) {
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}
