"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { parseXiaohongshuJson } from "@/lib/xiaohongshu-parser";

type XiaohongshuImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (jsonString: string) => Promise<void>;
  importing?: boolean;
  importError?: string | null;
};

export function XiaohongshuImportDialog({
  open,
  onOpenChange,
  onImport,
  importing = false,
  importError,
}: XiaohongshuImportDialogProps) {
  const [jsonText, setJsonText] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleImport = async () => {
    setLocalError(null);
    
    if (!jsonText.trim()) {
      setLocalError("请输入JSON数据");
      return;
    }

    // 验证JSON格式
    const parsed = parseXiaohongshuJson(jsonText);
    if (!parsed) {
      setLocalError("JSON格式不正确，请检查数据格式");
      return;
    }

    try {
      // 调用导入函数（成功后父组件会关闭对话框）
      await onImport(jsonText);
      // 清空输入，准备下次使用
      setJsonText("");
      setLocalError(null);
    } catch (error) {
      // 错误由调用方处理，这里只显示本地验证错误
      console.error("导入失败:", error);
    }
  };

  const handleClose = () => {
    setJsonText("");
    setLocalError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>从小红书导入</DialogTitle>
          <DialogDescription>
            请粘贴小红书账号的JSON数据，系统将自动解析并生成人设
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 flex flex-col gap-3">
          <div className="flex-1 min-h-0 flex flex-col">
            <Label htmlFor="xhs-json-input" className="text-xs mb-2">
              JSON 数据
            </Label>
            <Textarea
              id="xhs-json-input"
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setLocalError(null);
              }}
              placeholder='请粘贴JSON数据，例如：{"feeds": [...], "userInfo": {...}}'
              className="flex-1 min-h-[300px] font-mono text-sm resize-none"
              disabled={importing}
            />
          </div>

          {(localError || importError) && (
            <div className="text-xs text-rose-500">{localError || importError}</div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={importing}
          >
            取消
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={importing || !jsonText.trim()}
          >
            {importing ? "导入中..." : "导入"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

