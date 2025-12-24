import { Save, Upload, X, Loader2 } from "lucide-react";
import React, { useActionState, useEffect, useState, useRef } from "react";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createPersonaAction, updatePersonaAction, getPersonaForEdit, getPersonaById, type ActionState } from "@/app/actions";
import { type PersonaParseResult } from "@/lib/persona-parser";
import { useAvatarUrl } from "../hooks/use-avatar-url";

type PersonaSaveFormProps = {
  persona?: PersonaParseResult;
  personaId?: string;
  avatarUrl?: string | null;
  onSuccess: (message?: string) => void;
  onCancel: () => void;
};

export function PersonaSaveForm({ persona, personaId, avatarUrl, onSuccess, onCancel }: PersonaSaveFormProps) {
  const isEditMode = !!personaId;
  const [loading, setLoading] = useState(isEditMode);
  const [formPersona, setFormPersona] = useState<PersonaParseResult | null>(persona || null);
  // 存储 objectKey（路径），而不是完整的预签名 URL
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(null); // 本地预览URL
  // 存储小红书导入的头像 URL（完整 URL，不是 objectKey）
  const [xhsAvatarUrl, setXhsAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 使用 hook 根据 avatarPath 获取预签名 URL
  const { url: signedAvatarUrl, loading: loadingAvatarUrl } = useAvatarUrl(avatarPath);
  
  // 优先级：本地预览 > 上传的头像（通过 hook）> 小红书导入的头像
  const displayAvatarUrl = previewAvatarUrl || signedAvatarUrl || xhsAvatarUrl;

  const [state, formAction] = useActionState<ActionState, FormData>(
    isEditMode ? updatePersonaAction : createPersonaAction,
    {
      ok: false,
      message: "",
    }
  );

  // 编辑模式：加载数据（后端已处理数据转换）
  useEffect(() => {
    if (isEditMode && personaId) {
      async function loadPersona() {
        const [data, personaData] = await Promise.all([
          getPersonaForEdit(personaId!),
          getPersonaById(personaId!),
        ]);
        if (data) {
          setFormPersona(data);
        }
        if (personaData?.avatarUrl) {
          // 如果 avatarUrl 是 objectKey 格式（以 avatars/ 开头且不是 http URL），存储为 path
          // 这样可以通过 hook 动态获取预签名 URL
          const isPath = personaData.avatarUrl.startsWith("avatars/") && !personaData.avatarUrl.startsWith("http");
          if (isPath) {
            setAvatarPath(personaData.avatarUrl);
          } else {
            // 如果是完整的 URL（可能是小红书导入的），直接使用
            setXhsAvatarUrl(personaData.avatarUrl);
          }
        }
        setLoading(false);
      }
      loadPersona();
    } else if (avatarUrl) {
      // 非编辑模式，检查传入的 avatarUrl 是 objectKey 还是完整 URL
      const isPath = avatarUrl.startsWith("avatars/") && !avatarUrl.startsWith("http");
      if (isPath) {
        // 是 objectKey，存储为 path
        setAvatarPath(avatarUrl);
      } else {
        // 是完整 URL（可能是小红书导入的），存储为 xhsAvatarUrl
        setXhsAvatarUrl(avatarUrl);
      }
    }
  }, [isEditMode, personaId, avatarUrl]);

  useEffect(() => {
    if (state.ok) {
      onSuccess(state.message);
    }
  }, [state, onSuccess]);

  // 调试：检查 avatarPath、xhsAvatarUrl 和显示 URL
  useEffect(() => {
    if (avatarPath) {
      console.log("[AvatarForm] avatarPath state:", avatarPath);
    }
    if (xhsAvatarUrl) {
      console.log("[AvatarForm] xhsAvatarUrl state:", xhsAvatarUrl.substring(0, 100));
    }
    if (displayAvatarUrl) {
      console.log("[AvatarForm] displayAvatarUrl:", {
        url: displayAvatarUrl.substring(0, 100),
        length: displayAvatarUrl.length,
        fromHook: !!signedAvatarUrl,
        fromXhs: !!xhsAvatarUrl,
        fromPreview: !!previewAvatarUrl,
      });
    }
  }, [avatarPath, xhsAvatarUrl, displayAvatarUrl, signedAvatarUrl, previewAvatarUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!formPersona) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-rose-500">人设数据不存在</div>
      </div>
    );
  }

  const defaultDomain = formPersona.domainTags?.join(", ") || "";
  const defaultStyle = formPersona.voice || formPersona.tone || formPersona.style || "";
  const defaultContentPillars = formPersona.contentPillars?.join("\n") || "";
  const defaultHooks = formPersona.hooks?.join("\n") || "";
  const defaultReminders = formPersona.reminders?.join("\n") || "";

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("只支持图片格式（JPG、PNG、GIF、WebP）");
      return;
    }

    // 验证文件大小（最大 5MB）
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("图片大小不能超过 5MB");
      return;
    }

    // 先创建本地预览（立即显示）
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") {
        setPreviewAvatarUrl(result);
      }
    };
    reader.readAsDataURL(file);

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/avatars/upload", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as {
        ok?: boolean;
        objectKey?: string;
        url?: string;
        message?: string;
      };
      console.log("[AvatarUpload] upload result:", {
        ok: result.ok,
        hasUrl: !!result.url,
        urlLength: result.url?.length,
        urlPreview: result.url?.substring(0, 150),
        objectKey: result.objectKey,
      });

      if (result.ok && result.objectKey && typeof result.objectKey === "string") {
        // 存储 objectKey（路径），而不是完整的预签名 URL
        // 这样可以通过 hook 动态获取最新的预签名 URL
        // 用户上传新头像时，覆盖小红书导入的头像
        console.log("[AvatarUpload] storing avatar path:", result.objectKey);
        setAvatarPath(result.objectKey);
        setXhsAvatarUrl(null); // 清除小红书导入的头像，使用新上传的
        setPreviewAvatarUrl(null); // 清除本地预览，使用 hook 获取的 URL
      } else {
        // 上传失败，清除预览
        setPreviewAvatarUrl(null);
        console.error("[AvatarUpload] upload failed:", result);
        alert(result.message || "上传头像失败");
      }
    } catch (error) {
      console.error("Upload avatar failed:", error);
      setPreviewAvatarUrl(null);
      alert("上传头像失败，请稍后再试");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPath(null);
    setXhsAvatarUrl(null);
    setPreviewAvatarUrl(null);
  };

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      {isEditMode && personaId && (
        <input type="hidden" name="personaId" value={personaId} />
      )}
      {/* 提交时，优先使用上传的头像（objectKey），否则使用小红书导入的头像（完整 URL） */}
      {avatarPath ? (
        <input 
          type="hidden" 
          name="avatarUrl" 
          value={avatarPath}
        />
      ) : xhsAvatarUrl ? (
        <input 
          type="hidden" 
          name="avatarUrl" 
          value={xhsAvatarUrl}
        />
      ) : null}
      
      {/* 头像上传 */}
      <div className="sm:col-span-2">
        <Label className="text-xs">头像</Label>
        <div className="mt-2 flex items-center gap-4">
          {(previewAvatarUrl || displayAvatarUrl) ? (
            <div className="relative">
              {loadingAvatarUrl && !previewAvatarUrl ? (
                <div className="h-20 w-20 rounded-full border bg-muted flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <img
                  src={previewAvatarUrl || displayAvatarUrl || ""}
                  alt="头像预览"
                  className="h-20 w-20 rounded-full border object-cover"
                  onLoad={() => {
                    console.log("[AvatarPreview] image loaded successfully:", {
                      isPreview: !!previewAvatarUrl,
                      fromHook: !!signedAvatarUrl,
                    });
                  }}
                  onError={(e) => {
                    const failedUrl = previewAvatarUrl || displayAvatarUrl;
                    console.error("[AvatarPreview] failed to load avatar image:", {
                      url: failedUrl?.substring(0, 150),
                      urlLength: failedUrl?.length,
                      isPreview: !!previewAvatarUrl,
                      fromHook: !!signedAvatarUrl,
                      avatarPath,
                      error: e,
                    });
                    // 如果图片加载失败，清除预览
                    if (previewAvatarUrl) {
                      setPreviewAvatarUrl(null);
                    }
                  }}
                />
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleRemoveAvatar}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="h-20 w-20 rounded-full border bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">无头像</span>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleAvatarUpload}
              className="hidden"
              id="avatar-upload"
              disabled={uploadingAvatar}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar || loadingAvatarUrl}
              className="w-fit"
            >
              {uploadingAvatar ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  上传中...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {(avatarPath || displayAvatarUrl) ? "更换头像" : "上传头像"}
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              支持 JPG、PNG、GIF、WebP，最大 5MB
            </p>
          </div>
        </div>
      </div>

      <div className="sm:col-span-1">
        <Label htmlFor="persona-name" className="text-xs">
          人设名称
        </Label>
        <Input id="persona-name" name="name" defaultValue={formPersona.name} required />
      </div>
      <div className="sm:col-span-1">
        <Label htmlFor="persona-alias" className="text-xs">
          别名
        </Label>
        <Input id="persona-alias" name="alias" defaultValue={formPersona.alias} placeholder="角色标签" />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="persona-tagline" className="text-xs">
          标签/口号
        </Label>
        <Input
          id="persona-tagline"
          name="tagline"
          defaultValue={formPersona.tagline}
          placeholder="个性签名"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="persona-domain" className="text-xs">
          领域标签（逗号分隔）
        </Label>
        <Input
          id="persona-domain"
          name="domain"
          defaultValue={defaultDomain}
          placeholder="潮流,夜生活,线下体验"
          required
        />
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="persona-audience" className="text-xs">
          目标受众
        </Label>
        <Input
          id="persona-audience"
          name="audience"
          defaultValue={formPersona.audience}
          placeholder="18-28岁一二线城市潮流青年"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="persona-background" className="text-xs">
          人设背景
        </Label>
        <Textarea
          id="persona-background"
          name="background"
          defaultValue={formPersona.background}
          placeholder="人设背景故事..."
          className="min-h-[80px] resize-y text-sm"
        />
      </div>

      <div className="sm:col-span-1">
        <Label htmlFor="persona-voice" className="text-xs">
          Voice（表达声音）
        </Label>
        <Input
          id="persona-voice"
          name="voice"
          defaultValue={formPersona.voice}
          placeholder="中英夹杂的年轻化口吻"
        />
      </div>
      <div className="sm:col-span-1">
        <Label htmlFor="persona-tone" className="text-xs">
          Tone（语气氛围）
        </Label>
        <Input
          id="persona-tone"
          name="tone"
          defaultValue={formPersona.tone}
          placeholder="带着微醺感的沉浸式氛围"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="persona-style" className="text-xs">
          表达风格
        </Label>
        <Input
          id="persona-style"
          name="style"
          defaultValue={defaultStyle}
          placeholder="碎片化场景叙事+实用安利"
          required
        />
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="persona-contentPillars" className="text-xs">
          内容支柱（每行一个）
        </Label>
        <Textarea
          id="persona-contentPillars"
          name="contentPillars"
          defaultValue={defaultContentPillars}
          placeholder="发光体穿搭指南-反光材质/霓虹色系实战测评&#10;派对生存包-便携香氛/补光神器场景化展示"
          className="min-h-[80px] resize-y text-sm font-mono"
        />
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="persona-hooks" className="text-xs">
          签名钩子（每行一个）
        </Label>
        <Textarea
          id="persona-hooks"
          name="hooks"
          defaultValue={defaultHooks}
          placeholder="3件让夜拍封神的发光小物&#10;藏在洗手间的派对补妆神器"
          className="min-h-[60px] resize-y text-sm font-mono"
        />
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="persona-reminders" className="text-xs">
          提醒事项（每行一个）
        </Label>
        <Textarea
          id="persona-reminders"
          name="reminders"
          defaultValue={defaultReminders}
          placeholder="所有场景必须包含具体地理位置标签&#10;强制使用#夜行动物集结话题标签"
          className="min-h-[60px] resize-y text-sm font-mono"
        />
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="persona-callToAction" className="text-xs">
          行动号召（CTA）
        </Label>
        <Input
          id="persona-callToAction"
          name="callToAction"
          defaultValue={formPersona.callToAction}
          placeholder="快标记你的夜拍瞬间,解锁同款光影装备"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="persona-bio" className="text-xs">
          人设简介（Bio）
        </Label>
        <Textarea
          id="persona-bio"
          name="bio"
          defaultValue={formPersona.bio}
          placeholder="我是穿梭在城市霓虹间的夜色捕手..."
          className="min-h-[100px] resize-y text-sm"
        />
      </div>

      {state.message && (
        <div className={cn("text-xs sm:col-span-2", state.ok ? "text-emerald-600" : "text-rose-500")}>
          {state.message}
        </div>
      )}

      <DialogFooter className="sm:col-span-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">
          <Save className="mr-2 h-4 w-4" />
          {isEditMode ? "保存更改" : "保存人设"}
        </Button>
      </DialogFooter>
    </form>
  );
}
