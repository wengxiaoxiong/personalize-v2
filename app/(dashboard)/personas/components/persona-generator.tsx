"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useChat, useCompletion } from "@ai-sdk/react";
import { isToolUIPart, getToolName } from "ai";
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
import { PersonaGenerationPreview } from "./persona-generation-preview";
import { DefaultChatTransport } from "ai";
import { parsePdfToText } from "@/lib/resume-parser";
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputTextarea,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { PersonaConversation } from "./persona-conversation";
import { PersonaSaveForm } from "./persona-save-form";
import { PdfUploadControl } from "./persona-pdf-upload";
import { QUESTIONS, buildFallbackPersona } from "./persona-generator-helpers";

export function PersonaGenerator() {
  const [finalPersona, setFinalPersona] = useState<PersonaParseResult | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ stage: string; progress: number } | undefined>();
  const personaGenerationTriggered = useRef(false);
  const processedToolCallIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const {
    completion: personaCompletion,
    complete: generatePersona,
    stop: stopPersona,
    isLoading: personaLoading,
    error: personaError,
    setCompletion: setPersonaCompletion,
  } = useCompletion({
    api: "/api/personas/generate",
    streamProtocol: "text",
    experimental_throttle: 50,
    onError: (err) => {
      console.error("生成人设错误：", err);
      personaGenerationTriggered.current = false;
    },
    onFinish: (text) => {
      const parsed = parsePersonaMarkdown(text) ?? parsedPersona;
      const persona = parsed ?? buildFallbackPersona(text);
      setFinalPersona(persona);
    },
  });

  useEffect(() => {
    if (personaError) {
      personaGenerationTriggered.current = false;
    }
  }, [personaError]);

  const buildPersonaPayload = useCallback(() => {
    const hasPdfContent = messages.some(
      (msg) =>
        msg.role === "user" &&
        msg.parts.some((part) => part.type === "text" && part.text.includes("[已上传简历/PDF]"))
    );

    if (hasPdfContent) {
      const pdfMessage = messages.find(
        (msg) =>
          msg.role === "user" &&
          msg.parts.some((part) => part.type === "text" && part.text.includes("[已上传简历/PDF]"))
      );
      const userSupplements = messages
        .filter(
          (msg) =>
            msg.role === "user" &&
            !msg.parts.some((part) => part.type === "text" && part.text.includes("[已上传简历/PDF]"))
        )
        .map((msg) =>
          msg.parts
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join("")
        )
        .join("\n");

      const pdfText =
        pdfMessage?.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("")
          .replace("[已上传简历/PDF]\n\n", "") || "";

      return {
        brief: pdfText + (userSupplements ? `\n\n用户补充需求：\n${userSupplements}` : ""),
        goal: "基于上传的PDF内容和用户补充的需求，生成一个可直接用于 KOS dashboard 的人设模板，并突出互动性。",
      };
    }

    return {
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join(""),
      })),
    };
  }, [messages]);

  const handlePersonaGeneration = useCallback(async () => {
    if (personaGenerationTriggered.current) return;
    personaGenerationTriggered.current = true;
    setPersonaCompletion("");
    setFinalPersona(null);
    setShowPreview(true);

    try {
      await generatePersona("", {
        body: buildPersonaPayload(),
      });
    } catch (err) {
      console.error("生成人设错误：", err);
      personaGenerationTriggered.current = false;
    }
  }, [buildPersonaPayload, generatePersona, setPersonaCompletion]);

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

  useEffect(() => {
    if (personaGenerationTriggered.current) return;

    for (const msg of [...messages].reverse()) {
      if (msg.role !== "assistant" || !msg.parts) continue;

      for (const part of msg.parts) {
        if (!isToolUIPart(part)) continue;

        const toolName = getToolName(part);
        if (toolName === "finalizePersona") {
          const toolCallId = part.toolCallId;
          if (toolCallId && !processedToolCallIds.current.has(toolCallId)) {
            processedToolCallIds.current.add(toolCallId);
            handlePersonaGeneration();
            return;
          }
        }
      }
    }
  }, [messages, handlePersonaGeneration]);

  const handleSubmit = async (message: PromptInputMessage) => {
    const currentInput = message.text || inputValue;
    const trimmedInput = currentInput.trim();
    if (!trimmedInput) return;

    if (!hasStarted) {
      setHasStarted(true);
    }

    const generateKeywords = ["生成人设", "生成", "开始生成", "生成吧", "可以生成了"];
    const shouldGenerate = generateKeywords.some((keyword) =>
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
    setPersonaCompletion("");
    setFinalPersona(null);
    setShowSaveDialog(false);
    setSaveMessage(null);
    setShowPreview(false);
    stopPersona();
    personaGenerationTriggered.current = false;
    processedToolCallIds.current.clear();
    setSelectedOptions([]);
    setInputValue("");
    setHasStarted(false);
    isFirstLoad.current = true;
    setMessages([]);
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

    setPdfUploading(true);
    setPdfProgress({ stage: "开始解析...", progress: 0 });

    try {
      const extractedText = await parsePdfToText(file, (stage, progress) => {
        setPdfProgress({ stage, progress });
      });

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error("PDF 文字提取失败，未能提取到任何文字内容。请检查 PDF 文件是否清晰。");
      }

      const pdfMessageText = `[已上传简历/PDF]\n\n${extractedText.substring(0, 2000)}${
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
      setPdfUploading(false);
      setPdfProgress(undefined);
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

          <PromptInput onSubmit={handleSubmit} className="rounded-lg border bg-card/80">
            <PromptInputBody>
              <PromptInputTextarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="min-h-[200px] md:min-h-[240px] text-base"
                placeholder="在这里输入你的需求，描述你想要构建的KOS人设..."
                disabled={pdfUploading}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputSubmit status={status} disabled={pdfUploading || !inputValue.trim()} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );

  const renderActiveView = () => (
    <div
      className={cn("grid gap-4", "lg:transition-[grid-template-columns] lg:duration-500 lg:ease-in-out")}
      style={{
        gridTemplateColumns: isDesktop ? (showPreview ? "1.15fr 0.85fr" : "1fr 0fr") : "1fr",
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

          <PersonaConversation
            messages={messages}
            status={status}
            selectedOptions={selectedOptions}
            onOptionToggle={handleOptionToggle}
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

            <PromptInput onSubmit={handleSubmit} className="rounded-lg border bg-card/80">
              <PromptInputBody>
                <PromptInputTextarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="min-h-[110px]"
                  placeholder={
                    !personaLoading && !pdfUploading
                      ? "直接输入你的回答，信息够了随时说“生成人设”"
                      : pdfUploading
                        ? "正在解析PDF..."
                        : "人设生成中，请勿输入..."
                  }
                  disabled={disableSubmit}
                />
              </PromptInputBody>
              <PromptInputFooter>
                {personaLoading && (
                  <PromptInputButton type="button" variant="outline" onClick={() => stopPersona()}>
                    停止生成
                  </PromptInputButton>
                )}
                <PromptInputSubmit status={status} disabled={disableSubmit} />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "h-[calc(100vh-220px)] min-h-[620px] rounded-xl border bg-background p-4 overflow-hidden transition-opacity duration-500 ease-in-out",
          showPreview ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {showPreview && (
          <PersonaGenerationPreview
            markdown={personaCompletion}
            isGenerating={personaLoading}
            onSave={openSaveDialog}
            canSave={Boolean(parsedPersona || personaCompletion)}
          />
        )}
      </div>
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
