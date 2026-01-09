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
      <ConversationContent className="space-y-6 pb-4">
        {messages.map((message, messageIndex) => {
          const isUser = message.role === "user";
          const isAssistant = message.role === "assistant";

          return (
            <div
              key={`${message.id ?? "msg"}-${messageIndex}`}
              className={cn(
                "flex w-full gap-3",
                isUser ? "flex-row-reverse" : "flex-row"
              )}
            >
              {/* 头像 */}
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border shadow-sm",
                  isUser ? "bg-background" : "bg-primary text-primary-foreground"
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
                  "flex flex-col gap-1 max-w-[90%]",
                  isUser ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 shadow-sm text-sm leading-relaxed",
                    isUser
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted/50 text-foreground rounded-tl-none border"
                  )}
                >
                  <div className="flex flex-col gap-1.5">
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
                              "max-w-none whitespace-pre-wrap wrap-break-word prose-p:my-0 prose-pre:my-1",
                              isAssistant ? "prose prose-sm dark:prose-invert" : ""
                            )}
                          >
                            {part.text}
                          </MessageResponse>
                        );
                      }

                      if (isToolUIPart(part)) {
                        return (
                          <div key={`${message.id}-tool-${idx}`} className="w-full">
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
          <div className="flex w-full gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="bg-muted/50 border rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
              <Loader />
            </div>
          </div>
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
