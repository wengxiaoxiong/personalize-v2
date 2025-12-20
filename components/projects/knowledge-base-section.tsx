"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SparklesIcon, RefreshCwIcon, CheckCircleIcon } from "lucide-react";
import { generateKnowledgeBaseAction } from "@/app/actions";

interface KnowledgeBaseSectionProps {
  project: {
    id: string;
    name: string;
    metadata: unknown;
    assets: Array<{
      id: string;
    }>;
  };
}

interface KnowledgeBaseMetadata {
  summary?: string;
  keyPoints?: string[];
  categories?: string[];
  generatedAt?: string;
  documentCount?: number;
  totalTextLength?: number;
}

export function KnowledgeBaseSection({ project }: KnowledgeBaseSectionProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);

  const metadata = project.metadata as KnowledgeBaseMetadata | null;
  const hasKnowledgeBase = metadata?.summary && metadata.summary.length > 0;
  const hasDocuments = project.assets.length > 0;

  async function handleGenerate() {
    if (!hasDocuments) {
      alert("请先上传文档");
      return;
    }

    setIsGenerating(true);

    const result = await generateKnowledgeBaseAction(project.id);

    if (result.ok) {
      router.refresh();
    } else {
      alert(result.message);
    }

    setIsGenerating(false);
  }

  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SparklesIcon className="w-5 h-5" />
          AI 知识库
        </CardTitle>
        <CardDescription>
          {hasKnowledgeBase
            ? "已生成知识库总结"
            : "从文档中生成 AI 知识库"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasKnowledgeBase ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <SparklesIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {hasDocuments
                ? "点击下方按钮生成 AI 知识库"
                : "请先上传文档"}
            </p>
            <Button
              onClick={handleGenerate}
              disabled={!hasDocuments || isGenerating}
              className="w-full"
            >
              <SparklesIcon className="w-4 h-4 mr-2" />
              {isGenerating ? "生成中..." : "生成知识库"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-green-600" />
                总结
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {metadata.summary}
              </p>
            </div>

            <Separator />

            {/* Categories */}
            {metadata.categories && metadata.categories.length > 0 && (
              <>
                <div>
                  <h4 className="font-semibold mb-2">分类</h4>
                  <div className="flex flex-wrap gap-2">
                    {metadata.categories.map((category, index) => (
                      <Badge key={index} variant="secondary">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Key Points */}
            {metadata.keyPoints && metadata.keyPoints.length > 0 && (
              <>
                <div>
                  <h4 className="font-semibold mb-2">关键点</h4>
                  <ul className="space-y-2">
                    {metadata.keyPoints.map((point, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-primary">•</span>
                        <span className="flex-1">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Separator />
              </>
            )}

            {/* Stats */}
            <div className="text-xs text-muted-foreground space-y-1">
              {metadata.documentCount && (
                <p>基于 {metadata.documentCount} 个文档生成</p>
              )}
              {metadata.generatedAt && (
                <p>
                  生成时间：{new Date(metadata.generatedAt).toLocaleString("zh-CN")}
                </p>
              )}
            </div>

            {/* Regenerate Button */}
            <Button
              variant="outline"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full"
            >
              <RefreshCwIcon className="w-4 h-4 mr-2" />
              {isGenerating ? "重新生成中..." : "重新生成"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
