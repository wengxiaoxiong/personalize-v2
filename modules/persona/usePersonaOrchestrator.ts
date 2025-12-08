import { useCallback, useEffect, useMemo, useRef } from "react";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { useCompletion } from "@ai-sdk/react";
import {
  PERSONA_GENERATE_KEYWORDS,
  PERSONA_PDF_MARKER,
  PERSONA_XHS_MARKER,
  PERSONA_TOOL_NAME,
  buildPersonaPayload,
  parsePersonaResult,
} from "@/modules/agent/adapters/persona";
import { useAgentChat } from "@/modules/agent/hooks/use-agent-chat";
import { useFileIngestion } from "@/modules/agent/hooks/use-file-ingestion";
import { useToolSignal } from "@/modules/agent/hooks/use-tool-signal";
import { parsePdfToText } from "@/lib/resume-parser";
import { parsePersonaMarkdown } from "@/lib/persona-parser";
import { parseXiaohongshuJson, parseXiaohongshuData } from "@/lib/xiaohongshu-parser";
import { saveXiaohongshuPostAction } from "@/app/actions";
import { QUESTIONS, buildFallbackPersona } from "@/app/(dashboard)/personas/components/persona-generator-helpers";
import type { PersonaStateApi } from "./usePersonaState";

type UsePersonaOrchestratorOptions = {
  personaState: PersonaStateApi;
};

export function usePersonaOrchestrator({ personaState }: UsePersonaOrchestratorOptions) {
  const {
    state,
    setStarted,
    setInputValue,
    setSelectedOptions,
    setPdfFile,
    setPersonaDraft,
    setFinalPersona,
    setShowSaveDialog,
    setSidecarOpen,
    setErrors,
    setXhsAvatar,
    reset: resetPersonaState,
  } = personaState;

  const personaGenerationTriggered = useRef(false);
  const isFirstLoad = useRef(true);

  const { messages, sendMessage, status, error: chatError, setMessages, reset: resetChatState } = useAgentChat({
    api: "/api/chat",
    model: "deepseek/deepseek-chat",
  });

  const {
    completion: personaCompletion,
    complete: startPersona,
    stop: stopPersona,
    isLoading: personaLoading,
    error: personaError,
    setCompletion: setPersonaResult,
  } = useCompletion({
    api: "/api/personas/generate",
    streamProtocol: "text",
    experimental_throttle: 50,
    onError: (err) => {
      console.error("生成人设错误：", err);
      personaGenerationTriggered.current = false;
    },
    onFinish: (_prompt, text) => {
      const persona = parsePersonaResult(text ?? "");
      setFinalPersona(persona);
    },
  });

  useEffect(() => {
    setPersonaDraft(personaCompletion ?? "");
  }, [personaCompletion, setPersonaDraft]);

  useEffect(() => {
    if (personaError) {
      personaGenerationTriggered.current = false;
    }
  }, [personaError]);

  const handlePersonaGeneration = useCallback(async () => {
    if (personaGenerationTriggered.current) return;
    personaGenerationTriggered.current = true;
    setPersonaResult("");
    setPersonaDraft("");
    setFinalPersona(null);
    setSidecarOpen(true);

    try {
      await startPersona("", {
        body: buildPersonaPayload(messages),
      });
    } catch (err) {
      console.error("生成人设错误：", err);
      personaGenerationTriggered.current = false;
    }
  }, [messages, setFinalPersona, setPersonaDraft, setPersonaResult, setSidecarOpen, startPersona]);

  const handleOptionToggle = useCallback(
    (option: string) => {
      setSelectedOptions((prev) => {
        const alreadySelected = prev.includes(option);

        setInputValue((current) => {
          const lines = current
            .split(/\n/)
            .map((line) => line.trim())
            .filter(Boolean);

          if (alreadySelected) {
            const remaining = lines.filter((line) => line !== option);
            return remaining.join("\n");
          }

          if (lines.includes(option)) {
            return current;
          }

          return [...lines, option].join("\n");
        });

        return alreadySelected ? prev.filter((item) => item !== option) : [...prev, option];
      });
    },
    [setInputValue, setSelectedOptions]
  );

  const handleClearSelections = useCallback(() => {
    setSelectedOptions([]);
    setInputValue((current) => {
      if (!state.selectedOptions.length) return current;
      const lines = current
        .split(/\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !state.selectedOptions.includes(line));

      return lines.join("\n");
    });
  }, [setInputValue, setSelectedOptions, state.selectedOptions]);

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const currentInput = message.text || state.inputValue;
      const trimmedInput = currentInput.trim();
      if (!trimmedInput) return;
      setErrors(null);

      if (!state.started) {
        setStarted(true);
      }

      const shouldGenerate = PERSONA_GENERATE_KEYWORDS.some((keyword) =>
        trimmedInput.toLowerCase().includes(keyword.toLowerCase())
      );

      const sendTask = sendMessage(
        {
          text: trimmedInput,
          files: message.files,
        },
        {
          body: {
            model: "deepseek/deepseek-chat",
          },
        }
      );

      if (shouldGenerate && !personaGenerationTriggered.current) {
        handlePersonaGeneration();
      }

      await sendTask;
      setSelectedOptions([]);
      setInputValue("");
    },
    [handlePersonaGeneration, sendMessage, setInputValue, setSelectedOptions, setStarted, state.inputValue, state.started]
  );

  const { ingest, uploading: pdfUploading, progress: pdfProgress } = useFileIngestion({
    parser: parsePdfToText,
    acceptTypes: ["application/pdf"],
    maxSizeMb: 10,
    onError: (err) => {
      console.error(err);
      setErrors(err.message);
    },
  });

  const handlePdfUpload = useCallback(
    async (file: File) => {
      if (!state.started) {
        setStarted(true);
      }
      setErrors(null);

      try {
        const extractedText = await ingest(file);

        if (!extractedText || extractedText.trim().length === 0) {
          throw new Error("PDF 文字提取失败，未能提取到任何文字内容。请检查 PDF 文件是否清晰。");
        }

        const pdfMessageText = `${PERSONA_PDF_MARKER}\n\n${extractedText.substring(0, 2000)}${
          extractedText.length > 2000 ? "..." : ""
        }`;

        await sendMessage({
          parts: [{ type: "text", text: pdfMessageText }],
        });
      } catch (err) {
        console.error("PDF 处理错误：", err);
        const errorMessage = err instanceof Error ? err.message : "PDF 处理失败，请重试";
        setErrors(errorMessage);
      } finally {
        setPdfFile(null);
      }
    },
    [ingest, sendMessage, setErrors, setPdfFile, setStarted, state.started]
  );

  const handleFileSelect = useCallback(
    async (file?: File | null) => {
      if (!file) return;

      if (file.type !== "application/pdf") {
        setErrors("请上传 PDF 文件");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setErrors("文件大小不能超过 10MB");
        return;
      }

      setPdfFile(file);
      await handlePdfUpload(file);
    },
    [handlePdfUpload, setErrors, setPdfFile]
  );

  const handleXhsJsonImport = useCallback(
    async (jsonString: string) => {
      if (!state.started) {
        setStarted(true);
      }
      setErrors(null);

      try {
        // 解析JSON
        const xhsData = parseXiaohongshuJson(jsonString);
        if (!xhsData) {
          throw new Error("小红书JSON格式不正确，请检查数据格式");
        }

        // 提取avatar并保存到state
        if (xhsData.userInfo?.avatar) {
          setXhsAvatar(xhsData.userInfo.avatar);
        }

        // 保存原始JSON数据到数据库（异步，不阻塞主流程）
        console.log("准备保存小红书数据到数据库，数据预览:", {
          hasUserInfo: !!xhsData.userInfo,
          nickname: xhsData.userInfo?.nickname,
          redId: xhsData.userInfo?.redId,
          feedCount: xhsData.feeds?.length || xhsData.count,
        });
        
        try {
          const saveResult = await saveXiaohongshuPostAction(xhsData);
          if (!saveResult.ok) {
            console.warn("保存小红书数据到数据库失败:", saveResult.message);
          } else {
            console.log("✅ 小红书数据已成功保存到数据库");
          }
        } catch (err) {
          console.error("保存小红书数据到数据库异常:", err);
          if (err instanceof Error) {
            console.error("异常详情:", err.message, err.stack);
          }
          // 不抛出错误，因为保存失败不应该影响导入流程
        }

        // 转换为结构化文本（自然语言格式）
        const structuredText = parseXiaohongshuData(xhsData);
        if (!structuredText || structuredText.trim().length === 0) {
          throw new Error("未能从小红书数据中提取到有效信息");
        }

        // 发送消息（使用标记，类似PDF处理）
        const xhsMessageText = `${PERSONA_XHS_MARKER}\n\n${structuredText}`;

        await sendMessage({
          parts: [{ type: "text", text: xhsMessageText }],
        });
      } catch (err) {
        console.error("小红书导入错误：", err);
        const errorMessage = err instanceof Error ? err.message : "小红书数据导入失败，请重试";
        setErrors(errorMessage);
        throw err; // 重新抛出错误，让调用方知道导入失败
      }
    },
    [sendMessage, setErrors, setStarted, setXhsAvatar, state.started]
  );

  const resetWorkflow = useCallback(() => {
    setPersonaResult("");
    stopPersona();
    personaGenerationTriggered.current = false;
    isFirstLoad.current = true;
    resetPersonaState();
    resetChatState();
  }, [resetChatState, resetPersonaState, setPersonaResult, stopPersona]);

  const openSaveDialog = useCallback(() => {
    const parsedPersona =
      parsePersonaMarkdown(state.personaDraft) ??
      state.finalPersona ??
      (state.personaDraft ? buildFallbackPersona(state.personaDraft) : null);

    if (!parsedPersona) return;
    setFinalPersona(parsedPersona);
    setShowSaveDialog(true);
  }, [setFinalPersona, setShowSaveDialog, state.finalPersona, state.personaDraft]);

  const disableSubmit = status === "streaming" || personaLoading || pdfUploading;

  const parsedPersona = useMemo(() => parsePersonaMarkdown(state.personaDraft), [state.personaDraft]);

  useEffect(() => {
    if (state.started && isFirstLoad.current) {
      isFirstLoad.current = false;
      setMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          parts: [{ type: "text", text: QUESTIONS[0] }],
        },
      ]);
    }
  }, [setMessages, state.started]);

  useToolSignal({
    messages,
    toolName: PERSONA_TOOL_NAME,
    onMatch: () => handlePersonaGeneration(),
  });

  return {
    chat: {
      messages,
      status,
      error: chatError,
    },
    persona: {
      draft: state.personaDraft,
      parsedPersona,
      finalPersona: state.finalPersona,
      loading: personaLoading,
      error: personaError,
    },
    pdf: {
      uploading: pdfUploading,
      progress: pdfProgress,
    },
    ui: {
      disableSubmit,
    },
    errors: state.errors,
    actions: {
      setInputValue,
      handleSubmit,
      handleOptionToggle,
      handleClearSelections,
      handleFileSelect,
      handleXhsJsonImport,
      handlePersonaGeneration,
      openSaveDialog,
      resetWorkflow,
      stopPersona,
      setShowSaveDialog,
      setErrors,
    },
  };
}
