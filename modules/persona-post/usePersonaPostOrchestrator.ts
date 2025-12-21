/**
 * Persona Post Agent Orchestrator
 *
 * 编排帖子生成Agent的核心业务逻辑
 */

import { useCallback } from "react";
import type { PromptInputMessage } from "@/modules/agent/ui/agent-prompt-input";
import { useAgentChat } from "@/modules/agent/hooks/use-agent-chat";
import { useToolSignal } from "@/modules/agent/hooks/use-tool-signal";
import type { PersonaPostStateApi } from "./usePersonaPostState";
import {
  PERSONA_POST_SAVE_TOOL,
  PERSONA_POST_READ_KB_TOOL,
  PERSONA_POST_GENERATE_POSTER_TOOL,
  PERSONA_POST_GENERATE_KEYWORDS,
  buildPersonaPostPayload,
  parsePersonaPostResult,
} from "@/modules/agent/adapters/persona-post";

// ========== 类型定义 ==========

export interface UsePersonaPostOrchestratorOptions {
  personaPostState: PersonaPostStateApi;
}

export interface PersonaPostOrchestratorResult {
  // 聊天相关
  chat: ReturnType<typeof useAgentChat>;

  // UI状态
  ui: {
    sidecarOpen: boolean;
    showSaveDialog: boolean;
    error: string | null;
  };

  // 动作
  actions: {
    handleSubmit: (message: PromptInputMessage) => Promise<void>;
    handleSavePost: () => Promise<void>;
    handleGeneratePoster: () => Promise<void>;
    toggleSidecar: () => void;
    closeSaveDialog: () => void;
  };
}

// ========== Hook实现 ==========

export function usePersonaPostOrchestrator({
  personaPostState,
}: UsePersonaPostOrchestratorOptions): PersonaPostOrchestratorResult {
  const {
    state,
    setStarted,
    setPostDraft,
    setFinalPost,
    setShowSaveDialog,
    setSidecarOpen,
    setError,
    setPosterUrl,
    setGeneratingPoster,
    setKnowledgeBase,
  } = personaPostState;

  // 1. 初始化聊天
  const chat = useAgentChat({
    api: "/api/persona-post-agent",
    model: "deepseek/deepseek-chat",
  });

  // 2. 监听保存帖子工具调用
  useToolSignal({
    messages: chat.messages,
    toolName: PERSONA_POST_SAVE_TOOL,
    onMatch: async (part) => {
      try {
        // 提取工具调用的参数
        const args = part.args as any;
        const postData = parsePersonaPostResult(
          args.content || JSON.stringify(args)
        );

        if (postData) {
          setFinalPost(postData);
          setShowSaveDialog(true);
          setSidecarOpen(true);
        }
      } catch (error) {
        console.error("Failed to handle save post tool", error);
        setError("保存帖子时出错");
      }
    },
  });

  // 3. 监听读取知识库工具调用
  useToolSignal({
    messages: chat.messages,
    toolName: PERSONA_POST_READ_KB_TOOL,
    onMatch: async (part) => {
      try {
        // 提取工具调用的结果
        const result = part.result as any;
        if (result && result.knowledgeBase) {
          setKnowledgeBase(result.knowledgeBase);
        }
      } catch (error) {
        console.error("Failed to handle read knowledge base tool", error);
      }
    },
  });

  // 4. 监听生成大字报工具调用
  useToolSignal({
    messages: chat.messages,
    toolName: PERSONA_POST_GENERATE_POSTER_TOOL,
    onMatch: async (part) => {
      try {
        const result = part.result as any;
        if (result && result.posterUrl) {
          setPosterUrl(result.posterUrl);
        }
      } catch (error) {
        console.error("Failed to handle generate poster tool", error);
      }
    },
  });

  // 5. 处理用户提交
  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      try {
        setError(null);
        setStarted(true);

        // 检测是否需要生成帖子
        const shouldGenerate = PERSONA_POST_GENERATE_KEYWORDS.some((kw) =>
          message.text.toLowerCase().includes(kw.toLowerCase())
        );

        // 发送消息到聊天
        await chat.sendMessage({
          text: message.text,
          files: message.files,
        });

        // 如果需要生成，打开侧边预览面板
        if (shouldGenerate) {
          setSidecarOpen(true);
        }
      } catch (error) {
        console.error("Failed to submit message", error);
        setError(error instanceof Error ? error.message : "发送消息失败");
      }
    },
    [chat, setError, setStarted, setSidecarOpen]
  );

  // 6. 保存帖子到数据库
  const handleSavePost = useCallback(async () => {
    try {
      if (!state.finalPost) {
        setError("没有可保存的帖子");
        return;
      }

      if (!state.selectedPersonaId) {
        setError("请先选择一个人设");
        return;
      }

      // 调用保存API
      const response = await fetch("/api/persona-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: state.selectedPersonaId,
          title: state.finalPost.title,
          content: state.finalPost.content,
          metadata: {
            ...state.finalPost.metadata,
            posterUrl: state.posterUrl,
            tags: state.tags,
            platform: state.platform,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("保存失败");
      }

      // 成功后关闭对话框
      setShowSaveDialog(false);
      setError(null);

      // 可选：显示成功提示
      // toast.success("帖子保存成功");
    } catch (error) {
      console.error("Failed to save post", error);
      setError(error instanceof Error ? error.message : "保存帖子失败");
    }
  }, [
    state.finalPost,
    state.selectedPersonaId,
    state.posterUrl,
    state.tags,
    state.platform,
    setError,
    setShowSaveDialog,
  ]);

  // 7. 生成大字报
  const handleGeneratePoster = useCallback(async () => {
    try {
      if (!state.finalPost) {
        setError("请先生成帖子内容");
        return;
      }

      setGeneratingPoster(true);
      setError(null);

      // 调用生成大字报API
      const response = await fetch("/api/generate-poster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: state.finalPost.title,
          content: state.finalPost.content,
        }),
      });

      if (!response.ok) {
        throw new Error("生成大字报失败");
      }

      const data = await response.json();
      setPosterUrl(data.posterUrl);
    } catch (error) {
      console.error("Failed to generate poster", error);
      setError(error instanceof Error ? error.message : "生成大字报失败");
    } finally {
      setGeneratingPoster(false);
    }
  }, [state.finalPost, setError, setPosterUrl, setGeneratingPoster]);

  // 8. 切换侧边面板
  const toggleSidecar = useCallback(() => {
    setSidecarOpen(!state.sidecarOpen);
  }, [state.sidecarOpen, setSidecarOpen]);

  // 9. 关闭保存对话框
  const closeSaveDialog = useCallback(() => {
    setShowSaveDialog(false);
  }, [setShowSaveDialog]);

  return {
    chat,
    ui: {
      sidecarOpen: state.sidecarOpen,
      showSaveDialog: state.showSaveDialog,
      error: state.error,
    },
    actions: {
      handleSubmit,
      handleSavePost,
      handleGeneratePoster,
      toggleSidecar,
      closeSaveDialog,
    },
  };
}
