"use client";

import { useActionState } from "react";
import { Upload, Image as ImageIcon, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createMaterialAction, type ActionState } from "@/app/actions";
import { useDashboard } from "@/components/providers/dashboard-provider";
import { cn } from "@/lib/utils";

export function MaterialForm() {
  const { snapshot } = useDashboard();
  const materials = snapshot.materials;
  const [state, formAction] = useActionState<ActionState, FormData>(createMaterialAction, {
    ok: false,
    message: "",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>快速录入素材</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3 text-sm">
          <div>
            <Label htmlFor="material-file">选择文件</Label>
            <Input
              id="material-file"
              name="file"
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="material-name">素材名称（可选）</Label>
            <Input
              id="material-name"
              name="name"
              placeholder="留空则使用文件名"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="material-type">素材类型</Label>
            <Select name="type" defaultValue="document" required>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="document">文档</SelectItem>
                <SelectItem value="image">图片</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full">
            <Upload className="mr-2 h-4 w-4" />
            上传素材
          </Button>
          {state.message && (
            <p className={cn("text-xs", state.ok ? "text-emerald-600" : "text-rose-500")}>
              {state.message}
            </p>
          )}
        </form>
        {materials.length === 0 ? (
          <Card className="mt-4 border-dashed">
            <CardContent className="p-6 text-center">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
              <CardDescription className="mt-2">还没有上传素材</CardDescription>
              <CardDescription className="mt-1 text-xs">上传 PDF 或图片开始使用</CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-4 space-y-2">
            {materials.map((material) => (
              <div
                key={material.id || material.name}
                className="flex items-center justify-between rounded-lg border bg-muted px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  {material.type === "image" ? (
                    <ImageIcon className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  <span>{material.name}</span>
                </div>
                <span className="text-muted-foreground">{material.sizeLabel}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

