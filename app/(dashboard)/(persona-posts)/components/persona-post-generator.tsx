"use client";

/**
 * Persona Post Generator Component
 *
 * 主要的帖子生成界面组件
 */

import React, { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentConversation } from "@/modules/agent/ui/agent-conversation";
import { AgentSidecar } from "@/modules/agent/ui/agent-sidecar";
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

export function PersonaPostGenerator() {
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
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

  const toolRenderer = useCallback(
    (part: AgentPart, message: AgentMessage, index: number) => {
      return <ToolCallCard key={index} part={part} message={message} />;
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

      {/* 右侧预览面板（响应式） */}
      <AgentSidecar visible={pane.visible} isDesktop={pane.isDesktop}>
        <PersonaPostPreview
          post={state.finalPost}
          posterUrl={state.posterUrl}
          generatingPoster={state.generatingPoster}
          onGeneratePoster={handleGeneratePoster}
          onSave={() => setShowSaveDialog(true)}
          onClose={toggleSidecar}
        />
      </AgentSidecar>

      {/* 保存对话框 */}
      <PersonaPostSaveDialog
        open={ui.showSaveDialog}
        onClose={closeSaveDialog}
        post={state.finalPost}
        posterUrl={state.posterUrl}
        onSave={async () => {
          await handleSavePost();
          handleSaved();
        }}
        state={personaPostState}
      />
    </div>
  );
}
