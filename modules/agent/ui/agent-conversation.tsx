import React from "react";
import { isToolUIPart, type ToolUIPart, type UIMessage } from "ai";
import type { UseChatHelpers } from "@ai-sdk/react";
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
import { Loader } from "@/components/ai-elements/loader";
import { cn } from "@/lib/utils";
import type { AgentPartRenderer, AgentPart } from "../types/agent";

import { User, Sparkles } from "lucide-react";

type ChatMessage = UseChatHelpers<UIMessage>["messages"][number];
type ChatStatus = UseChatHelpers<UIMessage>["status"];

function isAgentPart(part: ChatMessage["parts"][number]): part is AgentPart {
  return true; // UIMessagePart 在结构上兼容 AgentPart (UIMessagePart<unknown, unknown>)
}

type AgentConversationProps = {
  messages: ChatMessage[];
  status: ChatStatus;
  renderers?: AgentPartRenderer[];
  toolRenderer?: (part: ToolUIPart, message: ChatMessage, index: number) => React.ReactNode;
};

export function AgentConversation({ messages, status, renderers = [], toolRenderer }: AgentConversationProps) {
  const tryRenderers = (part: AgentPart, message: ChatMessage, index: number) => {
    for (const render of renderers) {
      const rendered = render({ part, message, index });
      if (rendered !== null && rendered !== undefined) return rendered;
    }
    return null;
  };

  return (
    <Conversation className="flex-1 min-h-0 bg-transparent p-0 border-none shadow-none">
      <ConversationContent className="pb-4">
        {messages.map((message, messageIndex) => {
          const isUser = message.role === "user";
          const isAssistant = message.role === "assistant";

          return (
            <div
              key={`${message.id ?? "msg"}-${messageIndex}`}
              className={cn(
                "group flex w-full gap-4 px-4 py-3",
                isUser ? "flex-row-reverse" : "flex-row",
                "focus-within:outline-none"
              )}
              tabIndex={-1}
            >
              {/* 头像 */}
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full transition-all duration-200",
                  isUser 
                    ? "bg-muted/80 border border-border/40" 
                    : "bg-gradient-to-br from-primary/90 to-primary text-primary-foreground"
                )}
              >
                {isUser ? (
                  <User className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </div>

              {/* 消息内容 */}
              <div
                className={cn(
                  "flex flex-col gap-1.5 flex-1 min-w-0",
                  isUser ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    "max-w-[85%] sm:max-w-[80%]",
                    isUser
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted/50 text-foreground rounded-tl-sm border border-border/40"
                  )}
                >
                  <div className="flex flex-col gap-2">
                    {message.parts?.map((part, idx) => {
                      if (!isAgentPart(part)) return null;

                      const custom = tryRenderers(part, message, idx);
                      if (custom) return <React.Fragment key={`${message.id}-part-${idx}`}>{custom}</React.Fragment>;

                      if (part.type === "text") {
                        if (!part.text) return null;
                        return (
                          <MessageResponse
                            key={`${message.id}-text-${idx}`}
                            className={cn(
                              "max-w-none whitespace-pre-wrap break-words prose-p:my-0 prose-pre:my-1 prose-headings:my-2 prose-headings:font-semibold",
                              isAssistant ? "prose prose-sm dark:prose-invert max-w-none" : "",
                              isUser ? "text-primary-foreground" : ""
                            )}
                          >
                            {part.text}
                          </MessageResponse>
                        );
                      }

                      if (isToolUIPart(part)) {
                        return (
                          <div key={`${message.id}-tool-${idx}`} className="w-full mt-1">
                            {toolRenderer?.(part, message, idx) ?? null}
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {status === "submitted" && (
          <div className="flex w-full gap-4 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/90 to-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="bg-muted/50 border border-border/40 rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader />
            </div>
          </div>
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
