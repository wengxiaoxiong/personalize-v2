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
  const renderer: AgentPartRenderer = ({ part, message, index }) => {
    if (part.type !== "text" || !part.text) return null;
    
    // 确保文本是字符串类型
    const text = String(part.text);
    if (!text.trim()) return null;
    
    try {
      const { cleanText, questions } = extractSelectionQuestions(text);
      
      // 如果没有解析到问题，返回 null（让默认渲染器处理）
      // 注意：在流式传输时，如果选项标签还没完整，questions 可能为空
      // 这种情况下返回 null，让默认渲染器显示原始文本
      if (!questions.length) return null;

      // 确保每个问题都有有效的标题和选项
      const validQuestions = questions.filter(
        (q) => q.title && q.title.trim() && q.options && q.options.length > 0
      );

      if (validQuestions.length === 0) return null;

      return (
        <div className="space-y-3" key={`selection-${message.id}-${index}`}>
          {cleanText && cleanText.trim() && (
            <MessageResponse
              className={cn(
                "max-w-none whitespace-pre-wrap break-words",
                message.role === "assistant" ? "prose prose-sm" : "text-sm leading-relaxed text-primary-foreground"
              )}
            >
              {cleanText}
            </MessageResponse>
          )}
          {validQuestions.map((question, questionIdx) => (
            <SelectionQuestionCard
              key={`${message.id}-question-${questionIdx}-${index}`}
              question={question}
              selectedOptions={selectedOptions}
              onSelect={onSelect}
            />
          ))}
        </div>
      );
    } catch (error) {
      // 解析失败时，返回 null 让默认渲染器处理
      console.warn("Failed to extract selection questions:", error, { text: text.substring(0, 100) });
      return null;
    }
  };
  return renderer;
}
