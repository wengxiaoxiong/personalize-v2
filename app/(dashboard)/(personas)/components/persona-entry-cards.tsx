"use client";

import React from "react";
import { FileText, Link2, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PersonaEntryCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
};

function PersonaEntryCard({ icon, title, description, onClick, disabled }: PersonaEntryCardProps) {
  const [isPressed, setIsPressed] = React.useState(false);

  const handleMouseDown = () => {
    if (!disabled) setIsPressed(true);
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all duration-300 ease-out",
        "flex flex-col h-full",
        "hover:shadow-lg hover:border-primary/50 hover:-translate-y-1",
        "active:translate-y-0 active:shadow-md",
        disabled && "opacity-50 cursor-not-allowed hover:translate-y-0 hover:shadow-md",
        isPressed && "scale-[0.98]"
      )}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <CardHeader className="flex flex-col items-center text-center space-y-3 pb-4">
        <div className={cn(
          "w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary",
          "transition-all duration-300",
          !disabled && "group-hover:bg-primary/20 group-hover:scale-110"
        )}>
          <div className={cn(
            "transition-transform duration-300",
            !disabled && "group-hover:scale-110"
          )}>
            {icon}
          </div>
        </div>
        <CardTitle className="text-lg transition-colors duration-200 group-hover:text-primary">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        <CardDescription className="text-center text-sm leading-relaxed">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}

type PersonaEntryCardsProps = {
  onDocumentUpload: () => void;
  onXhsImport: () => void;
  onAICreate: () => void;
  disabled?: boolean;
};

export function PersonaEntryCards({
  onDocumentUpload,
  onXhsImport,
  onAICreate,
  disabled = false,
}: PersonaEntryCardsProps) {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in-50 duration-500">
      <div className="text-center space-y-2 animate-in slide-in-from-bottom-4 duration-700 delay-100">
        <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
          开始构建新的人设
        </h2>
        <p className="text-muted-foreground text-sm md:text-base">
          打造属于你的爆款内容引擎，从定义人设开始
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="animate-in slide-in-from-left-4 fade-in-50 duration-500 delay-200">
          <PersonaEntryCard
            icon={<FileText className="w-8 h-8" />}
            title="上传资料文档"
            description="上传简历、过往文章或采访稿，让 AI 深度学习特定语气。"
            onClick={onDocumentUpload}
            disabled={disabled}
          />
        </div>
        <div className="animate-in slide-in-from-bottom-4 fade-in-50 duration-500 delay-300">
          <PersonaEntryCard
            icon={<Link2 className="w-8 h-8" />}
            title="从小红书导入"
            description="粘贴博主主页链接，一键提取其人设风格与高频词汇。"
            onClick={onXhsImport}
            disabled={disabled}
          />
        </div>
        <div className="animate-in slide-in-from-right-4 fade-in-50 duration-500 delay-400">
          <PersonaEntryCard
            icon={<Sparkles className="w-8 h-8" />}
            title="自定义需求描述"
            description="没有参考资料？告诉 AI 你想要什么，我们将协助你从零构建。"
            onClick={onAICreate}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}

