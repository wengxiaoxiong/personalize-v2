"use client";

/**
 * Poster Canvas Component
 *
 * 用 HTML + html2canvas-pro 生成 3:4 大字报
 * 内部实际渲染尺寸：900x1200px
 */

import { useEffect, useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import html2canvas from "html2canvas-pro";

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
   */
  autoTrimContent?: boolean;
  /**
   * AI 生成的样式方案
   */
  aiStyle?: PosterStyle;
}

// 预定义背景样式映射
const BACKGROUND_STYLES = [
  { background: "#ffffff" }, // 0: 纯白
  { background: "linear-gradient(180deg, #fff5f5 0%, #ffe5e5 100%)" }, // 1: 浅粉
  { background: "linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 100%)" }, // 2: 浅蓝
  { background: "linear-gradient(180deg, #faf5ff 0%, #f3e8ff 100%)" }, // 3: 浅紫
  { background: "linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)" }, // 4: 浅绿
  { background: "linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)" }, // 5: 浅黄
];

// 默认 Emoji 列表
const DEFAULT_EMOJIS = [
  "🥺", "😊", "✨", "💫", "🌟", "💖", "💕", "🌸", "🌺", "🌻",
  "🍀", "🌈", "⭐", "💝", "🎀", "🎈", "🎉", "🎊", "💯", "🔥"
];

// 默认装饰图案
const DEFAULT_PATTERNS = ["?", "•", "○", "◇"];

// 默认文字颜色
const DEFAULT_TEXT_COLORS = ["#222222", "#1a1a1a", "#2d2d2d", "#1e293b", "#334155"];

export function PosterCanvas({
  title,
  content,
  onImageGenerated,
  className,
  autoTrimContent = true,
  aiStyle,
}: PosterCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDataUrl, setGeneratedDataUrl] = useState<string>("");
  
  // 生成随机种子，用于在没有 aiStyle 时保持样式一致
  const seedRef = useRef<number>(0);
  if (seedRef.current === 0) {
    seedRef.current = Math.random();
  }
  const seed = seedRef.current;

  // 计算样式参数
  const style = useMemo(() => {
    const bgIndex = aiStyle?.backgroundStyle ?? Math.floor(seed * 6);
    const bgStyle = BACKGROUND_STYLES[bgIndex] || BACKGROUND_STYLES[0];

    const showDecoration = aiStyle?.showDecoration ?? (seed > 0.5);
    const decorationPattern = aiStyle?.decorationPattern ?? DEFAULT_PATTERNS[Math.floor(seed * DEFAULT_PATTERNS.length)];
    
    // 装饰透明度 0.04 - 0.08
    const decorationOpacity = 0.04 + seed * 0.04;
    // 装饰大小 400 - 600px
    const decorationSize = 400 + seed * 200;

    const rawText = title && title.trim().length > 0 ? title.trim() : content.trim();
    const MAX_CHARS = 40;
    const displayText = aiStyle?.simplifiedText ?? (
      autoTrimContent && rawText.length > MAX_CHARS 
        ? `${rawText.slice(0, MAX_CHARS)}...` 
        : rawText
    );

    const textColor = aiStyle?.textColor ?? DEFAULT_TEXT_COLORS[Math.floor(seed * DEFAULT_TEXT_COLORS.length)];
    const fontSize = aiStyle?.fontSize ?? (56 + Math.floor(seed * 16));

    const emojis = aiStyle?.emojis ?? [DEFAULT_EMOJIS[Math.floor(seed * DEFAULT_EMOJIS.length)]];

    return {
      bgStyle,
      showDecoration,
      decorationPattern,
      decorationOpacity,
      decorationSize,
      displayText,
      textColor,
      fontSize,
      emojis
    };
  }, [aiStyle, title, content, autoTrimContent, seed]);

  // 监听容器大小变化，调整缩放比例
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        // 目标宽度 900px
        const newScale = containerWidth / 900;
        setScale(newScale);
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  // 生成图片的函数
  const generateImage = async () => {
    if (!posterRef.current || isGenerating) return;

    try {
      setIsGenerating(true);
      
      // 等待字体加载（简单处理）
      await document.fonts.ready;

      const canvas = await html2canvas(posterRef.current, {
        scale: 1, 
        useCORS: true,
        backgroundColor: null,
        width: 900,
        height: 1200,
        logging: false,
        onclone: (clonedDoc) => {
          // 在克隆的 DOM 中移除缩放，确保生成原尺寸图片
          const element = clonedDoc.querySelector("[data-poster-root]") as HTMLElement;
          if (element) {
            element.style.transform = "none";
          }
        },
      });

      const dataUrl = canvas.toDataURL("image/png");
      setGeneratedDataUrl(dataUrl);
      
      if (onImageGenerated) {
        onImageGenerated(dataUrl);
      }
    } catch (error) {
      console.error("Failed to generate poster image:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // 初始化或内容/样式变化后自动生成
  useEffect(() => {
    const timer = setTimeout(() => {
      generateImage();
    }, 500); // 500ms 延迟，确保渲染完成

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style, title, content]);

  const handleDownload = () => {
    if (!generatedDataUrl) return;
    const link = document.createElement("a");
    link.download = `poster-${Date.now()}.png`;
    link.href = generatedDataUrl;
    link.click();
  };

  return (
    <div className={className}>
      {/* 
        Container: 用于限制显示区域和计算缩放比例 
        保持 3:4 比例
      */}
      <div 
        ref={containerRef} 
        className="relative w-full overflow-hidden shadow-lg rounded-lg bg-gray-100"
        style={{ aspectRatio: '3 / 4' }}
      >
        {/* 
          Poster Content: 实际渲染区域，固定 900x1200
          使用 transform 进行缩放以适应 Container
        */}
        <div
          ref={posterRef}
          data-poster-root="true"
          style={{
            width: 900,
            height: 1200,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            background: style.bgStyle.background,
            position: "absolute",
            top: 0,
            left: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* 装饰纹理 */}
          {style.showDecoration && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                fontSize: `${style.decorationSize}px`,
                fontWeight: "bold",
                color: "#000000",
                opacity: style.decorationOpacity,
                pointerEvents: "none",
                fontFamily: "system-ui, -apple-system, sans-serif",
                lineHeight: 1,
              }}
            >
              {style.decorationPattern}
            </div>
          )}

          {/* 文本内容 */}
          <div
            style={{
              color: style.textColor,
              fontSize: `${style.fontSize}px`,
              fontWeight: "bold",
              fontFamily: "system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
              textAlign: "center",
              lineHeight: 1.2,
              padding: "0 80px", // 左右边距
              zIndex: 10,
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
            }}
          >
            {style.displayText}
          </div>

          {/* Emojis (右下角) */}
          <div
            style={{
              position: "absolute",
              bottom: "60px",
              right: "60px",
              display: "flex",
              flexDirection: "row-reverse", // 从右向左排列
              alignItems: "flex-end",
              zIndex: 20,
            }}
          >
            {style.emojis.slice(0, 3).map((emoji, index) => {
              const emojiSize = 80 + seed * 40; // 80-120px
              const offsetY = index % 2 === 0 ? 0 : -emojiSize * 0.6;
              
              return (
                <div
                  key={index}
                  style={{
                    fontSize: `${emojiSize}px`,
                    fontFamily: "system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji'",
                    lineHeight: 1,
                    transform: `translateY(${offsetY}px)`,
                    marginRight: index > 0 ? `-${emojiSize * 0.2}px` : 0, 
                  }}
                >
                  {emoji}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Loading Overlay */}
        {isGenerating && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        )}

        {/* 下载按钮 (覆盖在预览图之上) */}
        <Button
          onClick={handleDownload}
          className="absolute top-3 right-3 shadow-sm z-30 opacity-90 hover:opacity-100"
          size="sm"
          variant="secondary"
          disabled={!generatedDataUrl}
        >
          <Download className="h-4 w-4 mr-2" />
          下载图片
        </Button>
      </div>
    </div>
  );
}
