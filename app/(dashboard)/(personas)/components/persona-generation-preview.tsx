"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parsePersonaMarkdown, type PersonaParseResult } from "@/lib/persona-parser";
import { Sparkles, Loader2, Save } from "lucide-react";

type PersonaGenerationPreviewProps = {
  markdown: string;
  isGenerating: boolean;
  onSave?: () => void;
  canSave?: boolean;
};

export function PersonaGenerationPreview({
  markdown,
  isGenerating,
  onSave,
  canSave = false,
}: PersonaGenerationPreviewProps) {
  const [parsedPersona, setParsedPersona] = useState<PersonaParseResult | null>(null);

  useEffect(() => {
    if (!markdown) {
      setParsedPersona(null);
      return;
    }

    const parsed = parsePersonaMarkdown(markdown);
    if (parsed) {
      setParsedPersona(parsed);
    }
  }, [markdown]);

  if (!markdown && !isGenerating) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        <div className="text-center space-y-2">
          <Sparkles className="h-8 w-8 mx-auto opacity-50" />
          <p>完成对话后，</p>
          <p>人设将在这里生成</p>
        </div>
      </div>
    );
  }

  const showLoadingFallback = isGenerating && !parsedPersona;

  return (
    <div className="h-full overflow-y-auto space-y-4 pr-2">
      {showLoadingFallback && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
              正在生成人设...
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            AI 正在汇总信息，请稍候。
          </CardContent>
        </Card>
      )}

      {parsedPersona && (
        <Card>
          <CardHeader className="pb-3 flex items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              生成的人设预览
            </CardTitle>
            {onSave && (
              <Button
                size="sm"
                onClick={onSave}
                disabled={isGenerating || !canSave}
              >
                <Save className="mr-2 h-4 w-4" />
                保存
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {parsedPersona.name && (
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-1">人设名称</p>
                <p className="text-lg font-semibold">{parsedPersona.name}</p>
                {parsedPersona.alias && (
                  <p className="text-xs text-muted-foreground mt-1">别名：{parsedPersona.alias}</p>
                )}
              </div>
            )}

            {parsedPersona.tagline && (
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-1">标签/口号</p>
                <p className="text-sm">{parsedPersona.tagline}</p>
              </div>
            )}

            {parsedPersona.audience && (
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-1">目标受众</p>
                <p className="text-sm">{parsedPersona.audience}</p>
              </div>
            )}

            {parsedPersona.domainTags.length > 0 && (
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-2">领域标签</p>
                <div className="flex flex-wrap gap-2">
                  {parsedPersona.domainTags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-[11px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {parsedPersona.voice && (
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-1">Voice（表达声音）</p>
                <p className="text-sm">{parsedPersona.voice}</p>
              </div>
            )}

            {parsedPersona.tone && (
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-1">Tone（语气氛围）</p>
                <p className="text-sm">{parsedPersona.tone}</p>
              </div>
            )}

            {parsedPersona.style && (
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-1">表达风格</p>
                <p className="text-sm">{parsedPersona.style}</p>
              </div>
            )}

            {parsedPersona.background && (
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-1">人设背景</p>
                <p className="text-sm text-muted-foreground">{parsedPersona.background}</p>
              </div>
            )}

            {parsedPersona.contentPillars.length > 0 && (
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-2">内容支柱</p>
                <ul className="space-y-1.5">
                  {parsedPersona.contentPillars.map((pillar, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{pillar}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {parsedPersona.hooks.length > 0 && (
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-2">签名钩子</p>
                <div className="space-y-1.5 rounded-lg bg-muted/40 p-3">
                  {parsedPersona.hooks.map((hook, idx) => (
                    <p key={idx} className="text-xs text-muted-foreground">
                      • {hook}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {parsedPersona.callToAction && (
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-1">行动号召（CTA）</p>
                <p className="text-sm text-muted-foreground">{parsedPersona.callToAction}</p>
              </div>
            )}

            {parsedPersona.bio && (
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-1">人设简介（Bio）</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{parsedPersona.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
