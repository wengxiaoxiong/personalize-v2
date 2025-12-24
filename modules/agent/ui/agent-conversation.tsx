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
    <Conversation className="flex-1 min-h-0 rounded-lg border bg-muted/30 p-3">
      <ConversationContent>
        {messages.map((message, messageIndex) => (
          <Message key={`${message.id ?? "msg"}-${messageIndex}`} from={message.role}>
            <MessageContent
              className={cn(
                "max-w-full wrap-break-word rounded-xl border px-3 py-2 shadow-sm whitespace-pre-wrap space-y-3",
                message.role === "assistant" ? "bg-card text-foreground" : "bg-primary text-primary-foreground"
              )}
            >
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
                        "max-w-none whitespace-pre-wrap wrap-break-word",
                        message.role === "assistant"
                          ? "prose prose-sm"
                          : "text-sm leading-relaxed text-primary-foreground"
                      )}
                    >
                      {part.text}
                    </MessageResponse>
                  );
                }

                if (isToolUIPart(part)) {
                  return (
                    <React.Fragment key={`${message.id}-tool-${idx}`}>
                      {toolRenderer?.(part, message, idx) ?? null}
                    </React.Fragment>
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
  );
}
