"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UploadIcon } from "lucide-react";
import { extractTextFromPdf } from "@/lib/browser-text-extractor";
import { createProjectAssetAction } from "@/app/actions";

interface FileUploadSectionProps {
  projectId: string;
}

export function FileUploadSection({ projectId }: FileUploadSectionProps) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");

  async function handleFileUpload(file: File) {
    try {
      setUploading(true);
      setProgress(0);

      // 步骤 1: 提取文本内容
      setCurrentStep("正在提取文档内容...");
      setProgress(25);

      const { text, pageCount } = await extractTextFromPdf(file);
      console.log(`提取成功：${pageCount} 页，${text.length} 字符`);

      // 步骤 2: 上传文件到 TOS（通过 API route）
      setCurrentStep("正在上传文件到存储...");
      setProgress(50);

      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const uploadResponse = await fetch("/api/projects/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.message || "上传文件失败");
      }

      const uploadResult = await uploadResponse.json();
      if (!uploadResult.ok || !uploadResult.objectKey) {
        throw new Error(uploadResult.message || "获取文件存储键失败");
      }

      // 步骤 3: 保存文档记录（通过 Server Action）
      setCurrentStep("正在保存记录...");
      setProgress(80);

      const formData = new FormData();
      formData.append("projectId", projectId);
      formData.append("name", file.name);
      formData.append("tosObjectKey", uploadResult.objectKey);
      formData.append("metadata", JSON.stringify({
        fileType: file.name.split(".").pop()?.toLowerCase() || "unknown",
        fileSize: file.size,
        mimeType: file.type,
        textContent: text,
        extractedAt: new Date().toISOString(),
        pageCount,
      }));

      // @ts-expect-error - Server Action 需要两个参数但客户端直接调用时会自动处理第一个参数
      const result = await createProjectAssetAction(null, formData);

      if (!result.ok) {
        throw new Error(result.message || "保存文档记录失败");
      }

      // 完成
      setProgress(100);
      setCurrentStep("上传完成！");

      // 刷新页面
      setTimeout(() => {
        router.refresh();
        setUploading(false);
        setProgress(0);
        setCurrentStep("");
      }, 1000);
    } catch (error) {
      console.error("上传失败:", error);
      const errorMessage = error instanceof Error ? error.message : "上传失败，请稍后再试";
      alert(errorMessage);

      setUploading(false);
      setProgress(0);
      setCurrentStep("");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>上传文档</CardTitle>
        <CardDescription>上传 PDF 文档，系统将自动提取文本内容</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileUpload(file);
              }
            }}
            disabled={uploading}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className={`cursor-pointer ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="flex flex-col items-center gap-2">
              <UploadIcon className="w-8 h-8 text-muted-foreground" />
              <div>
                <span className="text-sm font-medium text-primary">
                  {uploading ? "上传中..." : "点击选择文件"}
                </span>
                <p className="text-xs text-muted-foreground mt-1">支持 PDF 格式</p>
              </div>
            </div>
          </label>
        </div>

        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{currentStep}</span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
