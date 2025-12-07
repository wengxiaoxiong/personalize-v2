import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useCallback, useMemo, useEffect } from "react";
import type { UIMessage, UseChatHelpers } from "@ai-sdk/react";

type UseAgentChatOptions = {
  api?: string;
  model?: string;
  initialMessages?: UIMessage[];
};

export function useAgentChat(options: UseAgentChatOptions = {}) {
  const { api = "/api/chat", model, initialMessages = [] } = options;

  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api,
      }),
    [api]
  );

  const chat = useChat({
    transport: chatTransport,
  });

  useEffect(() => {
    if (initialMessages.length) {
      chat.setMessages(initialMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendText = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      await chat.sendMessage(
        { text },
        model
          ? {
              body: {
                model,
              },
            }
          : undefined
      );
    },
    [chat, model]
  );

  const reset = useCallback(() => {
    chat.setMessages(initialMessages);
  }, [chat, initialMessages]);

  return {
    ...chat,
    sendText,
    reset,
  } as UseChatHelpers<UIMessage> & { sendText: (text: string) => Promise<void>; reset: () => void };
}
