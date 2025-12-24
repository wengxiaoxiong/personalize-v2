import React from "react";
import type { UIMessage } from "ai";
import type { UseChatHelpers } from "@ai-sdk/react";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputTextarea,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";

type AgentPromptInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (message: PromptInputMessage) => void | Promise<void>;
  status: UseChatHelpers<UIMessage>["status"];
  placeholder?: string;
  disabled?: boolean;
  submitDisabled?: boolean;
  textareaClassName?: string;
  className?: string;
  footerContent?: React.ReactNode;
};

export function AgentPromptInput({
  value,
  onChange,
  onSubmit,
  status,
  placeholder,
  disabled,
  submitDisabled,
  textareaClassName,
  className,
  footerContent,
}: AgentPromptInputProps) {
  return (
    <PromptInput onSubmit={onSubmit} className={cn("rounded-lg border bg-card/80", className)}>
      <PromptInputBody>
        <PromptInputTextarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn("min-h-[110px]", textareaClassName)}
          placeholder={placeholder}
          disabled={disabled}
        />
      </PromptInputBody>
      <PromptInputFooter>
        {footerContent}
        <PromptInputSubmit status={status} disabled={disabled || submitDisabled} />
      </PromptInputFooter>
    </PromptInput>
  );
}
