"use client";

import { useActionState } from "react";
import { Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { createPersonaAction, type ActionState } from "@/app/actions";
import { cn } from "@/lib/utils";

export function PersonaForm({ compact = false }: { compact?: boolean }) {
  const [state, formAction] = useActionState<ActionState, FormData>(createPersonaAction, {
    ok: false,
    message: "",
  });

  if (compact) {
    return (
      <>
        <form action={formAction} className="flex flex-wrap items-center gap-2 text-xs">
          <Input
            name="name"
            required
            placeholder="新建人设名"
            className="h-9 flex-1 min-w-[120px] text-sm"
          />
          <Input
            name="domain"
            required
            placeholder="领域标签"
            className="h-9 flex-1 min-w-[120px] text-sm"
          />
          <Input
            name="style"
            required
            placeholder="表达风格"
            className="h-9 flex-1 min-w-[120px] text-sm"
          />
          <Button type="submit" size="sm" className="h-9">
            + 新建
          </Button>
        </form>
        {state.message && (
          <p className={cn("mt-2 text-xs", state.ok ? "text-emerald-600" : "text-rose-500")}>
            {state.message}
          </p>
        )}
      </>
    );
  }

  return (
    <Card className="border-dashed">
      <CardContent className="p-6 text-center sm:p-12">
        <Users className="mx-auto h-12 w-12 text-muted-foreground sm:h-16 sm:w-16" />
        <h4 className="mt-4 text-base font-semibold sm:text-lg">还没有创建人设</h4>
        <p className="mt-2 text-xs text-muted-foreground sm:text-sm">创建您的第一个 KOS 人设，开始生成个性化内容</p>
        <form action={formAction} className="mx-auto mt-6 max-w-2xl space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-2">
          <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[140px]">
            <Label htmlFor="name" className="sr-only">人设名称</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="人设名称，如：科技测评师"
              className="h-10 text-sm"
            />
          </div>
          <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[140px]">
            <Label htmlFor="domain" className="sr-only">领域标签</Label>
            <Input
              id="domain"
              name="domain"
              required
              placeholder="领域标签，如：科技,3C"
              className="h-10 text-sm"
            />
          </div>
          <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[140px]">
            <Label htmlFor="style" className="sr-only">表达风格</Label>
            <Input
              id="style"
              name="style"
              required
              placeholder="表达风格，如：理性专业"
              className="h-10 text-sm"
            />
          </div>
          <Button type="submit" className="w-full h-10 sm:w-auto">
            <Sparkles className="mr-2 h-4 w-4" />
            创建第一个人设
          </Button>
        </form>
        {state.message && (
          <p className={cn("mt-4 text-xs", state.ok ? "text-emerald-600" : "text-destructive")}>
            {state.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

