"use client";

/**
 * Persona Post Generator Component
 *
 * 主要的帖子生成界面组件
 */

import React, { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentConversation } from "@/modules/agent/ui/agent-conversation";
import { AgentPromptInput } from "@/modules/agent/ui/agent-prompt-input";
import { ToolCallCard } from "@/modules/agent/ui/tool-call-card";
import { usePaneState } from "@/modules/agent/hooks/use-pane-state";
import { usePersonaPostState } from "@/modules/persona-post/usePersonaPostState";
import { usePersonaPostOrchestrator } from "@/modules/persona-post/usePersonaPostOrchestrator";
import { PersonaPostPreview } from "./persona-post-preview";
import { PersonaPostSaveDialog } from "./persona-post-save-dialog";
import { PersonaPostSelectors } from "./persona-post-selectors";
import { Sparkles } from "lucide-react";
import type { AgentMessage, AgentPart } from "@/modules/agent/types/agent";
import type { ToolUIPart } from "ai";
import type { PersonaPostMetadata } from "@/modules/agent/adapters/persona-post";
import {
  createPersonaPostAction,
  deletePersonaPostAction,
  getPersonaPostsAction,
} from "@/app/actions/persona-post";

const isToolCall = (part: ToolUIPart): part is ToolUIPart & { type: `tool-${string}` } =>
  typeof part.type === "string" && part.type.startsWith("tool-");

interface PersonaPostRecord {
  id: string;
  title: string;
  content: string;
  status: "draft" | "published" | "archived";
  personaId?: string | null;
  persona?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  metadata?: PersonaPostMetadata | null;
}

// 注意：现在不再手动拼接 URL，而是通过 usePosterUrl hook 调用 API 获取预签名 URL
// 这个函数保留是为了兼容性，但实际应该使用 hook
function buildPosterUrlFromMetadata(
  metadata: PersonaPostRecord["metadata"]
): string | null {
  // 返回 null，让组件使用 usePosterUrl hook 来获取预签名 URL
  // 如果 metadata 里有旧的 posterUrl（刚生成时），可以临时使用，但最终应该用 path 获取预签名 URL
  if (!metadata) return null;

  const directUrl = (metadata.posterUrl as string | null) ?? null;
  // 只返回临时 posterUrl（刚生成时），其他情况返回 null，让 hook 处理
  return directUrl;
}

export function PersonaPostGenerator() {
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [historyPosts, setHistoryPosts] = useState<PersonaPostRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PersonaPostRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const personaPostState = usePersonaPostState();
  const pane = usePaneState(false);
  const orchestrator = usePersonaPostOrchestrator({ personaPostState });

  const {
    state,
    setInputValue,
    setShowSaveDialog,
  } = personaPostState;

  const {
    chat,
    ui,
    actions: {
      handleSubmit,
      handleSavePost,
      handleGeneratePoster,
      toggleSidecar,
      closeSaveDialog,
    },
  } = orchestrator;

  useEffect(() => {
    pane.toggle(state.sidecarOpen);
  }, [pane, state.sidecarOpen]);

  const handleSaved = useCallback(() => {
    setSaveMessage("帖子保存成功！");
    setTimeout(() => setSaveMessage(null), 3000);
  }, []);

  // 加载数据库中的历史帖子列表
  const loadHistoryPosts = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const res = await getPersonaPostsAction();
      // 只展示最新的 100 条
      type PersonaPostWithPersonaLite = {
        id: string;
        title: string;
        content: string;
        status?: "draft" | "published" | "archived" | null;
        metadata: PersonaPostMetadata | null;
        persona?: {
          id: string;
          name: string;
          avatarUrl: string | null;
        } | null;
      };
      const rawPosts: PersonaPostWithPersonaLite[] = Array.isArray(res.posts)
        ? (res.posts as unknown as PersonaPostWithPersonaLite[])
        : [];

      const posts: PersonaPostRecord[] = rawPosts.slice(0, 100).map((p) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        status: p.status ?? "draft",
        personaId: p.persona?.id ?? null,
        persona: p.persona ?? null,
        metadata: p.metadata,
      }));

      setHistoryPosts(posts);
    } catch (err) {
      console.error("Failed to load history posts:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // 复制：基于某个帖子在数据库中创建一个副本（不传则使用当前预览的帖子）
  const handleCopyPost = useCallback(
    async (record?: PersonaPostRecord) => {
      const source =
        record ||
        (state.finalPost && {
          id: state.finalPost.id as string | undefined,
          title: state.finalPost.title,
          content: state.finalPost.content,
          status:
            state.finalPost.status === "published"
              ? "published"
              : state.finalPost.status === "archived"
                ? "archived"
                : "draft",
          personaId: null,
          metadata: state.finalPost.metadata ?? undefined,
        });

      if (!source) return;
      const personaId = state.selectedPersonaId ?? source.personaId ?? undefined;
      if (!personaId) {
        setSaveMessage("未选择人设，复制失败：需要人设 ID");
        setTimeout(() => setSaveMessage(null), 3000);
        return;
      }

      try {
        const platformValue =
          state.platform === "xiaohongshu" || state.platform === "weibo" || state.platform === "other"
            ? state.platform
            : undefined;
        const metadataPayload: PersonaPostMetadata = {
          ...(source.metadata || {}),
          posterUrl: state.posterUrl ?? undefined,
          posterPath: source.metadata?.posterPath ?? undefined,
          // 优先保留来源帖子自己的标签，只有在来源没有标签时才使用当前全局 state.tags
          tags: source.metadata?.tags ?? state.tags,
          platform: platformValue,
        };

        const res = await createPersonaPostAction({
          personaId,
            title: source.title,
            content: source.content,
          status: source.status === "published" ? "published" : "draft",
          metadata: metadataPayload,
        });

        if (!res.ok) {
          throw new Error(res.message || "复制失败");
        }

        // 无感插入：将新帖子插入列表顶部（保留最多100条），避免整列表刷新
        setHistoryPosts((prev) => {
          const next: PersonaPostRecord = {
            id: res.postId || `temp-${Date.now()}`,
            title: source.title,
            content: source.content,
            status: source.status === "published" ? "published" : "draft",
            metadata: metadataPayload,
          };
          return [next, ...prev].slice(0, 100);
        });
        setSaveMessage("已复制为新的帖子！");
        setTimeout(() => setSaveMessage(null), 3000);
      } catch (err) {
        console.error("Failed to copy post:", err);
      }
    },
    [
      state.finalPost,
      state.selectedPersonaId,
      state.posterUrl,
      state.tags,
      state.platform,
      loadHistoryPosts,
    ]
  );

  // 编辑：打开保存对话框。若传入 record，则先将其设置为当前 finalPost
  const handleEditPost = useCallback(
    (record?: PersonaPostRecord) => {
      if (record) {
        console.log("[PersonaPost] edit post record:", record);
        personaPostState.setFinalPost({
          id: record.id,
          title: record.title,
          content: record.content,
          status: record.status,
          tags: record.metadata?.tags || [],
          platform: record.metadata?.platform,
          metadata: record.metadata || {},
        });
        // 编辑时不再设置 posterUrl，让保存对话框通过 usePosterUrl hook 从 posterPath 获取预签名 URL
        // 这样可以避免使用旧的、可能无效的 posterUrl
        personaPostState.setPosterUrl(null);
      } else if (!state.finalPost) {
        return;
      }

      setShowSaveDialog(true);
    },
    [personaPostState, state.finalPost, setShowSaveDialog]
  );

  // 删除：弹窗确认 + 无感删除
  const handleDeletePost = useCallback(
    (record?: PersonaPostRecord) => {
      if (record) {
        setDeleteTarget(record);
        setDeleteDialogOpen(true);
        return;
      }
      if (state.finalPost?.id) {
        setDeleteTarget({
          id: state.finalPost.id,
          title: state.finalPost.title,
          content: state.finalPost.content,
          status:
            state.finalPost.status === "published"
              ? "published"
              : state.finalPost.status === "archived"
                ? "archived"
                : "draft",
          metadata: state.finalPost.metadata ?? null,
        });
        setDeleteDialogOpen(true);
      }
    },
    [state.finalPost]
  );

  const confirmDeletePost = useCallback(async () => {
    if (!deleteTarget?.id) {
      setDeleteDialogOpen(false);
      return;
    }
    try {
      setDeleting(true);
      const res = await deletePersonaPostAction(deleteTarget.id);
            if (!res.ok) {
        throw new Error(res.message || "删除失败");
            }
      // 无感删除：直接从列表移除
      setHistoryPosts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      // 如果当前预览就是被删的那一条，则清理预览
      if (deleteTarget.id === state.finalPost?.id) {
        personaPostState.setFinalPost(null);
        personaPostState.setPosterUrl(null);
      }
    } catch (err) {
      console.error("Failed to delete post:", err);
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, personaPostState, state.finalPost?.id]);

  // 首次进入页面时加载一次历史帖子
  useEffect(() => {
    loadHistoryPosts();
  }, [loadHistoryPosts]);

  const toolRenderer = useCallback(
    (part: ToolUIPart, _message: AgentMessage, index: number) => {
      // 仅渲染工具调用的 UI 片段，文本等其他部分交给默认渲染
      if (!isToolCall(part)) return null;
      return <ToolCallCard key={index} part={part} />;
    },
    []
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 左侧：选择器 */}
      <div className="lg:col-span-1">
        <PersonaPostSelectors state={personaPostState} />
      </div>

      {/* 中间：对话区 */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI帖子助手
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* 成功消息 */}
            {saveMessage && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">
                  {saveMessage}
                </p>
              </div>
            )}

            {/* 错误消息 */}
            {ui.error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {ui.error}
                </p>
              </div>
            )}

            {/* 对话区 */}
            <div className="space-y-4">
              <div className="h-[500px] overflow-y-auto border rounded-lg p-4">
                <AgentConversation
                  messages={chat.messages}
                  status={chat.status}
                  toolRenderer={toolRenderer}
                />
              </div>

              {/* 输入区 */}
              <AgentPromptInput
                value={state.inputValue}
                onChange={setInputValue}
                onSubmit={handleSubmit}
                status={chat.status}
                placeholder="描述你想生成的帖子内容，比如：帮我写一篇关于AI技术的小红书帖子..."
                footerContent={
                  state.started && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        提示
                      </Badge>
                      <span>
                        说&quot;生成帖子&quot;或&quot;帮我写&quot;来创建内容，
                        {state.selectedProjectId && "已关联知识库"}
                      </span>
                    </div>
                  )
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 下方：帖子预览卡片列表（横向排版） */}
      <div className="lg:col-span-3 space-y-4 mt-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-medium text-muted-foreground">
            帖子列表
          </span>
          <Button variant="ghost" size="sm" className="text-xs" onClick={loadHistoryPosts}>
            刷新
          </Button>
        </div>

        {loadingHistory ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 bg-muted animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : historyPosts.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground border rounded-lg">
            暂无已保存的帖子
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {historyPosts.map((post) => (
              <PersonaPostPreview
                key={post.id}
                post={{
                  id: post.id,
                  title: post.title,
                  content: post.content,
                  status: post.status,
                  tags: post.metadata?.tags || [],
                  platform: post.metadata?.platform,
                  metadata: post.metadata || {},
                }}
                posterUrl={null}
                generatingPoster={false}
                persona={post.persona ? {
                  id: post.persona.id,
                  name: post.persona.name,
                  avatarUrl: post.persona.avatarUrl,
                } : null}
                onCopy={() => handleCopyPost({ ...post })}
                onEdit={() => handleEditPost(post)}
                onDelete={() => handleDeletePost(post)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 保存对话框 */}
      <PersonaPostSaveDialog
        open={ui.showSaveDialog}
        onClose={closeSaveDialog}
        post={state.finalPost}
        posterUrl={state.posterUrl}
        onSave={async ({ title, content }) => {
          await handleSavePost({ title, content });
          handleSaved();
          await loadHistoryPosts();
        }}
        state={personaPostState}
      />

      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg border bg-card p-5 shadow-xl">
            <h3 className="text-base font-semibold">确认删除这条帖子？</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              删除后不可恢复，相关大字报对象可能仍保留存储。确定继续吗？
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
                取消
              </Button>
              <Button variant="destructive" size="sm" onClick={confirmDeletePost} disabled={deleting}>
                {deleting ? "删除中..." : "确认删除"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
