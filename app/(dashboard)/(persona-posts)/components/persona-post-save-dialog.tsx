"use client";

/**
 * Persona Post Save Dialog
 *
 * 保存帖子对话框
 */

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { PersonaPostResult } from "@/modules/agent/adapters/persona-post";
import type { PersonaPostStateApi } from "@/modules/persona-post/usePersonaPostState";
import { X } from "lucide-react";

export interface PersonaPostSaveDialogProps {
  open: boolean;
  onClose: () => void;
  post: PersonaPostResult | null;
  posterUrl: string | null;
  onSave: (payload: { title: string; content: string }) => Promise<void>;
  state: PersonaPostStateApi;
}

export function PersonaPostSaveDialog({
  open,
  onClose,
  post,
  posterUrl,
  onSave,
  state,
}: PersonaPostSaveDialogProps) {
  const [saving, setSaving] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [tagInput, setTagInput] = React.useState("");

  React.useEffect(() => {
    if (post) {
      setTitle(post.title);
      setContent(post.content);
      if (post.tags) {
        state.setTags(post.tags);
      }
    }
  }, [post, state]);

  // 是否需要强制选择人设：新建帖子时需要，编辑已有帖子（有 id）时不需要
  const requirePersona = !post?.id;

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave({ title, content });
      onClose();
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      state.addTag(tagInput.trim());
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    state.removeTag(tag);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>保存帖子</DialogTitle>
          <DialogDescription>
            确认帖子信息后保存到数据库
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 标题 */}
          <div className="space-y-2">
            <Label htmlFor="title">标题</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入帖子标题..."
            />
          </div>

          {/* 内容 */}
          <div className="space-y-2">
            <Label htmlFor="content">内容</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入帖子内容..."
              rows={10}
            />
          </div>

          {/* 标签 */}
          <div className="space-y-2">
            <Label htmlFor="tags">标签</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="添加标签，按回车确认"
              />
              <Button type="button" onClick={handleAddTag} variant="secondary">
                添加
              </Button>
            </div>
            {state.state.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {state.state.tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer"
                  >
                    #{tag}
                    <X
                      className="h-3 w-3 ml-1"
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* 大字报预览 */}
          {posterUrl && (
            <div className="space-y-2">
              <Label>大字报配图</Label>
              <img
                src={posterUrl}
                alt="大字报预览"
                className="w-full max-w-sm border rounded-lg"
              />
            </div>
          )}

          {/* 人设提示：仅在新建帖子且未选择人设时提示 */}
          {requirePersona && !state.state.selectedPersonaId && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                请先在左侧选择一个人设
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || (requirePersona && !state.state.selectedPersonaId)}
          >
            {saving ? "保存中..." : "确认保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
