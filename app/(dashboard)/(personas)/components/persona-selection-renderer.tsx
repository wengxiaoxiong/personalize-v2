import React from "react";
import { cn } from "@/lib/utils";
import { MessageResponse } from "@/components/ai-elements/message";
import type { AgentPartRenderer } from "@/modules/agent/types/agent";
import { SelectionQuestionCard } from "@/modules/agent/ui/selection-question-card";
import { extractSelectionQuestions } from "./persona-generator-helpers";

type PersonaSelectionRendererParams = {
  selectedOptions: string[];
  onSelect: (option: string) => void;
};

export function createPersonaSelectionRenderer({
  selectedOptions,
  onSelect,
}: PersonaSelectionRendererParams): AgentPartRenderer {
  // eslint-disable-next-line react/display-name
  const renderer: AgentPartRenderer = ({ part, message }) => {
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
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  };
  return renderer;
}
