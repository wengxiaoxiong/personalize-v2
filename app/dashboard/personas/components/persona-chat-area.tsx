"use client";

import { useRef, useEffect } from "react";
// 关键修改：导入 UIMessage 而非 Message
import type { UIMessage } from "@ai-sdk/react";
import { Loader2, StopCircle, Send, RefreshCw, User, Bot, CopyIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 关键修改：Props 中的 Message → UIMessage
export type PersonaChatAreaProps = {
    messages: UIMessage[];
    status: "idle" | "streaming" | "submitted" | "error";
    error: Error | null;
    completion: string;
    isGeneratingPersona: boolean;
    handleSubmitAnswer: (e: React.FormEvent) => Promise<void>;
    resetChat: () => Promise<void>;
    stop: () => void;
};

export function PersonaChatArea({
                                    messages,
                                    status,
                                    error,
                                    completion,
                                    isGeneratingPersona,
                                    handleSubmitAnswer,
                                    resetChat,
                                    stop,
                                }: PersonaChatAreaProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // 自动滚动到底部 - 只滚动容器本身，不影响外层页面
    useEffect(() => {
        if (messagesContainerRef.current) {
            const container = messagesContainerRef.current;
            // 直接滚动到容器底部，只影响容器本身
            container.scrollTo({
                top: container.scrollHeight,
                behavior: "smooth"
            });
        }
    }, [messages, completion, status]);

    const copyCompletion = () => {
        navigator.clipboard.writeText(completion);
        alert("Markdown内容已复制！");
    };

    const disableSubmit = status === "streaming" || isGeneratingPersona;

    return (
        <div className="flex flex-col h-full space-y-4 p-4 overflow-hidden">
            {/* 聊天消息展示区域 */}
            <div 
                ref={messagesContainerRef}
                className="flex-1 border rounded-xl p-4 overflow-y-auto bg-background/80 space-y-6 min-h-0"
            >
                {messages.map((msg, idx) => {
                    const msgText = msg.parts
                        .filter(part => part.type === "text")
                        .map(part => part.text)
                        .join("");

                    return (
                        <div
                            key={idx}
                            className={cn(
                                "flex",
                                msg.role === "user" ? "justify-end" : "justify-start"
                            )}
                        >
                            {/* 头像 */}
                            <div className="mr-3 ml-3 mt-1">
                                {msg.role === "user" ? (
                                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                                        <User className="h-4 w-4" />
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground">
                                        <Bot className="h-4 w-4" />
                                    </div>
                                )}
                            </div>

                            {/* 消息气泡 */}
                            <div className="flex-1 max-w-[80%]">
                                <div className="font-medium text-sm mb-1">
                                    {msg.role === "user" ? "你" : "AI助手"}
                                </div>
                                <div
                                    className={cn(
                                        "rounded-2xl p-4 text-sm",
                                        msg.role === "user"
                                            ? "bg-primary text-primary-foreground rounded-tr-none"
                                            : "bg-muted rounded-tl-none"
                                    )}
                                >
                                    <div className="whitespace-pre-wrap break-words">
                                        {msgText}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* 生成人设的Markdown展示区 */}
                {isGeneratingPersona && (
                    <div className="flex justify-start">
                        <div className="mr-3 mt-1">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground">
                                <Bot className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="flex-1 max-w-[80%]">
                            <div className="font-medium text-sm mb-1">AI助手</div>
                            <div className="rounded-2xl p-4 text-sm bg-muted/80 rounded-tl-none font-mono">
                                <div className="whitespace-pre-wrap break-words">
                                    {completion || "正在生成人设Markdown..."}
                                </div>
                                {completion && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="mt-2 h-7 px-2 text-xs"
                                        onClick={copyCompletion}
                                    >
                                        <CopyIcon className="h-3 w-3 mr-1" /> 复制Markdown
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 加载中占位 */}
                {status === "streaming" && !isGeneratingPersona && (
                    <div className="flex justify-start">
                        <div className="mr-3 mt-1">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground">
                                <Bot className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="flex-1 max-w-[80%]">
                            <div className="font-medium text-sm mb-1">AI助手</div>
                            <div className="rounded-2xl p-4 text-sm bg-muted rounded-tl-none">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 rounded-full bg-foreground/70 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                                    <div className="w-2 h-2 rounded-full bg-foreground/70 animate-bounce" style={{ animationDelay: "150ms" }}></div>
                                    <div className="w-2 h-2 rounded-full bg-foreground/70 animate-bounce" style={{ animationDelay: "300ms" }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 */}
            <form onSubmit={handleSubmitAnswer} className="space-y-2 flex-shrink-0">
                <Textarea
                    placeholder={!isGeneratingPersona
                        ? "在这里输入你的回答..."
                        : "人设生成中，请勿输入..."}
                    className="min-h-[80px] resize-y"
                    disabled={status === "streaming" || isGeneratingPersona}
                />
                <div className="flex gap-2 justify-between">
                    <Button type="button" variant="outline" onClick={resetChat} disabled={status === "streaming" || isGeneratingPersona}>
                        <RefreshCw className="mr-1 h-4 w-4" /> 重新开始
                    </Button>
                    <div className="flex gap-2">
                        {isGeneratingPersona && (
                            <Button type="button" variant="outline" onClick={() => stop()}>
                                <StopCircle className="mr-1 h-4 w-4" /> 停止生成
                            </Button>
                        )}
                        <Button type="submit" disabled={disableSubmit} className="flex items-center gap-1">
                            {status === "streaming" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                            {!isGeneratingPersona ? "发送" : "生成中..."}
                        </Button>
                    </div>
                </div>
            </form>

            {/* 错误提示 */}
            {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-xs text-rose-800">
                    ❌ 发生错误：{error.message}，请点击重新开始重试
                </div>
            )}
        </div>
    );
}