"use client";

import React, { useActionState, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useChat, useCompletion } from "@ai-sdk/react";
import { isToolUIPart, getToolName, type ToolUIPart } from "ai";
import { Save, RefreshCw, FileText, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { parsePersonaMarkdown, type PersonaParseResult } from "@/lib/persona-parser";
import { createPersonaAction, type ActionState } from "@/app/actions";
import { PersonaGenerationPreview } from "./persona-generation-preview";
import { DefaultChatTransport } from "ai";
import { parsePdfToText } from "@/lib/resume-parser";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputTextarea,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Loader } from "@/components/ai-elements/loader";

// 固定提问列表（口语化）
const QUESTIONS = [
  "嗨～ 先跟我说说你的账号是个人账号还是公司账号呀？比如「个人」或者「OnBeat Lab 品牌账号」这样～",
  "接下来告诉我账号主体的性别和生活特征吧！比如「女性，喜欢夜生活、独立音乐、数字艺术」",
  "目标受众是哪些小伙伴呢？比如「18-28岁一二线城市潮流青年」",
  "内容主要覆盖哪些领域呀？比如「穿搭、香氛、线下派对、数字艺术展」",
  "有没有平台特定要求或互动需求？比如「小红书/抖音适配，需要带动现场互动」",
];

type SelectionQuestion = {
  title: string;
  options: string[];
};

const selectionBlockRegex = /<选择题>([\s\S]*?)<\/选择题>/g;

const extractSelectionQuestions = (
  text: string
): { cleanText: string; questions: SelectionQuestion[] } => {
  selectionBlockRegex.lastIndex = 0;
  const questions: SelectionQuestion[] = [];
  const matches = Array.from(text.matchAll(selectionBlockRegex));

  for (const match of matches) {
    const block = match[1] ?? "";
    const titleMatch = block.match(/<题目>([\s\S]*?)<\/题目>/);
    const optionMatches = Array.from(block.matchAll(/<选项>([\s\S]*?)<\/选项>/g))
      .map((m) => (m[1] ?? "").trim())
      .filter((opt): opt is string => opt.length > 0);

    const title = titleMatch?.[1]?.trim() ?? "";
    if (title && optionMatches.length > 0) {
      questions.push({ title, options: optionMatches });
    }
  }

  const cleanText = matches.length > 0 ? text.replace(selectionBlockRegex, "").trim() : text;
  return { cleanText, questions };
};

type PersonaSaveFormProps = {
  persona: PersonaParseResult;
  onSuccess: (message?: string) => void;
  onCancel: () => void;
};

const buildFallbackPersona = (markdown: string): PersonaParseResult => ({
  name: "",
  alias: "",
  tagline: "",
  audience: "",
  voice: "",
  tone: "",
  domainTags: [],
  style: "",
  background: "",
  contentPillars: [],
  hooks: [],
  reminders: [],
  bio: "",
  callToAction: "",
  rawMarkdown: markdown,
});

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

  // 检测是否是桌面端
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const {
    messages,
    sendMessage,
    status,
    error,
    setMessages,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
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
    streamProtocol:'text',
    experimental_throttle: 50,
    onError: (err) => {
      console.error("生成人设错误：", err);
      personaGenerationTriggered.current = false;
    },
    onFinish: (text) => {
      // 生成完成时，解析并弹出保存对话框（解析失败也兜底展示保存弹窗）
      const parsed = parsePersonaMarkdown(text) ?? parsedPersona;
      const persona = parsed ?? buildFallbackPersona(text);
      setFinalPersona(persona);
      
    },
  });

  // 实时监听 completion 变化，解析 markdown（用于实时预览）
  // 注意：这里不设置 finalPersona，只在 onFinish 时设置，避免频繁更新
  // completion 会实时更新，PersonaGenerationPreview 组件会实时显示

  useEffect(() => {
    if (personaError) {
      personaGenerationTriggered.current = false;
    }
  }, [personaError]);

  const buildPersonaPayload = useCallback(() => {
    const hasPdfContent = messages.some(msg =>
      msg.role === "user" &&
      msg.parts.some(part =>
        part.type === "text" &&
        part.text.includes("[已上传简历/PDF]")
      )
    );

    if (hasPdfContent) {
      const pdfMessage = messages.find(msg =>
        msg.role === "user" &&
        msg.parts.some(part =>
          part.type === "text" &&
          part.text.includes("[已上传简历/PDF]")
        )
      );
      const userSupplements = messages
        .filter(msg =>
          msg.role === "user" &&
          !msg.parts.some(part =>
            part.type === "text" &&
            part.text.includes("[已上传简历/PDF]")
          )
        )
        .map(msg =>
          msg.parts
            .filter(part => part.type === "text")
            .map(part => part.text)
            .join("")
        )
        .join("\n");

      const pdfText = pdfMessage?.parts
        .filter(part => part.type === "text")
        .map(part => part.text)
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
          .filter(part => part.type === "text")
          .map(part => part.text)
          .join(""),
      })),
    };
  }, [messages]);

  const handlePersonaGeneration = useCallback(async () => {
    if (personaGenerationTriggered.current) return;
    personaGenerationTriggered.current = true;
    setPersonaCompletion("");
    setFinalPersona(null);
    setShowPreview(true); // 显示预览面板

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

      return alreadySelected
        ? prev.filter((item) => item !== option)
        : [...prev, option];
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

  // 初始化第一条AI消息
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      setMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          parts: [{ type: "text", text: QUESTIONS[0] }],
        },
      ]);
    }
  }, [setMessages]);

  // 当模型通过工具判断信息足够时触发生成人设
  useEffect(() => {
    if (personaGenerationTriggered.current) return;

    // 从最新消息开始查找，找到第一个包含 finalizePersona 工具调用的消息
    for (const msg of [...messages].reverse()) {
      if (msg.role !== "assistant" || !msg.parts) continue;
      
      for (const part of msg.parts) {
        if (!isToolUIPart(part)) continue;
        
        const toolName = getToolName(part);
        if (toolName === "finalizePersona") {
          // 使用 toolCallId 来确保每个工具调用只处理一次
          const toolCallId = part.toolCallId;
          if (toolCallId && !processedToolCallIds.current.has(toolCallId)) {
            processedToolCallIds.current.add(toolCallId);
            handlePersonaGeneration();
            return; // 找到后立即返回，避免重复处理
          }
        }
      }
    }
  }, [messages, handlePersonaGeneration]);


  // 处理提交
  const handleSubmit = async (message: PromptInputMessage) => {
    const currentInput = message.text || inputValue;
    const trimmedInput = currentInput.trim();
    if (!trimmedInput) return;

    const generateKeywords = ["生成人设", "生成", "开始生成", "生成吧", "可以生成了"];
    const shouldGenerate = generateKeywords.some(keyword =>
      trimmedInput.toLowerCase().includes(keyword.toLowerCase())
    );

    const sendTask = sendMessage(
      { 
        text: trimmedInput,
        files: message.files 
      },
      {
        body: {
          model: 'deepseek/deepseek-chat',
        },
      },
    );

    if (shouldGenerate && !personaGenerationTriggered.current) {
      handlePersonaGeneration();
    }

    await sendTask;
    setSelectedOptions([]);
    setInputValue("");
  };

  // 重置对话
  const resetChat = async () => {
    setPersonaCompletion("");
    setFinalPersona(null);
    setShowSaveDialog(false);
    setSaveMessage(null);
    setShowPreview(false); // 隐藏预览面板
    stopPersona();
    personaGenerationTriggered.current = false;
    processedToolCallIds.current.clear();
    setSelectedOptions([]);
    setInputValue("");

    setMessages([
      {
        id: crypto.randomUUID(),
        role: "assistant",
        parts: [{ type: "text", text: QUESTIONS[0] }],
      },
    ]);
  };

  // 处理保存成功
  const handleSaved = (message?: string) => {
    setSaveMessage(message ?? "人设已保存成功！");
    setShowSaveDialog(false);
    setTimeout(() => {
      setSaveMessage(null);
    }, 3000);
  };

  // 处理 PDF 上传
  const handlePdfUpload = async (file: File) => {
    setPdfUploading(true);
    setPdfProgress({ stage: "开始解析...", progress: 0 });

    try {
      const extractedText = await parsePdfToText(file, (stage, progress) => {
        setPdfProgress({ stage, progress });
      });

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error("PDF 文字提取失败，未能提取到任何文字内容。请检查 PDF 文件是否清晰。");
      }

      const pdfMessageText = `[已上传简历/PDF]\n\n${extractedText.substring(0, 2000)}${extractedText.length > 2000 ? '...' : ''}`;

      await sendMessage({
        parts: [{ type: "text", text: pdfMessageText }]
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
      parsedPersona ??
      finalPersona ??
      (personaCompletion ? buildFallbackPersona(personaCompletion) : null);

    if (!persona) return;
    setFinalPersona(persona);
    setShowSaveDialog(true);
  }, [finalPersona, parsedPersona, personaCompletion]);

  return (
    <div className="w-full mx-auto space-y-5">
      <div 
        className={cn(
          "grid gap-4",
          "lg:transition-[grid-template-columns] lg:duration-500 lg:ease-in-out"
        )}
        style={{
          gridTemplateColumns: isDesktop
            ? (showPreview ? '1.15fr 0.85fr' : '1fr 0fr')
            : '1fr',
        }}
      >
        {/* 聊天区 */}
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

            <Conversation className="flex-1 min-h-0 rounded-lg border bg-muted/30 p-3">
              <ConversationContent>
                {messages.map((message) => (
                  <Message key={message.id} from={message.role}>
                    <MessageContent
                      className={cn(
                        "max-w-full break-words rounded-xl border px-3 py-2 shadow-sm whitespace-pre-wrap space-y-3",
                        message.role === "assistant"
                          ? "bg-card text-foreground"
                          : "bg-primary text-primary-foreground"
                      )}
                    >
                      {message.parts?.map((part, idx) => {
                        if (part.type === "text") {
                          if (!part.text) return null;
                          const { cleanText, questions } = extractSelectionQuestions(part.text);
                          return (
                            <div key={`${message.id}-text-${idx}`} className="space-y-3">
                              {cleanText && (
                                <MessageResponse
                                  className={cn(
                                    "max-w-none whitespace-pre-wrap break-words",
                                    message.role === "assistant"
                                      ? "prose prose-sm"
                                      : "text-sm leading-relaxed text-primary-foreground"
                                  )}
                                >
                                  {cleanText}
                                </MessageResponse>
                              )}
                              {questions.map((question, questionIdx) => (
                                <SelectionQuestionCard
                                  key={`${message.id}-question-${idx}-${questionIdx}`}
                                  question={question}
                                  selectedOptions={selectedOptions}
                                  onSelect={handleOptionToggle}
                                />
                              ))}
                            </div>
                          );
                        }

                        if (isToolUIPart(part)) {
                          return (
                            <ToolCallCard
                              key={part.toolCallId || `${message.id}-tool-${idx}`}
                              part={part}
                            />
                          );
                        }

                        return null;
                      })}
                    </MessageContent>
                  </Message>
                ))}
                {status === "submitted" && <Loader />}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>

            <div className="space-y-2 shrink-0">
              {/* PDF 上传区域 */}
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={pdfUploading || personaLoading || status === "streaming"}
                  id="pdf-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={pdfUploading || personaLoading || status === "streaming"}
                  className="flex items-center gap-1.5"
                >
                  <FileText className="h-4 w-4" />
                  {pdfUploading ? "解析中..." : "上传简历/PDF"}
                </Button>
                {selectedFile && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      disabled={pdfUploading}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {pdfUploading && pdfProgress && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{pdfProgress.stage}</span>
                    <span className="text-primary">{Math.round(pdfProgress.progress * 100)}%</span>
                  </div>
                )}
              </div>

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
                    <PromptInputButton
                      type="button"
                      variant="outline"
                      onClick={() => stopPersona()}
                    >
                      停止生成
                    </PromptInputButton>
                  )}
                  <PromptInputSubmit status={status} disabled={disableSubmit} />
                </PromptInputFooter>
              </PromptInput>
            </div>
          </div>
        </div>

        {/* 生成预览区 */}
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

      {/* 保存成功提示 */}
      {saveMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-800">
          ✅ {saveMessage}
        </div>
      )}

      {/* 保存对话框 */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>保存人设</DialogTitle>
            <DialogDescription>
              人设生成完毕，请完善信息并保存到数据库
            </DialogDescription>
          </DialogHeader>
          {finalPersona && (
            <PersonaSaveForm
              persona={finalPersona}
              onSuccess={handleSaved}
              onCancel={() => setShowSaveDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 错误提示 */}
      {(error || personaError) && (
        <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-xs text-rose-800">
          ❌ 发生错误：{error?.message || personaError?.message}，请点击重新开始重试
        </div>
      )}
    </div>
  );
}

type ToolState = ToolUIPart["state"];

function SelectionQuestionCard({
  question,
  selectedOptions,
  onSelect,
}: {
  question: SelectionQuestion;
  selectedOptions: string[];
  onSelect: (option: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border bg-muted/50 p-3 shadow-sm">
      <p className="font-medium text-sm text-foreground">{question.title}</p>
      <div className="flex flex-wrap gap-2">
        {question.options.map((option) => {
          const isSelected = selectedOptions.includes(option);
          return (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={isSelected ? "secondary" : "outline"}
              className={cn(
                "rounded-full border px-3 text-xs transition-colors",
                isSelected
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                  : "hover:border-primary/40"
              )}
              onClick={() => onSelect(option)}
            >
              {option}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function getToolStatusMeta(state: ToolState) {
  switch (state) {
    case "input-streaming":
      return { label: "正在整理参数", className: "border-amber-200 bg-amber-50 text-amber-700" };
    case "input-available":
      return { label: "即将触发", className: "border-sky-200 bg-sky-50 text-sky-700" };
    case "output-available":
      return { label: "执行完成", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
    case "output-error":
      return { label: "执行失败", className: "border-rose-200 bg-rose-50 text-rose-700" };
    default:
      return { label: "处理中", className: "border-muted bg-muted/70 text-foreground" };
  }
}

function formatToolValue(value: unknown) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function ToolCallCard({ part }: { part: ToolUIPart }) {
  const toolName = getToolName(part);
  const statusMeta = getToolStatusMeta(part.state);
  const output = "output" in part ? part.output : undefined;
  const input = "input" in part ? part.input : undefined;
  const errorText = "errorText" in part ? part.errorText : undefined;
  const hasInput = input !== undefined && input !== null;
  const hasOutput = output !== undefined && output !== null;

  return (
    <div className="space-y-2 rounded-lg border bg-background/70 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">工具调用：{toolName}</span>
          {part.providerExecuted && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              已由模型执行
            </span>
          )}
        </div>
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${statusMeta.className}`}>
          {statusMeta.label}
        </span>
      </div>

      {hasInput && (
        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">参数</p>
          <pre className="whitespace-pre-wrap rounded-md bg-muted/60 p-2 text-[11px] leading-5">
            {formatToolValue(input)}
          </pre>
        </div>
      )}

      {hasOutput && (
        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">返回</p>
          <pre className="whitespace-pre-wrap rounded-md bg-muted/60 p-2 text-[11px] leading-5">
            {formatToolValue(output)}
          </pre>
        </div>
      )}

      {errorText && (
        <p className="text-xs text-rose-600">错误：{errorText}</p>
      )}
    </div>
  );
}

// 人设保存表单
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

  const defaultDomain = persona.domainTags?.join(", ") || "";
  const defaultStyle = persona.voice || persona.tone || persona.style || "";
  const defaultContentPillars = persona.contentPillars?.join("\n") || "";
  const defaultHooks = persona.hooks?.join("\n") || "";
  const defaultReminders = persona.reminders?.join("\n") || "";

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
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
          保存人设
        </Button>
      </DialogFooter>
    </form>
  );
}
