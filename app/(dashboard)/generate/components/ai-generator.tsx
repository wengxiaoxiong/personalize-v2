"use client";

import { useActionState, useTransition } from "react";
import { useCompletion } from "@ai-sdk/react";
import { Sparkles, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDashboard } from "@/components/providers/dashboard-provider";
import { recordGenerationAction, type ActionState } from "@/app/actions";
import { cn } from "@/lib/utils";

const platforms: { label: string; value: string }[] = [
  { label: "小红书", value: "XiaoHongShu" },
  { label: "Instagram", value: "Instagram" },
  { label: "LinkedIn", value: "LinkedIn" },
  { label: "Twitter/X", value: "Twitter/X" },
];

export function AIGenerator() {
  const {
    snapshot,
    selectedPersona,
    setSelectedPersona,
    selectedPlatform,
    setSelectedPlatform,
    topic,
    setTopic,
    tone,
    setTone,
  } = useDashboard();

  const [generationState, generationFormAction] = useActionState<ActionState, FormData>(
    recordGenerationAction,
    { ok: false, message: "" },
  );
  const [saving, startSaving] = useTransition();

  const personaChips =
    snapshot.personas.length > 0
      ? snapshot.personas.map((p) => ({ label: p.name, value: p.name }))
      : [{ label: selectedPersona, value: selectedPersona }];

  const { completion, complete, isLoading, stop, setCompletion, error } = useCompletion({
    api: "/api/generate",
    body: {
      persona: selectedPersona,
      platform: selectedPlatform.value,
      tone,
    },
    experimental_throttle: 50,
    onFinish: async (_prompt, text) => {
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>AI 一键生成</CardTitle>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Sparkles className="h-4 w-4 text-amber-500" />
            useCompletion
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <Label className="text-xs font-semibold">选择平台</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {platforms.map((platform) => (
              <Button
                key={platform.value}
                onClick={() => setSelectedPlatform({ label: platform.label, value: platform.value, accent: "text-primary" })}
                variant={selectedPlatform.value === platform.value ? "default" : "outline"}
                size="sm"
              >
                {platform.label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs font-semibold">绑定人设</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {personaChips.map((chip) => (
              <Button
                key={chip.value}
                onClick={() => setSelectedPersona(chip.value)}
                variant={selectedPersona === chip.value ? "default" : "outline"}
                size="sm"
              >
                {chip.label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="topic" className="text-xs font-semibold">主题/卖点</Label>
          <Input
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="tone" className="text-xs font-semibold">语气偏好</Label>
          <Input
            id="tone"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="mt-1"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button
            onClick={() => {
              setCompletion("");
              complete(topic, { body: { topic } });
            }}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? "生成中..." : "一键生成文案"}
          </Button>
          {isLoading && (
            <Button variant="outline" size="sm" onClick={stop}>
              停止
            </Button>
          )}
        </div>

        {error && <p className="text-xs text-rose-500">生成失败：{error.message}</p>}

        <form action={generationFormAction} className="space-y-2">
          <input type="hidden" name="title" value={`${selectedPlatform.label} · ${topic}`} />
          <input type="hidden" name="persona" value={selectedPersona} />
          <input type="hidden" name="platform" value={selectedPlatform.value} />
          <Textarea
            name="content"
            value={completion}
            onChange={(e) => setCompletion(e.target.value)}
            className="h-44 resize-none"
            placeholder="生成内容预览..."
          />
          <Button type="submit" disabled={saving} variant="outline" className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
            保存生成结果
          </Button>
          {generationState.message && (
            <p className={cn("text-xs", generationState.ok ? "text-emerald-600" : "text-rose-500")}>
              {generationState.message}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

