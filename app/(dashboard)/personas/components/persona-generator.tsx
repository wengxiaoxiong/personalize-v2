"use client";

import React, { useActionState, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Save, RefreshCw, FileText, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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

type PersonaSaveFormProps = {
  persona: PersonaParseResult;
  onSuccess: (message?: string) => void;
  onCancel: () => void;
};

export function PersonaGenerator() {
  const [finalPersona, setFinalPersona] = useState<PersonaParseResult | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
  const [completion, setCompletion] = useState("");
  const [generationMode, setGenerationMode] = useState<"chat" | "pdf" | null>(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ stage: string; progress: number } | undefined>();
  const hasTriggeredGeneration = useRef(false);
  const isFirstLoad = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
    setMessages,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

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

  // 处理流式生成
  useEffect(() => {
    if (!isGeneratingPersona || !generationMode) return;
    if (!messages || messages.length === 0) return;
    if (completion && completion.trim().length > 0 && !completion.includes("❌")) {
      return;
    }

    const fetchPersona = async () => {
      try {
        const hasPdfContent = messages.some(msg =>
          msg.role === "user" &&
          msg.parts.some(part =>
            part.type === "text" &&
            part.text.includes("[已上传简历/PDF]")
          )
        );

        let requestBody;
        if (hasPdfContent && generationMode === "pdf") {
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

          requestBody = {
            brief: pdfText + (userSupplements ? `\n\n用户补充需求：\n${userSupplements}` : ""),
            goal: "基于上传的PDF内容和用户补充的需求，生成一个可直接用于 KOS dashboard 的人设模板，并突出互动性。",
          };
        } else {
          requestBody = {
            messages: messages.map((msg) => ({
              role: msg.role,
              content: msg.parts
                .filter(part => part.type === "text")
                .map(part => part.text)
                .join(""),
            })),
          };
        }

        const response = await fetch("/api/personas/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) throw new Error("生成人设失败");
        if (!response.body) throw new Error("无响应内容");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;

            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6);
              if (dataStr === "[DONE]") continue;

              try {
                const data = JSON.parse(dataStr);
                if (data.type === "text-delta" && data.delta) {
                  fullText += data.delta;
                  setCompletion(fullText);
                }
              } catch (e) {
                console.error("解析SSE数据失败:", e, "原始数据:", line);
              }
            }
          }
        }

        if (buffer) {
          if (buffer.startsWith("data: ")) {
            const dataStr = buffer.slice(6);
            if (dataStr !== "[DONE]") {
              try {
                const data = JSON.parse(dataStr);
                if (data.type === "text-delta" && data.delta) {
                  fullText += data.delta;
                  setCompletion(fullText);
                }
              } catch (e) {
                console.error("解析最后一块SSE数据失败:", e);
              }
            }
          }
        }

        const parsed = parsePersonaMarkdown(fullText);
        if (parsed) {
          setFinalPersona(parsed);
          setShowSaveDialog(true);
        }
      } catch (err) {
        console.error("生成人设错误：", err);
        setCompletion("❌ 生成人设失败，请点击重新开始重试");
        hasTriggeredGeneration.current = false;
      } finally {
        setIsGeneratingPersona(false);
        setGenerationMode(null);
      }
    };

    fetchPersona();
  }, [isGeneratingPersona, generationMode, messages, completion]);

  // 监听 chat API 返回的结束提示，触发生成人设
  useEffect(() => {
    if (generationMode !== null || hasTriggeredGeneration.current) return;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant") return;

    const lastMessageText = lastMessage.parts
      .filter(part => part.type === "text")
      .map(part => part.text)
      .join("");

    if (lastMessageText.includes("🎉 好啦！我已经收集完所有信息") ||
      lastMessageText.includes("现在开始为你生成专属人设")) {
      console.log("[PersonaGenerator] 检测到结束提示，开始生成人设");
      hasTriggeredGeneration.current = true;
      setGenerationMode("chat");
      setIsGeneratingPersona(true);
    }
  }, [messages, generationMode]);

  // 处理提交
  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    if (!hasText) return;

    const trimmedInput = message.text.trim();
    if (!trimmedInput) return;

    const hasPdfContent = messages.some(msg =>
      msg.role === "user" &&
      msg.parts.some(part =>
        part.type === "text" &&
        part.text.includes("[已上传简历/PDF]")
      )
    );

    const generateKeywords = ["生成人设", "生成", "开始生成", "生成吧", "可以生成了"];
    const shouldGenerate = generateKeywords.some(keyword =>
      trimmedInput.toLowerCase().includes(keyword.toLowerCase())
    );

    sendMessage(
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

    if (shouldGenerate && hasPdfContent) {
      if (!hasTriggeredGeneration.current) {
        hasTriggeredGeneration.current = true;
        setGenerationMode("pdf");
        setIsGeneratingPersona(true);
      }
    }
  };

  // 重置对话
  const resetChat = async () => {
    setCompletion("");
    setFinalPersona(null);
    setShowSaveDialog(false);
    setSaveMessage(null);
    setIsGeneratingPersona(false);
    setGenerationMode(null);
    hasTriggeredGeneration.current = false;
    setCompletion("");

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

  const disableSubmit = status === "streaming" || isGeneratingPersona || pdfUploading;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5">
      {/* 左右分栏布局 */}
      <Card className="h-[calc(100vh-280px)] min-h-[600px]">
        <CardContent className="h-full p-0">
          <div className="flex h-full gap-4">
            {/* 左侧：聊天区 */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden border-r">
              <div className="flex-1 flex flex-col overflow-hidden p-4">
                <Conversation className="flex-1 min-h-0">
                  <ConversationContent>
                    {messages.map((message) => (
                      <Message key={message.id} from={message.role}>
                        <MessageContent>
                          <MessageResponse>
                            {message.parts
                              .filter(part => part.type === "text")
                              .map(part => part.text)
                              .join("")}
                          </MessageResponse>
                        </MessageContent>
                      </Message>
                    ))}
                    {status === "submitted" && <Loader />}
                  </ConversationContent>
                  <ConversationScrollButton />
                </Conversation>

                <div className="mt-4 space-y-2 shrink-0">
                  {/* PDF 上传区域 */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={pdfUploading || isGeneratingPersona || status === "streaming"}
                      id="pdf-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={pdfUploading || isGeneratingPersona || status === "streaming"}
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

                  <PromptInput onSubmit={handleSubmit}>
                    <PromptInputBody>
                      <PromptInputTextarea
                        placeholder={
                          !isGeneratingPersona && !pdfUploading
                            ? "在这里输入你的回答..."
                            : pdfUploading
                            ? "正在解析PDF..."
                            : "人设生成中，请勿输入..."
                        }
                        disabled={disableSubmit}
                      />
                    </PromptInputBody>
                    <PromptInputFooter>
                      <PromptInputButton
                        type="button"
                        variant="outline"
                        onClick={resetChat}
                        disabled={status === "streaming" || isGeneratingPersona}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </PromptInputButton>
                      {isGeneratingPersona && (
                        <PromptInputButton
                          type="button"
                          variant="outline"
                          onClick={() => stop()}
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

            {/* 右侧：生成预览区 */}
            <div className="w-80 shrink-0 p-4 h-full overflow-hidden">
              <PersonaGenerationPreview
                markdown={completion}
                isGenerating={isGeneratingPersona}
              />
            </div>
          </div>
        </CardContent>
      </Card>

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
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-xs text-rose-800">
          ❌ 发生错误：{error.message}，请点击重新开始重试
        </div>
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
