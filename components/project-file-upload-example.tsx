"use client";

/**
 * 项目文件上传示例组件
 *
 * 展示如何完整地实现文件上传流程：
 * 1. 选择文件
 * 2. 提取文本内容（PDF）
 * 3. 上传到 TOS
 * 4. 保存到数据库
 */

import { useState } from "react";
import { extractTextFromPdf } from "@/lib/browser-text-extractor";
import { getPresignedUploadUrl, createProjectAssetAction } from "@/app/actions";

interface FileUploadProps {
  projectId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function ProjectFileUpload({ projectId, onSuccess, onError }: FileUploadProps) {
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

      // 步骤 2: 获取预签名上传 URL
      setCurrentStep("正在获取上传链接...");
      setProgress(40);

      const uploadUrlResult = await getPresignedUploadUrl(file.name, file.type);
      if (!uploadUrlResult.ok) {
        throw new Error(uploadUrlResult.message || "获取上传链接失败");
      }

      const { url, objectKey } = uploadUrlResult;
      if (!url || !objectKey) {
        throw new Error("上传链接或对象键为空");
      }

      // 步骤 3: 上传文件到 TOS
      setCurrentStep("正在上传文件...");
      setProgress(60);

      const uploadResponse = await fetch(url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`文件上传失败: ${uploadResponse.statusText}`);
      }

      // 步骤 4: 创建文档记录
      setCurrentStep("正在保存记录...");
      setProgress(80);

      const formData = new FormData();
      formData.append("projectId", projectId);
      formData.append("name", file.name);
      formData.append("tosObjectKey", objectKey);
      formData.append("metadata", JSON.stringify({
        fileType: file.name.split(".").pop()?.toLowerCase() || "unknown",
        fileSize: file.size,
        mimeType: file.type,
        textContent: text,
        extractedAt: new Date().toISOString(),
        pageCount,
      }));

      const result = await createProjectAssetAction({ ok: true, message: "" }, formData);

      if (!result.ok) {
        throw new Error(result.message || "保存文档记录失败");
      }

      // 完成
      setProgress(100);
      setCurrentStep("上传完成!");

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("上传失败:", error);
      const errorMessage = error instanceof Error ? error.message : "上传失败，请稍后再试";

      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
        setCurrentStep("");
      }, 1000);
    }
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
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
          className={`cursor-pointer text-blue-600 hover:text-blue-700 ${
            uploading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {uploading ? "上传中..." : "选择 PDF 文件"}
        </label>
        <p className="text-sm text-gray-500 mt-2">
          支持 PDF 格式，系统将自动提取文本内容
        </p>
      </div>

      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{currentStep}</span>
            <span className="text-gray-600">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
