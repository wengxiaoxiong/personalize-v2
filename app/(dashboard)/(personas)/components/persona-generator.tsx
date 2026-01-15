"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ToolUIPart } from "ai";
import { RefreshCw, ArrowLeft } from "lucide-react";
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
import { PersonaEntryCards } from "./persona-entry-cards";

export function PersonaGenerator() {
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [xhsDialogOpen, setXhsDialogOpen] = useState(false);
  const [xhsImporting, setXhsImporting] = useState(false);
  const [showAICreateInput, setShowAICreateInput] = useState(false);
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
        // 导入成功后立即关闭对话框，提升用户体验
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

  const handleDocumentUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleXhsImportClick = useCallback(() => {
    setXhsDialogOpen(true);
  }, []);

  const handleAICreate = useCallback(() => {
    setShowAICreateInput(true);
  }, []);

  const handleBackToCards = useCallback(() => {
    setShowAICreateInput(false);
    // 清空输入内容，回到初始状态
    setInputValue("");
  }, [setInputValue]);

  const handleResetWorkflow = useCallback(() => {
    resetWorkflow();
    setShowAICreateInput(false);
  }, [resetWorkflow]);

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
                onClick={handleResetWorkflow}
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
        <div className="flex items-center justify-center min-h-[calc(100vh-220px)] py-8">
          {/* 隐藏的文件输入，用于卡片点击时触发文件选择器 */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={onFileChange}
            className="hidden"
            disabled={pdf.uploading}
            id="pdf-upload-initial"
          />
          {!showAICreateInput ? (
            <PersonaEntryCards
              onDocumentUpload={handleDocumentUpload}
              onXhsImport={handleXhsImportClick}
              onAICreate={handleAICreate}
              disabled={pdf.uploading || xhsImporting}
            />
          ) : (
            <div className="w-full max-w-2xl mx-auto space-y-6 px-4 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToCards}
                  className="gap-2 transition-all duration-200 hover:bg-muted/80 hover:translate-x-[-2px]"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                  返回
                </Button>
              </div>
              <div className="text-center space-y-2 animate-in slide-in-from-bottom-4 fade-in-50 duration-500 delay-100">
                <h2 className="text-2xl md:text-3xl font-semibold text-foreground">自定义需求描述</h2>
                <p className="text-muted-foreground text-sm">
                  告诉 AI 你想要什么，我们将协助你从零构建人设
                </p>
              </div>
              <div className="space-y-4 animate-in slide-in-from-bottom-4 fade-in-50 duration-500 delay-200">
                <AgentPromptInput
                  value={persona.inputValue}
                  onChange={setInputValue}
                  onSubmit={handleSubmit}
                  status={chat.status}
                  placeholder="在这里输入你的需求，描述你想要构建的人设...&#10;&#10;例如：&#10;- 我想要一个科技博主人设，擅长讲解AI和编程技术&#10;- 风格要专业但易懂，适合初学者&#10;- 语气要轻松友好，不要过于严肃"
                  disabled={pdf.uploading}
                  submitDisabled={pdf.uploading || !persona.inputValue.trim()}
                  textareaClassName="min-h-[200px] md:min-h-[240px] text-base transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          )}
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
