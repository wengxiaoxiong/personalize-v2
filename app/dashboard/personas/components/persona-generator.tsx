"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Loader2, Pencil, Save } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parsePersonaMarkdown, type PersonaParseResult } from "@/lib/persona-parser";
import { createPersonaAction, type ActionState } from "@/app/actions";
import { PersonaChatArea } from "./persona-chat-area";
import { PersonaLivePanel, type LivePersonaData } from "./persona-live-panel";
import { extractPersonaFromMessages } from "@/lib/persona-extractor";
import { DefaultChatTransport } from "ai";

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
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [preview, setPreview] = useState<PersonaParseResult | null>(null);
    const [finalPersona, setFinalPersona] = useState<PersonaParseResult | null>(null);
    const [showSavePrompt, setShowSavePrompt] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
    const [completion, setCompletion] = useState("");
    const [livePersonaData, setLivePersonaData] = useState<LivePersonaData>({
        domainTags: [],
        contentPillars: [],
        hooks: [],
    });
    const lastPreviewRef = useRef<PersonaParseResult | null>(null);
    const isFirstLoad = useRef(true); // 标记是否首次加载

    const {
        messages,
        sendMessage,
        status,
        stop,
        error,
        setMessages, // 新增：用于手动设置初始消息
    } = useChat({
        transport: new DefaultChatTransport({
            api: '/api/chat',
        }),
        // 移除 initialMessages，改为 useEffect 初始化
    });

    // 初始化第一条AI消息（页面加载时）
    useEffect(() => {
        if (isFirstLoad.current) {
            isFirstLoad.current = false;
            // 设置初始消息，让AI助手主动发送第一条提问
            setMessages([
                {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    parts: [{ type: "text", text: QUESTIONS[0] }],
                },
            ]);
        }
    }, [setMessages]);

    // 修复：正确解析SSE流式响应
    useEffect(() => {
        if (!isGeneratingPersona) return;

        const fetchPersona = async () => {
            try {
                const response = await fetch("/api/personas/generate", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        messages: messages.map((msg) => ({
                            role: msg.role,
                            content: msg.parts
                                .filter(part => part.type === "text")
                                .map(part => part.text)
                                .join(""),
                        })),
                    }),
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
                    setShowSavePrompt(true);
                }
            } catch (err) {
                console.error("生成人设错误：", err);
                setCompletion("❌ 生成人设失败，请点击重新开始重试");
            } finally {
                setIsGeneratingPersona(false);
            }
        };

        fetchPersona();
    }, [isGeneratingPersona, messages]);

    // 从对话中实时提取 Persona 信息
    useEffect(() => {
        const extracted = extractPersonaFromMessages(messages);
        setLivePersonaData(extracted);
    }, [messages]);

    // 解析Markdown预览
    useEffect(() => {
        if (!completion) {
            setPreview(null);
            lastPreviewRef.current = null;
            return;
        }
        const parsed = parsePersonaMarkdown(completion);
        if (parsed) {
            lastPreviewRef.current = parsed;
            setPreview(parsed);
            // 如果解析成功，也更新实时面板
            setLivePersonaData({
                name: parsed.name,
                alias: parsed.alias,
                tagline: parsed.tagline,
                audience: parsed.audience,
                domainTags: parsed.domainTags,
                voice: parsed.voice,
                tone: parsed.tone,
                style: parsed.style,
                background: parsed.background,
                contentPillars: parsed.contentPillars,
                hooks: parsed.hooks,
                callToAction: parsed.callToAction,
            });
        }
    }, [completion]);

    // 提交回答/生成人设
    const handleSubmitAnswer = async (e: React.FormEvent) => {
        e.preventDefault();
        const userInputEl = e.target as HTMLFormElement;
        const inputEl = userInputEl.querySelector("textarea") as HTMLTextAreaElement;
        const trimmedInput = inputEl.value.trim();
        if (!trimmedInput) return;

        const userMessages = messages.filter(m => m.role === "user");
        const answeredCount = userMessages.length;

        inputEl.value = "";

        await sendMessage({ parts: [{ type: "text", text: trimmedInput }] });

        if (answeredCount + 1 >= QUESTIONS.length) {
            setIsGeneratingPersona(true);
        }

        setCurrentQuestionIndex((prev) => Math.min(prev + 1, QUESTIONS.length));
    };

    // 重置对话（更新重置逻辑，确保重新设置初始消息）
    const resetChat = async () => {
        setCurrentQuestionIndex(0);
        setCompletion("");
        setPreview(null);
        setFinalPersona(null);
        setShowSavePrompt(false);
        setShowEditForm(false);
        setSaveMessage(null);
        setIsGeneratingPersona(false);
        setLivePersonaData({
            domainTags: [],
            contentPillars: [],
            hooks: [],
        });

        // 重置时重新设置初始消息
        setMessages([
            {
                id: crypto.randomUUID(),
                role: "assistant",
                parts: [{ type: "text", text: QUESTIONS[0] }],
            },
        ]);
    };

    // 保存处理
    const handleSaveDecision = () => {
        if (!finalPersona) return;
        setShowSavePrompt(false);
        setShowEditForm(true);
    };

    const handleSaved = (message?: string) => {
        setSaveMessage(message ?? "人设已保存成功！");
        setShowEditForm(false);
        setShowSavePrompt(false);
    };

    return (
        <div className="w-full max-w-7xl mx-auto space-y-5">
            <Card>
                <CardHeader className="gap-2">
                    <div>
                        <CardTitle className="text-lg">AI 人设生成助手</CardTitle>
                        <CardDescription>跟我聊聊天，我会帮你打造专属KOS人设～</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">对话模式</Badge>
                        {status === "streaming" && (
                            <Badge variant="outline" className="flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                思考中...
                            </Badge>
                        )}
                        {isGeneratingPersona && (
                            <Badge variant="outline" className="flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                生成人设中...
                            </Badge>
                        )}
                    </div>
                </CardHeader>
            </Card>

            {/* 左右分栏布局 - 在同一个 Card 内 */}
            <Card className="h-[calc(100vh-280px)] min-h-[600px]">
                <CardContent className="h-full p-0">
                    <div className="flex h-full gap-4">
                        {/* 左侧：聊天区 - 占据更多空间 */}
                        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                            <PersonaChatArea
                                messages={messages}
                                status={status}
                                error={error}
                                completion={completion}
                                isGeneratingPersona={isGeneratingPersona}
                                handleSubmitAnswer={handleSubmitAnswer}
                                resetChat={resetChat}
                                stop={stop}
                            />
                        </div>

                        {/* 右侧：实时 Persona 面板 - 宽度较小 */}
                        <div className="w-80 flex-shrink-0 border-l pl-4 h-full overflow-hidden">
                            <PersonaLivePanel 
                                data={livePersonaData} 
                                isLoading={status === "streaming" || isGeneratingPersona}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 保存提示和表单 */}
            {saveMessage && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-800">
                    ✅ {saveMessage}
                </div>
            )}

            {showSavePrompt && finalPersona && (
                <Card>
                    <CardContent className="p-4">
                        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                            <p className="font-medium text-amber-800">🎉 人设生成完毕！</p>
                            <p className="mt-1 text-sm text-amber-700">
                                我已经帮你生成了专属KOS人设，是否保存到数据库？
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Button size="sm" onClick={handleSaveDecision} className="bg-amber-600 hover:bg-amber-700">
                                    <Save className="mr-1.5 h-4 w-4" />
                                    保存人设
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowSavePrompt(false)}
                                >
                                    稍后保存
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {showEditForm && finalPersona && (
                <Card>
                    <CardContent className="p-4">
                        <PersonaSaveForm
                            persona={finalPersona}
                            onSuccess={handleSaved}
                            onCancel={() => setShowEditForm(false)}
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// 人设保存表单（保持不变）
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
        <div className="space-y-3 rounded-xl border border-dashed bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
                <Pencil className="h-4 w-4" />
                完善人设信息并保存
            </div>
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

                <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1">
                    <Button type="submit" className="flex-1 sm:flex-none">
                        <Save className="mr-2 h-4 w-4" />
                        保存人设
                    </Button>
                    <Button type="button" variant="outline" onClick={onCancel}>
                        取消
                    </Button>
                </div>
            </form>
            {state.message && (
                <p className={cn("text-xs", state.ok ? "text-emerald-600" : "text-rose-500")}>
                    {state.message}
                </p>
            )}
        </div>
    );
}