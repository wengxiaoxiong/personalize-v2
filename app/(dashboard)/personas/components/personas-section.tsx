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
        <h3 className="text-xl font-bold">常用 KOS 人设</h3>
      </div>
      {snapshot.personas.length === 0 ? (
        <div className="text-gray-500">暂无人设</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {snapshot.personas.map((persona) => (
            <PersonaCard
              key={persona.id || persona.name}
              persona={persona}
              onEdit={() => handleEdit(persona.id)}
              onCopy={() => handleCopy(persona.id)}
              onDelete={() => setDeletingPersonaId(persona.id || null)}
            />
          ))}
        </div>
      )}

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
          {deleteState.message && (
            <div className={`text-xs mt-2 ${deleteState.ok ? "text-emerald-600" : "text-rose-500"}`}>
              {deleteState.message}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 复制状态提示 */}
      {copyState.message && (
        <div className={`mt-4 text-xs ${copyState.ok ? "text-emerald-600" : "text-rose-500"}`}>
          {copyState.message}
        </div>
      )}
    </section>
  );
}

