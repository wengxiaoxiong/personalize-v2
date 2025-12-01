"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useCompletion } from "@ai-sdk/react";
import { Sparkles, Loader2, StopCircle, Pencil, Save, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { parsePersonaMarkdown, type PersonaParseResult } from "@/lib/persona-parser";
import { createPersonaAction, type ActionState } from "@/app/actions";

const EXAMPLE_BRIEF = `品牌：潮流生活方式集合店 OnBeat Lab
现有人设想法：想打造一位“夜生活体验官”，在各大平台种草光感穿搭、派对小物、独立音乐短场景，兼顾实用与氛围感。
内容需求：
- 输出中英文夹杂的风格，偏年轻，强调“夜色感”
- 目标人群是 18-28 岁的一二线城市青年
- 内容方向需要覆盖穿搭、香氛、线下派对以及数字艺术展
额外约束：适合在小红书、抖音使用，需要带动粉丝现场互动。`;

type PersonaSaveFormProps = {
  persona: PersonaParseResult;
  onSuccess: (message?: string) => void;
  onCancel: () => void;
};

export function PersonaGenerator() {
  const [brief, setBrief] = useState(EXAMPLE_BRIEF);
  const [goal, setGoal] = useState("生成一个可直接用于 KOS dashboard 的人设模板，并突出互动性。");
  const [preview, setPreview] = useState<PersonaParseResult | null>(null);
  const [finalPersona, setFinalPersona] = useState<PersonaParseResult | null>(null);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const lastPreviewRef = useRef<PersonaParseResult | null>(null);

  const {
    completion,
    complete,
    isLoading,
    stop,
    setCompletion,
    error,
  } = useCompletion({
    api: "/api/personas/generate",
    body: { brief, goal },
    experimental_throttle: 50,
    onFinish: async () => {
      const parsed = lastPreviewRef.current ?? parsePersonaMarkdown(completion);
      if (parsed) {
        setFinalPersona(parsed);
        setShowSavePrompt(true);
      }
    },
  });

  useEffect(() => {
    if (!completion) {
      setPreview(null);
      lastPreviewRef.current = null;
      return;
    }
    const parsed = parsePersonaMarkdown(completion);
    if (parsed) {
      lastPreviewRef.current = parsed;
      setPreview(parsed);
    }
  }, [completion]);

  const disableGenerate = useMemo(() => brief.trim().length < 40 || isLoading, [brief, isLoading]);

  const handleGenerate = () => {
    setSaveMessage(null);
    setCompletion("");
    setPreview(null);
    setFinalPersona(null);
    setShowSavePrompt(false);
    setShowEditForm(false);
    lastPreviewRef.current = null;

    complete(brief, { body: { brief, goal } });
  };

  const handleSaveDecision = () => {
    if (!finalPersona) return;
    setShowSavePrompt(false);
    setShowEditForm(true);
  };

  const handleSaved = (message?: string) => {
    setSaveMessage(message ?? "人设已保存");
    setShowEditForm(false);
    setShowSavePrompt(false);
  };

  return (
    <Card>
      <CardHeader className="gap-2">
        <div>
          <CardTitle className="text-lg">AI 人设生成</CardTitle>
          <CardDescription>通过 useCompletion 流式生成 Markdown，人设解析实时可视化。</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">useCompletion</Badge>
          {isLoading && <Badge variant="outline">流式生成中...</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <div className="space-y-2">
          <Label htmlFor="persona-brief" className="text-xs font-semibold uppercase tracking-wide">
            人设 Brief
          </Label>
          <Textarea
            id="persona-brief"
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            placeholder="描述你的人设目标、品牌调性、受众、平台..."
            className="min-h-[180px] resize-y text-sm font-mono"
          />
          <p className="text-xs text-muted-foreground">
            你可以粘贴研究笔记或创作任务，越详细越能得到准确人设（当前 {brief.trim().length} 字）。
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="persona-goal" className="text-xs font-semibold uppercase tracking-wide">
            创作目标
          </Label>
          <Input
            id="persona-goal"
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            placeholder="例如：适用于抖音脚本、能带动粉丝互动"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleGenerate} disabled={disableGenerate} className="min-w-[160px]">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {isLoading ? "生成中..." : "生成人设 Markdown"}
          </Button>
          {isLoading && (
            <Button variant="outline" type="button" onClick={stop}>
              <StopCircle className="mr-2 h-4 w-4" />
              停止
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setBrief(EXAMPLE_BRIEF)}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            使用示例
          </Button>
        </div>

        {error && (
          <p className="text-xs text-rose-500">生成失败：{error.message}</p>
        )}

        {saveMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-800">
            {saveMessage}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="flex items-center justify-between text-[11px] uppercase text-muted-foreground">
              <span>Markdown 流</span>
              <span>{completion.length} chars</span>
            </div>
            <div className="mt-2 h-80 rounded-xl border bg-muted/40 p-3 font-mono text-xs leading-relaxed text-muted-foreground overflow-auto">
              {completion ? completion : "等待生成或粘贴一段 Markdown 来解析..."}
            </div>
          </div>
          <div>
            <Label className="text-[11px] uppercase text-muted-foreground">解析人设 Preview</Label>
            <PersonaPreviewCard isLoading={isLoading} persona={preview} />
          </div>
        </div>

        {showSavePrompt && finalPersona && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm">
            <p className="font-medium">🎉 已流式生成完毕，要保存到数据库吗？</p>
            <p className="mt-1 text-xs text-muted-foreground">
              点击「去保存」会打开一个可编辑表单，允许你修改名称、领域、风格等基础字段。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={handleSaveDecision}>
                <Save className="mr-1.5 h-4 w-4" />
                去保存
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowSavePrompt(false)}
              >
                稍后再说
              </Button>
            </div>
          </div>
        )}

        {showEditForm && finalPersona && (
          <PersonaSaveForm
            persona={finalPersona}
            onSuccess={handleSaved}
            onCancel={() => setShowEditForm(false)}
          />
        )}
      </CardContent>
    </Card>
  );
}

function PersonaPreviewCard({
  persona,
  isLoading,
}: {
  persona: PersonaParseResult | null;
  isLoading: boolean;
}) {
  if (!persona) {
    return (
      <div className="mt-2 flex h-80 items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground">
        {isLoading ? "解析中..." : "等待生成结果"}
      </div>
    );
  }

  return (
    <div className="mt-2 flex h-full flex-col gap-4 rounded-xl border bg-background p-4 text-sm">
      <div>
        <p className="text-xs uppercase text-muted-foreground">Persona</p>
        <p className="text-xl font-semibold">{persona.name || "未命名"}</p>
        <p className="text-sm text-muted-foreground">{persona.tagline}</p>
      </div>

      {persona.domainTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {persona.domainTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[11px]">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="space-y-1 text-xs text-muted-foreground">
        {persona.voice && (
          <p>
            <span className="font-semibold text-foreground">Voice：</span>
            {persona.voice}
          </p>
        )}
        {persona.tone && (
          <p>
            <span className="font-semibold text-foreground">Tone：</span>
            {persona.tone}
          </p>
        )}
        {persona.callToAction && (
          <p>
            <span className="font-semibold text-foreground">CTA：</span>
            {persona.callToAction}
          </p>
        )}
      </div>

      {persona.contentPillars.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Content Pillars</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            {persona.contentPillars.map((pillar) => (
              <li key={pillar}>{pillar}</li>
            ))}
          </ul>
        </div>
      )}

      {persona.hooks.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Signature Hooks</p>
          <div className="mt-1 space-y-1 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            {persona.hooks.map((hook) => (
              <p key={hook}>• {hook}</p>
            ))}
          </div>
        </div>
      )}

      {persona.bio && (
        <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
          {persona.bio}
        </div>
      )}
    </div>
  );
}

function PersonaSaveForm({ persona, onSuccess, onCancel }: PersonaSaveFormProps) {
  const [state, formAction] = useActionState<ActionState, FormData>(createPersonaAction, {
    ok: false,
    message: "",
  });

  useEffect(() => {
    if (state.ok) {
      onSuccess(state.message);
    }
  }, [state, onSuccess]);

  const defaultDomain = persona.domainTags.join(", ");
  const defaultStyle = persona.voice || persona.tone || persona.style || "";
  const defaultContentPillars = persona.contentPillars.join("\n");
  const defaultHooks = persona.hooks.join("\n");
  const defaultReminders = persona.reminders.join("\n");

  return (
    <div className="space-y-3 rounded-xl border border-dashed bg-muted/30 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Pencil className="h-4 w-4" />
        修改 & 落库
      </div>
      <form action={formAction} className="grid gap-3 sm:grid-cols-2">
        {/* 基础信息 */}
        <div className="sm:col-span-1">
          <Label htmlFor="persona-name" className="text-xs">人设名称</Label>
          <Input id="persona-name" name="name" defaultValue={persona.name} required />
        </div>
        <div className="sm:col-span-1">
          <Label htmlFor="persona-alias" className="text-xs">别名</Label>
          <Input id="persona-alias" name="alias" defaultValue={persona.alias} placeholder="角色标签" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="persona-tagline" className="text-xs">标签/口号</Label>
          <Input id="persona-tagline" name="tagline" defaultValue={persona.tagline} placeholder="个性签名" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="persona-domain" className="text-xs">领域标签（逗号分隔）</Label>
          <Input
            id="persona-domain"
            name="domain"
            defaultValue={defaultDomain}
            placeholder="潮流,夜生活,线下体验"
            required
          />
        </div>

        {/* 受众与背景 */}
        <div className="sm:col-span-2">
          <Label htmlFor="persona-audience" className="text-xs">目标受众</Label>
          <Input
            id="persona-audience"
            name="audience"
            defaultValue={persona.audience}
            placeholder="18-28岁一二线城市潮流青年"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="persona-background" className="text-xs">人设背景</Label>
          <Textarea
            id="persona-background"
            name="background"
            defaultValue={persona.background}
            placeholder="人设背景故事..."
            className="min-h-[80px] resize-y text-sm"
          />
        </div>

        {/* 表达风格 */}
        <div className="sm:col-span-1">
          <Label htmlFor="persona-voice" className="text-xs">Voice（表达声音）</Label>
          <Input
            id="persona-voice"
            name="voice"
            defaultValue={persona.voice}
            placeholder="中英夹杂的年轻化口吻"
          />
        </div>
        <div className="sm:col-span-1">
          <Label htmlFor="persona-tone" className="text-xs">Tone（语气氛围）</Label>
          <Input
            id="persona-tone"
            name="tone"
            defaultValue={persona.tone}
            placeholder="带着微醺感的沉浸式氛围"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="persona-style" className="text-xs">表达风格</Label>
          <Input
            id="persona-style"
            name="style"
            defaultValue={defaultStyle}
            placeholder="碎片化场景叙事+实用安利"
            required
          />
        </div>

        {/* 内容支柱 */}
        <div className="sm:col-span-2">
          <Label htmlFor="persona-contentPillars" className="text-xs">内容支柱（每行一个）</Label>
          <Textarea
            id="persona-contentPillars"
            name="contentPillars"
            defaultValue={defaultContentPillars}
            placeholder="发光体穿搭指南-反光材质/霓虹色系实战测评&#10;派对生存包-便携香氛/补光神器场景化展示"
            className="min-h-[80px] resize-y text-sm font-mono"
          />
        </div>

        {/* 签名钩子 */}
        <div className="sm:col-span-2">
          <Label htmlFor="persona-hooks" className="text-xs">签名钩子（每行一个）</Label>
          <Textarea
            id="persona-hooks"
            name="hooks"
            defaultValue={defaultHooks}
            placeholder="3件让夜拍封神的发光小物&#10;藏在洗手间的派对补妆神器"
            className="min-h-[60px] resize-y text-sm font-mono"
          />
        </div>

        {/* 提醒事项 */}
        <div className="sm:col-span-2">
          <Label htmlFor="persona-reminders" className="text-xs">提醒事项（每行一个）</Label>
          <Textarea
            id="persona-reminders"
            name="reminders"
            defaultValue={defaultReminders}
            placeholder="所有场景必须包含具体地理位置标签&#10;强制使用#夜行动物集结话题标签"
            className="min-h-[60px] resize-y text-sm font-mono"
          />
        </div>

        {/* CTA 和 Bio */}
        <div className="sm:col-span-2">
          <Label htmlFor="persona-callToAction" className="text-xs">行动号召（CTA）</Label>
          <Input
            id="persona-callToAction"
            name="callToAction"
            defaultValue={persona.callToAction}
            placeholder="快标记你的夜拍瞬间,解锁同款光影装备"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="persona-bio" className="text-xs">人设简介（Bio）</Label>
          <Textarea
            id="persona-bio"
            name="bio"
            defaultValue={persona.bio}
            placeholder="我是穿梭在城市霓虹间的夜色捕手..."
            className="min-h-[100px] resize-y text-sm"
          />
        </div>

        <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1">
          <Button type="submit" className="flex-1 sm:flex-none">
            <Save className="mr-2 h-4 w-4" />
            保存人设
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            取消
          </Button>
        </div>
      </form>
      {state.message && (
        <p className={cn("text-xs", state.ok ? "text-emerald-600" : "text-rose-500")}>
          {state.message}
        </p>
      )}
    </div>
  );
}
