"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ToolUIPart } from "ai";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PromptInputButton } from "@/components/ai-elements/prompt-input";
import { AgentConversation } from "@/modules/agent/ui/agent-conversation";
import { AgentSidecar } from "@/modules/agent/ui/agent-sidecar";
import { usePaneState } from "@/modules/agent/hooks/use-pane-state";
import { AgentPromptInput } from "@/modules/agent/ui/agent-prompt-input";
import { PersonaGenerationPreview } from "./persona-generation-preview";
import { PersonaSaveForm } from "./persona-save-form";
import { PdfUploadControl } from "./persona-pdf-upload";
import { XiaohongshuImportDialog } from "./xiaohongshu-import-dialog";
import { ToolCallCard } from "@/modules/agent/ui/tool-call-card";
import { usePersonaState } from "@/modules/persona/usePersonaState";
import { usePersonaOrchestrator } from "@/modules/persona/usePersonaOrchestrator";
import { createPersonaSelectionRenderer } from "./persona-selection-renderer";

export function PersonaGenerator() {
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [xhsDialogOpen, setXhsDialogOpen] = useState(false);
  const [xhsImporting, setXhsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const personaState = usePersonaState();
  const pane = usePaneState(false);
  const orchestrator = usePersonaOrchestrator({ personaState });

  const {
    state: persona,
    setInputValue,
    setShowSaveDialog,
  } = personaState;

  const {
    chat,
    persona: personaFlow,
    pdf,
    ui,
    errors,
    actions: {
      handleSubmit,
      handleOptionToggle,
      handleClearSelections,
      handleFileSelect,
      handleXhsJsonImport,
      openSaveDialog,
      resetWorkflow,
      stopPersona,
    },
  } = orchestrator;

  useEffect(() => {
    pane.toggle(persona.sidecarOpen);
  }, [pane.toggle, persona.sidecarOpen]);

  const handleSaved = (message?: string) => {
    setSaveMessage(message ?? "人设已保存成功！");
    setShowSaveDialog(false);
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      await handleFileSelect(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleFileSelect]
  );

  const handleXhsImport = useCallback(
    async (jsonString: string) => {
      setXhsImporting(true);
      try {
        await handleXhsJsonImport(jsonString);
        // 导入成功后关闭对话框
        setXhsDialogOpen(false);
      } catch (error) {
        // 错误已经在 orchestrator 中处理并设置到 errors 状态
        // 对话框保持打开，让用户看到错误信息
        console.error("导入失败:", error);
      } finally {
        setXhsImporting(false);
      }
    },
    [handleXhsJsonImport]
  );

  const pdfUploadProps = {
    fileInputRef,
    onFileSelect: onFileChange,
    onXhsImportClick: () => setXhsDialogOpen(true),
    pdfUploading: pdf.uploading,
    pdfProgress: pdf.progress,
    selectedFileName: persona.pdfFile?.name,
  };

  const selectionRenderer = useMemo(
    () =>
      createPersonaSelectionRenderer({
        selectedOptions: persona.selectedOptions,
        onSelect: handleOptionToggle,
      }),
    [handleOptionToggle, persona.selectedOptions]
  );

  return (
    <div className="w-full mx-auto space-y-5">
      {persona.started ? (
        <div
          className={cn("grid gap-4", "lg:transition-[grid-template-columns] lg:duration-500 lg:ease-in-out")}
          style={{
            gridTemplateColumns: pane.isDesktop ? (pane.visible ? "1.15fr 0.85fr" : "1fr 0fr") : "1fr",
          }}
        >
          <div className="flex flex-col h-[calc(100vh-220px)] min-h-[620px] rounded-xl border bg-background">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetWorkflow}
                disabled={chat.status === "streaming" || personaFlow.loading}
                className="gap-1"
              >
                <RefreshCw className="h-4 w-4" />
                重置
              </Button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col px-4 pb-4 pt-2 gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                实时收集回答，颜色对比和换行已优化
              </div>
              <AgentConversation
                messages={chat.messages}
                status={chat.status}
                renderers={[selectionRenderer]}
                toolRenderer={(part: ToolUIPart) => <ToolCallCard part={part} />}
              />
              <div className="space-y-2 shrink-0">
                <PdfUploadControl {...pdfUploadProps} disabled={ui.disableSubmit} />
                {persona.selectedOptions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs">
                    <span className="text-muted-foreground">已选择</span>
                    {persona.selectedOptions.map((option) => (
                      <Badge
                        key={option}
                        variant="secondary"
                        className="border-emerald-200 bg-emerald-50 text-emerald-700"
                      >
                        {option}
                      </Badge>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={handleClearSelections}
                    >
                      清空
                    </Button>
                  </div>
                )}
                <AgentPromptInput
                  value={persona.inputValue}
                  onChange={setInputValue}
                  onSubmit={handleSubmit}
                  status={chat.status}
                  placeholder={
                    !personaFlow.loading && !pdf.uploading
                      ? "直接输入你的回答，信息够了随时说“生成人设”"
                      : pdf.uploading
                        ? "正在解析PDF..."
                        : "人设生成中，请勿输入..."
                  }
                  disabled={ui.disableSubmit}
                  submitDisabled={ui.disableSubmit}
                  footerContent={
                    personaFlow.loading ? (
                      <PromptInputButton type="button" variant="outline" onClick={() => stopPersona()}>
                        停止生成
                      </PromptInputButton>
                    ) : null
                  }
                />
              </div>
            </div>
          </div>
          <AgentSidecar
            visible={pane.visible}
            className="h-[calc(100vh-220px)] min-h-[620px] rounded-xl border bg-background p-4 overflow-hidden"
          >
            <PersonaGenerationPreview
              markdown={personaFlow.draft}
              isGenerating={personaFlow.loading}
              onSave={openSaveDialog}
              canSave={Boolean(personaFlow.parsedPersona || personaFlow.draft)}
            />
          </AgentSidecar>
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-[calc(100vh-220px)]">
          <div className="w-full max-w-2xl mx-auto space-y-6 px-4">
            <h2 className="text-2xl md:text-3xl font-semibold text-center text-foreground">开始构建新的KOS人设</h2>
            <div className="space-y-4">
              <PdfUploadControl {...pdfUploadProps} />
              <AgentPromptInput
                value={persona.inputValue}
                onChange={setInputValue}
                onSubmit={handleSubmit}
                status={chat.status}
                placeholder="在这里输入你的需求，描述你想要构建的KOS人设..."
                disabled={pdf.uploading}
                submitDisabled={pdf.uploading || !persona.inputValue.trim()}
                textareaClassName="min-h-[200px] md:min-h-[240px] text-base"
              />
            </div>
          </div>
        </div>
      )}

      {saveMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-800">
          ✅ {saveMessage}
        </div>
      )}

      <Dialog open={persona.showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>保存人设</DialogTitle>
            <DialogDescription>人设生成完毕，请完善信息并保存到数据库</DialogDescription>
          </DialogHeader>
          {persona.finalPersona && (
            <PersonaSaveForm
              persona={persona.finalPersona}
              avatarUrl={persona.xhsAvatar}
              onSuccess={handleSaved}
              onCancel={() => setShowSaveDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <XiaohongshuImportDialog
        open={xhsDialogOpen}
        onOpenChange={setXhsDialogOpen}
        onImport={handleXhsImport}
        importing={xhsImporting || pdf.uploading}
        importError={errors}
      />

      {(errors || chat.error || personaFlow.error) && (
        <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-xs text-rose-800">
          ❌ 发生错误：{errors || chat.error?.message || personaFlow.error?.message}，请点击重新开始重试
        </div>
      )}
    </div>
  );
}
