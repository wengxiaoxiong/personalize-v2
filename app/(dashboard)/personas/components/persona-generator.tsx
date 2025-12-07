"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
import { parsePersonaMarkdown, type PersonaParseResult } from "@/lib/persona-parser";
import { PromptInputButton, type PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { MessageResponse } from "@/components/ai-elements/message";
import { AgentConversation } from "@/modules/agent/ui/agent-conversation";
import { AgentSidecar } from "@/modules/agent/ui/agent-sidecar";
import { useAgentChat } from "@/modules/agent/hooks/use-agent-chat";
import { useAgentTask } from "@/modules/agent/hooks/use-agent-task";
import { usePaneState } from "@/modules/agent/hooks/use-pane-state";
import { useToolSignal } from "@/modules/agent/hooks/use-tool-signal";
import { useFileIngestion } from "@/modules/agent/hooks/use-file-ingestion";
import type { AgentPartRenderer } from "@/modules/agent/types/agent";
import { AgentPromptInput } from "@/modules/agent/ui/agent-prompt-input";
import {
  PERSONA_GENERATE_KEYWORDS,
  PERSONA_TOOL_NAME,
  PERSONA_PDF_MARKER,
  buildPersonaPayload,
  parsePersonaResult,
} from "@/modules/agent/adapters/persona";
import { PersonaGenerationPreview } from "./persona-generation-preview";
import { parsePdfToText } from "@/lib/resume-parser";
import { PersonaSaveForm } from "./persona-save-form";
import { PdfUploadControl } from "./persona-pdf-upload";
import { QUESTIONS, buildFallbackPersona } from "./persona-generator-helpers";
import { extractSelectionQuestions } from "./persona-generator-helpers";
import { SelectionQuestionCard } from "@/modules/agent/ui/selection-question-card";
import { ToolCallCard } from "@/modules/agent/ui/tool-call-card";

export function PersonaGenerator() {
  const [finalPersona, setFinalPersona] = useState<PersonaParseResult | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const personaGenerationTriggered = useRef(false);
  const isFirstLoad = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const pane = usePaneState(false);

  const { ingest, uploading: pdfUploading, progress: pdfProgress } = useFileIngestion({
    parser: parsePdfToText,
    acceptTypes: ["application/pdf"],
    maxSizeMb: 10,
    onError: (err) => console.error(err),
  });

  const { messages, sendMessage, status, error, setMessages, reset: resetChatState } = useAgentChat({
    api: "/api/chat",
    model: "deepseek/deepseek-chat",
  });

  const {
    task: personaTask,
    start: startPersona,
    stop: stopPersona,
    setResult: setPersonaResult,
  } = useAgentTask<string>({
    api: "/api/personas/generate",
    streamProtocol: "text",
    throttleInterval: 50,
    onError: (err) => {
      console.error("生成人设错误：", err);
      personaGenerationTriggered.current = false;
    },
    onFinish: (text) => {
      const persona = parsePersonaResult(text);
      setFinalPersona(persona);
    },
  });

  const personaCompletion = personaTask.result ?? "";
  const personaLoading = personaTask.status === "running";
  const personaError = personaTask.error;

  useEffect(() => {
    if (personaError) {
      personaGenerationTriggered.current = false;
    }
  }, [personaError]);

  const handlePersonaGeneration = useCallback(async () => {
    if (personaGenerationTriggered.current) return;
    personaGenerationTriggered.current = true;
    setPersonaResult("");
    setFinalPersona(null);
    pane.toggle(true);

    try {
      await startPersona("", {
        body: buildPersonaPayload(messages),
      });
    } catch (err) {
      console.error("生成人设错误：", err);
      personaGenerationTriggered.current = false;
    }
  }, [messages, pane.toggle, setPersonaResult, startPersona]);

  const handleOptionToggle = useCallback((option: string) => {
    setSelectedOptions((prev) => {
      const alreadySelected = prev.includes(option);

      setInputValue((current) => {
        const lines = current
          .split(/\n/)
          .map((line) => line.trim())
          .filter(Boolean);

        if (alreadySelected) {
          const remaining = lines.filter((line) => line !== option);
          return remaining.join("\n");
        }

        if (lines.includes(option)) {
          return current;
        }

        return [...lines, option].join("\n");
      });

      return alreadySelected ? prev.filter((item) => item !== option) : [...prev, option];
    });
  }, []);

  const handleClearSelections = useCallback(() => {
    setSelectedOptions([]);
    setInputValue((current) => {
      if (!selectedOptions.length) return current;
      const lines = current
        .split(/\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !selectedOptions.includes(line));

      return lines.join("\n");
    });
  }, [selectedOptions]);

  useEffect(() => {
    if (hasStarted && isFirstLoad.current) {
      isFirstLoad.current = false;
      setMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          parts: [{ type: "text", text: QUESTIONS[0] }],
        },
      ]);
    }
  }, [hasStarted, setMessages]);

  useToolSignal({
    messages,
    toolName: PERSONA_TOOL_NAME,
    onMatch: () => handlePersonaGeneration(),
  });

  const handleSubmit = async (message: PromptInputMessage) => {
    const currentInput = message.text || inputValue;
    const trimmedInput = currentInput.trim();
    if (!trimmedInput) return;

    if (!hasStarted) {
      setHasStarted(true);
    }

    const shouldGenerate = PERSONA_GENERATE_KEYWORDS.some((keyword) =>
      trimmedInput.toLowerCase().includes(keyword.toLowerCase())
    );

    const sendTask = sendMessage(
      {
        text: trimmedInput,
        files: message.files,
      },
      {
        body: {
          model: "deepseek/deepseek-chat",
        },
      }
    );

    if (shouldGenerate && !personaGenerationTriggered.current) {
      handlePersonaGeneration();
    }

    await sendTask;
    setSelectedOptions([]);
    setInputValue("");
  };

  const resetChat = async () => {
    setPersonaResult("");
    setFinalPersona(null);
    setShowSaveDialog(false);
    setSaveMessage(null);
    pane.toggle(false);
    stopPersona();
    personaGenerationTriggered.current = false;
    setSelectedOptions([]);
    setInputValue("");
    setSelectedFile(null);
    setHasStarted(false);
    isFirstLoad.current = true;
    resetChatState();
  };

  const handleSaved = (message?: string) => {
    setSaveMessage(message ?? "人设已保存成功！");
    setShowSaveDialog(false);
    setTimeout(() => {
      setSaveMessage(null);
    }, 3000);
  };

  const handlePdfUpload = async (file: File) => {
    if (!hasStarted) {
      setHasStarted(true);
    }

    try {
      const extractedText = await ingest(file);

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error("PDF 文字提取失败，未能提取到任何文字内容。请检查 PDF 文件是否清晰。");
      }

      const pdfMessageText = `${PERSONA_PDF_MARKER}\n\n${extractedText.substring(0, 2000)}${
        extractedText.length > 2000 ? "..." : ""
      }`;

      await sendMessage({
        parts: [{ type: "text", text: pdfMessageText }],
      });
    } catch (err) {
      console.error("PDF 处理错误：", err);
      const errorMessage = err instanceof Error ? err.message : "PDF 处理失败，请重试";
      alert(errorMessage);
    } finally {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("请上传 PDF 文件");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("文件大小不能超过 10MB");
      return;
    }

    setSelectedFile(file);
    await handlePdfUpload(file);
  };

  const disableSubmit = status === "streaming" || personaLoading || pdfUploading;
  const parsedPersona = useMemo(() => parsePersonaMarkdown(personaCompletion), [personaCompletion]);

  const openSaveDialog = useCallback(() => {
    const persona =
      parsedPersona ?? finalPersona ?? (personaCompletion ? buildFallbackPersona(personaCompletion) : null);

    if (!persona) return;
    setFinalPersona(persona);
    setShowSaveDialog(true);
  }, [finalPersona, parsedPersona, personaCompletion]);

  const selectionRenderer = useCallback<AgentPartRenderer>(
    ({ part, message }) => {
      if (part.type !== "text" || !part.text) return null;
      const { cleanText, questions } = extractSelectionQuestions(part.text);
      if (!questions.length) return null;

      return (
        <div className="space-y-3">
          {cleanText && (
            <MessageResponse
              className={cn(
                "max-w-none whitespace-pre-wrap break-words",
                message.role === "assistant" ? "prose prose-sm" : "text-sm leading-relaxed text-primary-foreground"
              )}
            >
              {cleanText}
            </MessageResponse>
          )}
          {questions.map((question, questionIdx) => (
            <SelectionQuestionCard
              key={`${message.id}-question-${questionIdx}`}
              question={question}
              selectedOptions={selectedOptions}
              onSelect={handleOptionToggle}
            />
          ))}
        </div>
      );
    },
    [handleOptionToggle, selectedOptions]
  );

  const toolRenderer = useCallback((part: ToolUIPart) => <ToolCallCard part={part} />, []);

  const renderInitialView = () => (
    <div className="flex items-center justify-center min-h-[calc(100vh-220px)]">
      <div className="w-full max-w-2xl mx-auto space-y-6 px-4">
        <h2 className="text-2xl md:text-3xl font-semibold text-center text-foreground">开始构建新的KOS人设</h2>

        <div className="space-y-4">
          <PdfUploadControl
            fileInputRef={fileInputRef}
            onFileSelect={handleFileSelect}
            pdfUploading={pdfUploading}
            pdfProgress={pdfProgress}
            selectedFileName={selectedFile?.name}
          />

          <AgentPromptInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            status={status}
            placeholder="在这里输入你的需求，描述你想要构建的KOS人设..."
            disabled={pdfUploading}
            submitDisabled={pdfUploading || !inputValue.trim()}
            textareaClassName="min-h-[200px] md:min-h-[240px] text-base"
          />
        </div>
      </div>
    </div>
  );

  const renderActiveView = () => (
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
            onClick={resetChat}
            disabled={status === "streaming" || personaLoading}
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
            messages={messages}
            status={status}
            renderers={[selectionRenderer]}
            toolRenderer={toolRenderer}
          />

          <div className="space-y-2 shrink-0">
            <PdfUploadControl
              fileInputRef={fileInputRef}
              onFileSelect={handleFileSelect}
              pdfUploading={pdfUploading}
              pdfProgress={pdfProgress}
              selectedFileName={selectedFile?.name}
              disabled={disableSubmit}
            />

            {selectedOptions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs">
                <span className="text-muted-foreground">已选择</span>
                {selectedOptions.map((option) => (
                  <Badge
                    key={option}
                    variant="secondary"
                    className="border-emerald-200 bg-emerald-50 text-emerald-700"
                  >
                    {option}
                  </Badge>
                ))}
                <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={handleClearSelections}>
                  清空
                </Button>
              </div>
            )}

            <AgentPromptInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleSubmit}
              status={status}
              placeholder={
                !personaLoading && !pdfUploading
                  ? "直接输入你的回答，信息够了随时说“生成人设”"
                  : pdfUploading
                    ? "正在解析PDF..."
                    : "人设生成中，请勿输入..."
              }
              disabled={disableSubmit}
              submitDisabled={disableSubmit}
              footerContent={
                personaLoading ? (
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
          markdown={personaCompletion}
          isGenerating={personaLoading}
          onSave={openSaveDialog}
          canSave={Boolean(parsedPersona || personaCompletion)}
        />
      </AgentSidecar>
    </div>
  );

  return (
    <div className="w-full mx-auto space-y-5">
      {!hasStarted ? renderInitialView() : renderActiveView()}

      {saveMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-800">
          ✅ {saveMessage}
        </div>
      )}

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>保存人设</DialogTitle>
            <DialogDescription>人设生成完毕，请完善信息并保存到数据库</DialogDescription>
          </DialogHeader>
          {finalPersona && (
            <PersonaSaveForm persona={finalPersona} onSuccess={handleSaved} onCancel={() => setShowSaveDialog(false)} />
          )}
        </DialogContent>
      </Dialog>

      {(error || personaError) && (
        <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-xs text-rose-800">
          ❌ 发生错误：{error?.message || personaError?.message}，请点击重新开始重试
        </div>
      )}
    </div>
  );
}
