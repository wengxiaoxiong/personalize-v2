import { Save } from "lucide-react";
import React, { useActionState, useEffect, useState } from "react";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createPersonaAction, updatePersonaAction, getPersonaForEdit, type ActionState } from "@/app/actions";
import { type PersonaParseResult } from "@/lib/persona-parser";

type PersonaSaveFormProps = {
  persona?: PersonaParseResult;
  personaId?: string;
  avatarUrl?: string | null;
  onSuccess: (message?: string) => void;
  onCancel: () => void;
};

export function PersonaSaveForm({ persona, personaId, avatarUrl, onSuccess, onCancel }: PersonaSaveFormProps) {
  const isEditMode = !!personaId;
  const [loading, setLoading] = useState(isEditMode);
  const [formPersona, setFormPersona] = useState<PersonaParseResult | null>(persona || null);

  const [state, formAction] = useActionState<ActionState, FormData>(
    isEditMode ? updatePersonaAction : createPersonaAction,
    {
      ok: false,
      message: "",
    }
  );

  // 编辑模式：加载数据（后端已处理数据转换）
  useEffect(() => {
    if (isEditMode && personaId) {
      async function loadPersona() {
        // personaId 在这里已经确定不为 undefined（因为 isEditMode && personaId 的检查）
        const data = await getPersonaForEdit(personaId!);
        if (data) {
          setFormPersona(data);
        }
        setLoading(false);
      }
      loadPersona();
    }
  }, [isEditMode, personaId]);

  useEffect(() => {
    if (state.ok) {
      onSuccess(state.message);
    }
  }, [state, onSuccess]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!formPersona) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-rose-500">人设数据不存在</div>
      </div>
    );
  }

  const defaultDomain = formPersona.domainTags?.join(", ") || "";
  const defaultStyle = formPersona.voice || formPersona.tone || formPersona.style || "";
  const defaultContentPillars = formPersona.contentPillars?.join("\n") || "";
  const defaultHooks = formPersona.hooks?.join("\n") || "";
  const defaultReminders = formPersona.reminders?.join("\n") || "";

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      {isEditMode && personaId && (
        <input type="hidden" name="personaId" value={personaId} />
      )}
      {avatarUrl && (
        <input type="hidden" name="avatarUrl" value={avatarUrl} />
      )}
      
      <div className="sm:col-span-1">
        <Label htmlFor="persona-name" className="text-xs">
          人设名称
        </Label>
        <Input id="persona-name" name="name" defaultValue={formPersona.name} required />
      </div>
      <div className="sm:col-span-1">
        <Label htmlFor="persona-alias" className="text-xs">
          别名
        </Label>
        <Input id="persona-alias" name="alias" defaultValue={formPersona.alias} placeholder="角色标签" />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="persona-tagline" className="text-xs">
          标签/口号
        </Label>
        <Input
          id="persona-tagline"
          name="tagline"
          defaultValue={formPersona.tagline}
          placeholder="个性签名"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="persona-domain" className="text-xs">
          领域标签（逗号分隔）
        </Label>
        <Input
          id="persona-domain"
          name="domain"
          defaultValue={defaultDomain}
          placeholder="潮流,夜生活,线下体验"
          required
        />
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="persona-audience" className="text-xs">
          目标受众
        </Label>
        <Input
          id="persona-audience"
          name="audience"
          defaultValue={formPersona.audience}
          placeholder="18-28岁一二线城市潮流青年"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="persona-background" className="text-xs">
          人设背景
        </Label>
        <Textarea
          id="persona-background"
          name="background"
          defaultValue={formPersona.background}
          placeholder="人设背景故事..."
          className="min-h-[80px] resize-y text-sm"
        />
      </div>

      <div className="sm:col-span-1">
        <Label htmlFor="persona-voice" className="text-xs">
          Voice（表达声音）
        </Label>
        <Input
          id="persona-voice"
          name="voice"
          defaultValue={formPersona.voice}
          placeholder="中英夹杂的年轻化口吻"
        />
      </div>
      <div className="sm:col-span-1">
        <Label htmlFor="persona-tone" className="text-xs">
          Tone（语气氛围）
        </Label>
        <Input
          id="persona-tone"
          name="tone"
          defaultValue={formPersona.tone}
          placeholder="带着微醺感的沉浸式氛围"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="persona-style" className="text-xs">
          表达风格
        </Label>
        <Input
          id="persona-style"
          name="style"
          defaultValue={defaultStyle}
          placeholder="碎片化场景叙事+实用安利"
          required
        />
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="persona-contentPillars" className="text-xs">
          内容支柱（每行一个）
        </Label>
        <Textarea
          id="persona-contentPillars"
          name="contentPillars"
          defaultValue={defaultContentPillars}
          placeholder="发光体穿搭指南-反光材质/霓虹色系实战测评&#10;派对生存包-便携香氛/补光神器场景化展示"
          className="min-h-[80px] resize-y text-sm font-mono"
        />
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="persona-hooks" className="text-xs">
          签名钩子（每行一个）
        </Label>
        <Textarea
          id="persona-hooks"
          name="hooks"
          defaultValue={defaultHooks}
          placeholder="3件让夜拍封神的发光小物&#10;藏在洗手间的派对补妆神器"
          className="min-h-[60px] resize-y text-sm font-mono"
        />
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="persona-reminders" className="text-xs">
          提醒事项（每行一个）
        </Label>
        <Textarea
          id="persona-reminders"
          name="reminders"
          defaultValue={defaultReminders}
          placeholder="所有场景必须包含具体地理位置标签&#10;强制使用#夜行动物集结话题标签"
          className="min-h-[60px] resize-y text-sm font-mono"
        />
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="persona-callToAction" className="text-xs">
          行动号召（CTA）
        </Label>
        <Input
          id="persona-callToAction"
          name="callToAction"
          defaultValue={formPersona.callToAction}
          placeholder="快标记你的夜拍瞬间,解锁同款光影装备"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="persona-bio" className="text-xs">
          人设简介（Bio）
        </Label>
        <Textarea
          id="persona-bio"
          name="bio"
          defaultValue={formPersona.bio}
          placeholder="我是穿梭在城市霓虹间的夜色捕手..."
          className="min-h-[100px] resize-y text-sm"
        />
      </div>

      {state.message && (
        <div className={cn("text-xs sm:col-span-2", state.ok ? "text-emerald-600" : "text-rose-500")}>
          {state.message}
        </div>
      )}

      <DialogFooter className="sm:col-span-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">
          <Save className="mr-2 h-4 w-4" />
          {isEditMode ? "保存更改" : "保存人设"}
        </Button>
      </DialogFooter>
    </form>
  );
}
