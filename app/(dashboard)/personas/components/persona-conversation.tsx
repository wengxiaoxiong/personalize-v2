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
import { extractSelectionQuestions } from "./persona-generator-helpers";
import { SelectionQuestionCard } from "./selection-question-card";
import { ToolCallCard } from "./tool-call-card";

type ChatMessage = UseChatHelpers<UIMessage>["messages"][number];
type ChatStatus = UseChatHelpers<UIMessage>["status"];

type PersonaConversationProps = {
  messages: ChatMessage[];
  status: ChatStatus;
  selectedOptions: string[];
  onOptionToggle: (option: string) => void;
};

export function PersonaConversation({
  messages,
  status,
  selectedOptions,
  onOptionToggle,
}: PersonaConversationProps) {
  return (
    <Conversation className="flex-1 min-h-0 rounded-lg border bg-muted/30 p-3">
      <ConversationContent>
        {messages.map((message) => (
          <Message key={message.id} from={message.role}>
            <MessageContent
              className={cn(
                "max-w-full break-words rounded-xl border px-3 py-2 shadow-sm whitespace-pre-wrap space-y-3",
                message.role === "assistant" ? "bg-card text-foreground" : "bg-primary text-primary-foreground"
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
                          onSelect={onOptionToggle}
                        />
                      ))}
                    </div>
                  );
                }

                if (isToolUIPart(part as ToolUIPart)) {
                  return (
                    <ToolCallCard key={part.toolCallId || `${message.id}-tool-${idx}`} part={part as ToolUIPart} />
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
