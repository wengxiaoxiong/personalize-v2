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

export interface PosterStyle {
  backgroundStyle: number; // 0-5
  showDecoration: boolean;
  decorationPattern?: string;
  simplifiedText: string;
  textColor: string;
  fontSize: number;
  emojis: string[];
  emotion?: string;
  theme?: string;
}

export interface PosterCanvasProps {
  title: string;
  content: string;
  onImageGenerated?: (dataUrl: string) => void;
  className?: string;
  /**
   * 是否自动对内容做精简（截断到一定长度）
   * 默认开启，保证画面上文字不会太多
   */
  autoTrimContent?: boolean;
  /**
   * AI 生成的样式方案（如果提供，将使用此方案而非随机）
   */
  aiStyle?: PosterStyle;
}

export function PosterCanvas({
  title,
  content,
  onImageGenerated,
  className,
  autoTrimContent = true,
  aiStyle,
}: PosterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageDataUrl = useRef<string>("");
  const styleSeedRef = useRef<number>(Math.random());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ========= 背景样式（优先使用 AI 方案，否则随机）=========
    const bgStyle = aiStyle?.backgroundStyle ?? Math.floor(styleSeedRef.current * 6); // 0-5 六种背景样式

    switch (bgStyle) {
      case 0:
        // 纯白背景
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        break;
      case 1:
        // 浅粉渐变
        const gradient1 = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient1.addColorStop(0, "#fff5f5");
        gradient1.addColorStop(1, "#ffe5e5");
        ctx.fillStyle = gradient1;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        break;
      case 2:
        // 浅蓝渐变
        const gradient2 = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient2.addColorStop(0, "#f0f9ff");
        gradient2.addColorStop(1, "#e0f2fe");
        ctx.fillStyle = gradient2;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        break;
      case 3:
        // 浅紫渐变
        const gradient3 = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient3.addColorStop(0, "#faf5ff");
        gradient3.addColorStop(1, "#f3e8ff");
        ctx.fillStyle = gradient3;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        break;
      case 4:
        // 浅绿渐变
        const gradient4 = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient4.addColorStop(0, "#f0fdf4");
        gradient4.addColorStop(1, "#dcfce7");
        ctx.fillStyle = gradient4;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        break;
      case 5:
        // 浅黄渐变（新增）
        const gradient5 = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient5.addColorStop(0, "#fffbeb");
        gradient5.addColorStop(1, "#fef3c7");
        ctx.fillStyle = gradient5;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        break;
    }

    // 装饰纹理（使用 AI 方案或随机）
    const showDecoration = aiStyle?.showDecoration ?? (styleSeedRef.current > 0.5);
    if (showDecoration) {
      ctx.save();
      ctx.globalAlpha = 0.04 + styleSeedRef.current * 0.04; // 0.04-0.08 透明度
      ctx.fillStyle = "#000000";
      const patterns = ["?", "•", "○", "◇"];
      const pattern = aiStyle?.decorationPattern ?? patterns[Math.floor(styleSeedRef.current * patterns.length)];
      ctx.font = `bold ${400 + styleSeedRef.current * 200}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(pattern, canvas.width / 2, canvas.height / 2);
      ctx.restore();
    }

    // ========= 文案：使用 AI 精简文案或原始内容 =========
    const displayText = aiStyle?.simplifiedText ?? (() => {
      const MAX_CHARS = 40;
      const rawText = title && title.trim().length > 0 ? title.trim() : content.trim();
      return autoTrimContent && rawText.length > MAX_CHARS
        ? `${rawText.slice(0, MAX_CHARS)}...`
        : rawText;
    })();

    // 文本样式（使用 AI 方案或随机）
    const textColor = aiStyle?.textColor ?? (() => {
      const textColors = ["#222222", "#1a1a1a", "#2d2d2d", "#1e293b", "#334155"];
      return textColors[Math.floor(styleSeedRef.current * textColors.length)];
    })();
    const fontSize = aiStyle?.fontSize ?? (56 + Math.floor(styleSeedRef.current * 16));
    
    ctx.fillStyle = textColor;
    ctx.font =
      `bold ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // 计算多行文本，并垂直居中
    const maxWidth = canvas.width - 160; // 左右保留边距
    const lines = wrapText(ctx, displayText, maxWidth);
    const lineHeight = fontSize * 1.2; // 根据字体大小动态调整行高
    const totalHeight = lines.length * lineHeight;
    let y = canvas.height / 2 - totalHeight / 2;

    lines.forEach((line) => {
      ctx.fillText(line, canvas.width / 2, y);
      y += lineHeight;
    });

    // ========= Emoji 贴纸（使用 AI 方案或随机）=========
    const emojis = aiStyle?.emojis ?? (() => {
      const defaultEmojis = [
        "🥺", "😊", "✨", "💫", "🌟", "💖", "💕", "🌸", "🌺", "🌻",
        "🍀", "🌈", "⭐", "💝", "🎀", "🎈", "🎉", "🎊", "💯", "🔥"
      ];
      return [defaultEmojis[Math.floor(styleSeedRef.current * defaultEmojis.length)]];
    })();

    // 绘制多个 emoji（最多3个），分布在右下角区域
    emojis.slice(0, 3).forEach((emoji, index) => {
      const emojiSize = 80 + Math.floor(styleSeedRef.current * 40); // 80-120px
      const baseX = canvas.width - 60;
      const baseY = canvas.height - 60;
      const offsetX = index * (emojiSize * 0.8); // 横向排列
      const offsetY = index % 2 === 0 ? 0 : -emojiSize * 0.6; // 错开排列
      
      ctx.font = `${emojiSize}px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji'`;
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText(emoji, baseX - offsetX, baseY + offsetY);
    });

    // 生成图片并回调
    const dataUrl = canvas.toDataURL("image/png");
    imageDataUrl.current = dataUrl;
    onImageGenerated?.(dataUrl);
  }, [title, content, onImageGenerated, aiStyle]);

  const handleDownload = () => {
    if (!imageDataUrl.current) return;

    const link = document.createElement("a");
    link.download = `poster-${Date.now()}.png`;
    link.href = imageDataUrl.current;
    link.click();
  };

  return (
    <div className={className}>
      <div className="relative flex flex-col items-center">
        <canvas
          ref={canvasRef}
          width={900}
          height={1200}
          className="w-full border rounded-lg shadow-lg"
        />
        <Button
          onClick={handleDownload}
          className="absolute top-3 right-3 shadow-sm"
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
