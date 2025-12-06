"use client";

import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export type LivePersonaData = {
  name?: string;
  alias?: string;
  tagline?: string;
  audience?: string;
  domainTags: string[];
  voice?: string;
  tone?: string;
  style?: string;
  background?: string;
  contentPillars: string[];
  hooks: string[];
  callToAction?: string;
};

type PersonaLivePanelProps = {
  data: LivePersonaData;
  isLoading?: boolean;
};

export function PersonaLivePanel({ data, isLoading }: PersonaLivePanelProps) {
  const hasData = 
    data.name || 
    data.domainTags.length > 0 || 
    data.audience || 
    data.voice || 
    data.tone ||
    data.contentPillars.length > 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="pb-3 border-b mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">实时人设预览</h3>
        </div>
        {isLoading && (
          <p className="text-xs text-muted-foreground animate-pulse mt-1">
            正在从对话中提取信息...
          </p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 text-sm pr-2 min-h-0">
        {!hasData && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            <div className="text-center space-y-2">
              <p>💬 开始对话后，</p>
              <p>信息将自动提取到这里</p>
            </div>
          </div>
        )}

        {data.name && (
          <div>
            <p className="text-xs uppercase text-muted-foreground mb-1">人设名称</p>
            <p className="text-lg font-semibold">{data.name}</p>
            {data.alias && (
              <p className="text-xs text-muted-foreground mt-1">别名：{data.alias}</p>
            )}
          </div>
        )}

        {data.tagline && (
          <div>
            <p className="text-xs uppercase text-muted-foreground mb-1">标签/口号</p>
            <p className="text-sm">{data.tagline}</p>
          </div>
        )}

        {data.audience && (
          <div>
            <p className="text-xs uppercase text-muted-foreground mb-1">目标受众</p>
            <p className="text-sm">{data.audience}</p>
          </div>
        )}

        {data.domainTags.length > 0 && (
          <div>
            <p className="text-xs uppercase text-muted-foreground mb-2">领域标签</p>
            <div className="flex flex-wrap gap-2">
              {data.domainTags.map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="text-[11px]">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {data.voice && (
          <div>
            <p className="text-xs uppercase text-muted-foreground mb-1">Voice（表达声音）</p>
            <p className="text-sm">{data.voice}</p>
          </div>
        )}

        {data.tone && (
          <div>
            <p className="text-xs uppercase text-muted-foreground mb-1">Tone（语气氛围）</p>
            <p className="text-sm">{data.tone}</p>
          </div>
        )}

        {data.style && (
          <div>
            <p className="text-xs uppercase text-muted-foreground mb-1">表达风格</p>
            <p className="text-sm">{data.style}</p>
          </div>
        )}

        {data.background && (
          <div>
            <p className="text-xs uppercase text-muted-foreground mb-1">人设背景</p>
            <p className="text-sm text-muted-foreground">{data.background}</p>
          </div>
        )}

        {data.contentPillars.length > 0 && (
          <div>
            <p className="text-xs uppercase text-muted-foreground mb-2">内容支柱</p>
            <ul className="space-y-1.5">
              {data.contentPillars.map((pillar, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{pillar}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.hooks.length > 0 && (
          <div>
            <p className="text-xs uppercase text-muted-foreground mb-2">签名钩子</p>
            <div className="space-y-1.5 rounded-lg bg-muted/40 p-3">
              {data.hooks.map((hook, idx) => (
                <p key={idx} className="text-xs text-muted-foreground">
                  • {hook}
                </p>
              ))}
            </div>
          </div>
        )}

        {data.callToAction && (
          <div>
            <p className="text-xs uppercase text-muted-foreground mb-1">行动号召（CTA）</p>
            <p className="text-sm text-muted-foreground">{data.callToAction}</p>
          </div>
        )}
      </div>
    </div>
  );
}

