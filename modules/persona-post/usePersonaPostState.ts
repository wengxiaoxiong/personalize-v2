/**
 * Persona Post Agent State Management
 *
 * 管理帖子生成Agent的所有状态
 */

import { useState } from "react";
import type { PersonaPostResult, KnowledgeBaseData } from "@/modules/agent/adapters/persona-post";

// ========== 状态值类型 ==========

export interface PersonaPostStateValues {
  /** 是否已开始生成 */
  started: boolean;
  /** 用户输入值 */
  inputValue: string;
  /** 选中的人设ID */
  selectedPersonaId: string | null;
  /** 选中的项目ID（用于读取知识库） */
  selectedProjectId: string | null;
  /** 知识库数据 */
  knowledgeBase: KnowledgeBaseData | null;
  /** 帖子草稿（流式生成时） */
  postDraft: string;
  /** 最终帖子结果 */
  finalPost: PersonaPostResult | null;
  /** 是否显示保存对话框 */
  showSaveDialog: boolean;
  /** 侧边预览面板是否打开 */
  sidecarOpen: boolean;
  /** 错误信息 */
  error: string | null;
  /** 生成的大字报URL */
  posterUrl: string | null;
  /** 是否正在生成大字报 */
  generatingPoster: boolean;
  /** 帖子标签 */
  tags: string[];
  /** 目标平台 */
  platform: "xiaohongshu" | "weibo" | "other";
}

// ========== 状态API类型 ==========

export interface PersonaPostStateApi {
  state: PersonaPostStateValues;

  // Setters
  setStarted: (started: boolean) => void;
  setInputValue: (value: string) => void;
  setSelectedPersonaId: (id: string | null) => void;
  setSelectedProjectId: (id: string | null) => void;
  setKnowledgeBase: (kb: KnowledgeBaseData | null) => void;
  setPostDraft: (draft: string) => void;
  setFinalPost: (post: PersonaPostResult | null) => void;
  setShowSaveDialog: (show: boolean) => void;
  setSidecarOpen: (open: boolean) => void;
  setError: (error: string | null) => void;
  setPosterUrl: (url: string | null) => void;
  setGeneratingPoster: (generating: boolean) => void;
  setTags: (tags: string[]) => void;
  setPlatform: (platform: "xiaohongshu" | "weibo" | "other") => void;

  // 辅助方法
  reset: () => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
}

// ========== 初始状态 ==========

const initialState: PersonaPostStateValues = {
  started: false,
  inputValue: "",
  selectedPersonaId: null,
  selectedProjectId: null,
  knowledgeBase: null,
  postDraft: "",
  finalPost: null,
  showSaveDialog: false,
  sidecarOpen: false,
  error: null,
  posterUrl: null,
  generatingPoster: false,
  tags: [],
  platform: "xiaohongshu",
};

// ========== Hook实现 ==========

export function usePersonaPostState(): PersonaPostStateApi {
  const [started, setStarted] = useState(initialState.started);
  const [inputValue, setInputValue] = useState(initialState.inputValue);
  const [selectedPersonaId, setSelectedPersonaId] = useState(initialState.selectedPersonaId);
  const [selectedProjectId, setSelectedProjectId] = useState(initialState.selectedProjectId);
  const [knowledgeBase, setKnowledgeBase] = useState(initialState.knowledgeBase);
  const [postDraft, setPostDraft] = useState(initialState.postDraft);
  const [finalPost, setFinalPost] = useState(initialState.finalPost);
  const [showSaveDialog, setShowSaveDialog] = useState(initialState.showSaveDialog);
  const [sidecarOpen, setSidecarOpen] = useState(initialState.sidecarOpen);
  const [error, setError] = useState(initialState.error);
  const [posterUrl, setPosterUrl] = useState(initialState.posterUrl);
  const [generatingPoster, setGeneratingPoster] = useState(initialState.generatingPoster);
  const [tags, setTags] = useState(initialState.tags);
  const [platform, setPlatform] = useState(initialState.platform);

  const reset = () => {
    setStarted(initialState.started);
    setInputValue(initialState.inputValue);
    setPostDraft(initialState.postDraft);
    setFinalPost(initialState.finalPost);
    setShowSaveDialog(initialState.showSaveDialog);
    setError(initialState.error);
    setPosterUrl(initialState.posterUrl);
    setGeneratingPoster(initialState.generatingPoster);
    setTags(initialState.tags);
    // 不重置 selectedPersonaId 和 selectedProjectId，保留用户选择
  };

  const addTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  return {
    state: {
      started,
      inputValue,
      selectedPersonaId,
      selectedProjectId,
      knowledgeBase,
      postDraft,
      finalPost,
      showSaveDialog,
      sidecarOpen,
      error,
      posterUrl,
      generatingPoster,
      tags,
      platform,
    },
    setStarted,
    setInputValue,
    setSelectedPersonaId,
    setSelectedProjectId,
    setKnowledgeBase,
    setPostDraft,
    setFinalPost,
    setShowSaveDialog,
    setSidecarOpen,
    setError,
    setPosterUrl,
    setGeneratingPoster,
    setTags,
    setPlatform,
    reset,
    addTag,
    removeTag,
  };
}
