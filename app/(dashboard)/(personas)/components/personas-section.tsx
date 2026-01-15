"use client";

import { useState, useActionState, useEffect, startTransition } from "react";
import { useDashboard } from "@/components/providers/dashboard-provider";
import { PersonaCard } from "./persona-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PersonaSaveForm } from "./persona-save-form";
import { copyPersonaAction, deletePersonaAction, type ActionState } from "@/app/actions";
import { useRouter } from "next/navigation";
import { PRESET_PERSONAS } from "@/lib/preset-personas";

export function PersonasSection() {
  const { snapshot } = useDashboard();
  const router = useRouter();
  const [editingPersonaId, setEditingPersonaId] = useState<string | null>(null);
  const [deletingPersonaId, setDeletingPersonaId] = useState<string | null>(null);
  
  const [copyState, copyAction] = useActionState<ActionState, FormData>(copyPersonaAction, {
    ok: false,
    message: "",
  });
  
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(deletePersonaAction, {
    ok: false,
    message: "",
  });

  const handleEdit = (personaId: string | undefined) => {
    if (personaId) {
      setEditingPersonaId(personaId);
    }
  };

  const handleCopy = (personaId: string | undefined) => {
    if (!personaId) return;
    
    const formData = new FormData();
    formData.append("personaId", personaId);
    startTransition(() => {
      copyAction(formData);
    });
  };

  const handleDelete = (personaId: string | undefined) => {
    if (!personaId) return;
    
    const formData = new FormData();
    formData.append("personaId", personaId);
    startTransition(() => {
      deleteAction(formData);
    });
    setDeletingPersonaId(null);
  };

  // 处理操作成功后的刷新
  useEffect(() => {
    if (copyState.ok || deleteState.ok) {
      router.refresh();
    }
  }, [copyState.ok, deleteState.ok, router]);

  return (
    <section>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-bold">常用人设</h3>
          {snapshot.personas.length === 0 && (
            <p className="text-xs text-muted-foreground">
              👇 没有想法？试试直接使用以下推荐人设进行创作
            </p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* 用户创建的人设 */}
        {snapshot.personas.map((persona, index) => (
          <div
            key={persona.id || persona.name}
            className="animate-in fade-in-50 slide-in-from-bottom-4"
            style={{ animationDelay: `${index * 50}ms`, animationDuration: '400ms' }}
          >
            <PersonaCard
              persona={persona}
              onEdit={() => handleEdit(persona.id)}
              onCopy={() => handleCopy(persona.id)}
              onDelete={() => setDeletingPersonaId(persona.id || null)}
            />
          </div>
        ))}
        
        {/* 预设人设模板（显示在用户创建的人设后面，仅作灵感参考，不入库） */}
        {PRESET_PERSONAS.map((persona, index) => (
          <div
            key={`preset-${index}`}
            className="animate-in fade-in-50 slide-in-from-bottom-4"
            style={{ animationDelay: `${(snapshot.personas.length + index) * 50}ms`, animationDuration: '400ms' }}
          >
            <PersonaCard
              persona={persona}
              isPreset={true}
            />
          </div>
        ))}
      </div>

      {/* 编辑对话框 */}
      <Dialog open={editingPersonaId !== null} onOpenChange={(open) => !open && setEditingPersonaId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑人设</DialogTitle>
            <DialogDescription>修改人设信息并保存到数据库</DialogDescription>
          </DialogHeader>
          {editingPersonaId && (
            <PersonaSaveForm
              personaId={editingPersonaId}
              onSuccess={(message) => {
                setEditingPersonaId(null);
                router.refresh();
                if (message) {
                  // 可以显示成功消息
                  console.log(message);
                }
              }}
              onCancel={() => setEditingPersonaId(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deletingPersonaId !== null} onOpenChange={(open) => !open && setDeletingPersonaId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除这个人设吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeletingPersonaId(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deletingPersonaId) {
                  handleDelete(deletingPersonaId);
                }
              }}
            >
              删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

