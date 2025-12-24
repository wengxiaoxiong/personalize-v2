/**
 * Persona Post Agent Orchestrator
 *
 * 编排帖子生成Agent的核心业务逻辑
 */

import { useCallback } from "react";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
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

// 从完整 URL 中提取对象存储路径（去掉协议和域名）
function extractPosterPath(url?: string | null): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\/+/, "");
  } catch {
    return url.replace(/^https?:\/\/[^/]+\//, "");
  }
}

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
    handleSavePost: (payload?: { title: string; content: string }) => Promise<void>;
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
        const toolPart = part as any;
        const { state, args, result, input, output } = toolPart;

        // 调试日志：观察工具调用的完整结构（包含 state / input / output）
        console.log("[PersonaPost] savePersonaPost tool part:", {
          state,
          args,
          result,
          input,
          output,
          toolPart,
        });

        // 流式工具通常：先 input-streaming，再 output/complete
        // 我们只在有 output（工具真正返回结果）时处理
        const raw = output ?? result ?? args;
        if (!raw) {
          console.log("[PersonaPost] no output/result/args yet, skip this part");
          return;
        }

        // 柔性兼容：有些实现直接把数据放在顶层，有些放在 raw.data
        const container = (raw as any);
        const data = (container.data ?? container) as any;

        console.log("[PersonaPost] resolved savePersonaPost data:", data);

        // 需要至少有 content 才有意义
        if (!data || (!data.content && !data.title)) {
          console.log(
            "[PersonaPost] data missing title/content, skip showing save dialog"
          );
          return;
        }

        // 若 data 自身就长得像 { title, content, tags, platform }
        const finalTitle = data.title ?? "未命名帖子";
        const finalContent = data.content;

        if (!finalContent) {
          console.log("[PersonaPost] finalContent is empty, skip");
          return;
        }

        setFinalPost({
          title: finalTitle,
          content: finalContent,
          tags: data.tags,
          platform: data.platform,
          metadata: {
            tags: data.tags,
            platform: data.platform,
          },
        });

        console.log("[PersonaPost] finalPost set, opening save dialog and sidecar");
        setShowSaveDialog(true);
        setSidecarOpen(true);
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
        const toolPart = part as any;
        const { state, input, output } = toolPart;

        console.log("[PersonaPost] readKnowledgeBase tool part:", {
          state,
          input,
          output,
          toolPart,
        });

        const raw = output ?? input;
        if (!raw) return;

        const data = (raw.data ?? raw) as any;
        if (data && data.knowledgeBase) {
          setKnowledgeBase(data.knowledgeBase);
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
        const toolPart = part as any;
        const { state, input, output } = toolPart;

        console.log("[PersonaPost] generatePoster tool part:", {
          state,
          input,
          output,
          toolPart,
        });

        const raw = output ?? input;
        if (!raw) return;

        const data = (raw.data ?? raw) as any;
        if (data && data.posterUrl) {
          setPosterUrl(data.posterUrl);
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
        await chat.sendMessage(
          {
            text: message.text,
            files: message.files,
          },
          {
            body: {
              // 将所选人设与项目知识库传给后端，便于读取知识库
              personaId: state.selectedPersonaId,
              projectId: state.selectedProjectId,
            },
          }
        );

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

  // 6. 保存/更新帖子到数据库
  const handleSavePost = useCallback(
    async (payload?: { title: string; content: string }) => {
    try {
      if (!state.finalPost) {
        setError("没有可保存的帖子");
        return;
      }

      const isUpdate = Boolean(state.finalPost.id);

      // 新建帖子时必须选择人设；编辑已有帖子则不强制
      if (!isUpdate && !state.selectedPersonaId) {
        setError("请先选择一个人设");
        return;
      }

      const method = isUpdate ? "PATCH" : "POST";

      const nextTitle = payload?.title ?? state.finalPost.title;
      const nextContent = payload?.content ?? state.finalPost.content;

      // 计算要写入 metadata 的海报路径（尽量从当前 posterUrl 提取，兼容旧数据）
      const existingMetadata = (state.finalPost.metadata || {}) as Record<string, unknown>;
      const posterPathFromUrl =
        extractPosterPath(state.posterUrl || (existingMetadata.posterUrl as string | undefined)) ||
        (existingMetadata.posterPath as string | undefined);

      const body = isUpdate
        ? {
            postId: state.finalPost.id,
            title: nextTitle,
            content: nextContent,
            status: state.finalPost.status,
            metadata: {
              ...state.finalPost.metadata,
              // 同时保存 posterUrl（方便前端直接用）和 posterPath（用于长期存储）
              posterUrl: state.posterUrl ?? (existingMetadata.posterUrl as string | undefined),
              posterPath: posterPathFromUrl,
              tags: state.tags,
              platform: state.platform,
            },
          }
        : {
            personaId: state.selectedPersonaId,
            title: nextTitle,
            content: nextContent,
            status: state.finalPost.status,
            metadata: {
              ...state.finalPost.metadata,
              posterUrl: state.posterUrl ?? (existingMetadata.posterUrl as string | undefined),
              posterPath: posterPathFromUrl,
              tags: state.tags,
              platform: state.platform,
            },
          };

      // 调用保存/更新 API
      const response = await fetch("/api/persona-posts", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(isUpdate ? "更新失败" : "保存失败");
      }

      const data = await response.json();
      const savedPost = data.post;

      if (savedPost) {
        // 将数据库ID等信息写回预览用的 finalPost
        setFinalPost({
          ...state.finalPost,
          title: nextTitle,
          content: nextContent,
          id: savedPost.id,
          status: savedPost.status,
          metadata: {
            ...(state.finalPost.metadata || {}),
            ...(savedPost.metadata || {}),
            posterUrl: state.posterUrl,
            tags: state.tags,
            platform: state.platform,
          },
        });
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
