# 项目系统使用指南

本文档介绍如何使用项目管理和文档上传系统。

## 数据库结构

### Project 表
- `id`: UUID，主键
- `userId`: 用户ID
- `name`: 项目名称
- `metadata`: JSON 字段，存储 AI 知识库等信息
  - 建议结构：
    ```json
    {
      "summary": "项目总结",
      "keyPoints": ["关键点1", "关键点2"],
      "categories": ["分类1", "分类2"],
      "aiKnowledgeBase": "AI 生成的知识库内容"
    }
    ```

### ProjectAsset 表
- `id`: UUID，主键
- `projectId`: 项目ID
- `name`: 文件名
- `tosObjectKey`: TOS 存储路径（不是 URL）
- `metadata`: JSON 字段，存储文件信息和提取的文本
  - 建议结构：
    ```json
    {
      "fileType": "pdf",
      "fileSize": 1024000,
      "mimeType": "application/pdf",
      "textContent": "从文档提取的纯文本内容",
      "extractedAt": "2024-12-20T12:00:00Z",
      "pageCount": 10,
      "aiSummary": "AI 对这个文档的总结"
    }
    ```

## Server Actions API

### 项目管理

#### 创建项目
```typescript
import { createProjectAction } from "@/app/actions";

const formData = new FormData();
formData.append("name", "我的项目");
formData.append("metadata", JSON.stringify({
  summary: "",
  keyPoints: [],
}));

const result = await createProjectAction(null, formData);
if (result.ok) {
  console.log("项目创建成功");
}
```

#### 获取所有项目
```typescript
import { getProjects } from "@/app/actions";

const projects = await getProjects();
// 返回包含 assets 摘要的项目列表
```

#### 获取单个项目
```typescript
import { getProjectById } from "@/app/actions";

const project = await getProjectById(projectId);
// 返回包含所有 assets 的项目详情
```

#### 更新项目
```typescript
import { updateProjectAction } from "@/app/actions";

const formData = new FormData();
formData.append("projectId", projectId);
formData.append("name", "更新后的项目名");
formData.append("metadata", JSON.stringify({
  summary: "AI 总结的内容",
  aiKnowledgeBase: "整合后的知识库",
}));

const result = await updateProjectAction(null, formData);
```

#### 删除项目
```typescript
import { deleteProjectAction } from "@/app/actions";

const formData = new FormData();
formData.append("projectId", projectId);

const result = await deleteProjectAction(null, formData);
// 会级联删除所有关联的文档
```

### 文档管理

#### 创建文档记录
```typescript
import { createProjectAssetAction } from "@/app/actions";

const formData = new FormData();
formData.append("projectId", projectId);
formData.append("name", file.name);
formData.append("tosObjectKey", objectKey); // 从上传流程获取
formData.append("metadata", JSON.stringify({
  fileType: "pdf",
  fileSize: file.size,
  mimeType: file.type,
  textContent: extractedText,
  extractedAt: new Date().toISOString(),
}));

const result = await createProjectAssetAction(null, formData);
```

#### 获取项目的所有文档
```typescript
import { getProjectAssets } from "@/app/actions";

const assets = await getProjectAssets(projectId);
```

#### 更新文档元数据
```typescript
import { updateProjectAssetAction } from "@/app/actions";

const formData = new FormData();
formData.append("assetId", assetId);
formData.append("metadata", JSON.stringify({
  ...existingMetadata,
  aiSummary: "AI 生成的总结",
}));

const result = await updateProjectAssetAction(null, formData);
```

#### 删除文档
```typescript
import { deleteProjectAssetAction } from "@/app/actions";

const formData = new FormData();
formData.append("assetId", assetId);

const result = await deleteProjectAssetAction(null, formData);
```

### TOS 文件上传

#### 获取预签名上传 URL
```typescript
import { getPresignedUploadUrl } from "@/app/actions";

const result = await getPresignedUploadUrl(file.name, file.type);
if (result.ok) {
  const { url, objectKey } = result;
  // 使用 url 上传文件
  // 保存 objectKey 到数据库
}
```

#### 上传文件到 TOS
```typescript
// 1. 获取预签名 URL
const uploadResult = await getPresignedUploadUrl(file.name, file.type);
if (!uploadResult.ok) {
  throw new Error(uploadResult.message);
}

const { url, objectKey } = uploadResult;

// 2. 使用 PUT 方法上传文件
const uploadResponse = await fetch(url, {
  method: "PUT",
  body: file,
  headers: {
    "Content-Type": file.type,
  },
});

if (!uploadResponse.ok) {
  throw new Error("文件上传失败");
}

// 3. 上传成功后，保存 objectKey 到数据库
// objectKey 格式: projects/{userId}/{timestamp}-{uuid}.{ext}
```

#### 获取预签名下载 URL
```typescript
import { getPresignedDownloadUrl } from "@/app/actions";

const result = await getPresignedDownloadUrl(objectKey);
if (result.ok) {
  const { url } = result;
  // 使用 url 下载或预览文件
  window.open(url, "_blank");
}
```

## 完整的文件上传流程示例

```typescript
"use client";

import { useState } from "react";
import { extractTextFromPdf } from "@/lib/browser-text-extractor";
import { getPresignedUploadUrl } from "@/app/actions";
import { createProjectAssetAction } from "@/app/actions";

export function FileUploadComponent({ projectId }: { projectId: string }) {
  const [uploading, setUploading] = useState(false);

  async function handleFileUpload(file: File) {
    try {
      setUploading(true);

      // 1. 提取文本内容（浏览器端）
      const { text, pageCount } = await extractTextFromPdf(file);

      // 2. 获取预签名上传 URL
      const uploadUrlResult = await getPresignedUploadUrl(file.name, file.type);
      if (!uploadUrlResult.ok) {
        throw new Error(uploadUrlResult.message);
      }

      const { url, objectKey } = uploadUrlResult;

      // 3. 上传文件到 TOS
      const uploadResponse = await fetch(url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("文件上传失败");
      }

      // 4. 创建文档记录
      const formData = new FormData();
      formData.append("projectId", projectId);
      formData.append("name", file.name);
      formData.append("tosObjectKey", objectKey!);
      formData.append("metadata", JSON.stringify({
        fileType: file.type,
        fileSize: file.size,
        mimeType: file.type,
        textContent: text,
        extractedAt: new Date().toISOString(),
        pageCount,
      }));

      const result = await createProjectAssetAction(null, formData);

      if (result.ok) {
        console.log("文档上传并保存成功");
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("上传失败:", error);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
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
      />
      {uploading && <p>上传中...</p>}
    </div>
  );
}
```

## AI 知识库生成流程

1. **文档上传**：用户上传多个文档到项目中
2. **文本提取**：前端使用 `extractTextFromPdf` 提取文档文本
3. **存储文本**：将提取的文本存储在 `ProjectAsset.metadata.textContent` 中
4. **AI 总结**：
   - 获取项目的所有文档：`getProjectAssets(projectId)`
   - 提取所有 `metadata.textContent`
   - 使用 AI 对所有文本进行总结
   - 将总结结果存储在 `Project.metadata.aiKnowledgeBase` 中

```typescript
import { getProjectAssets } from "@/app/actions";
import { updateProjectAction } from "@/app/actions";

async function generateKnowledgeBase(projectId: string) {
  // 1. 获取所有文档
  const assets = await getProjectAssets(projectId);

  // 2. 提取所有文本内容
  const allTexts = assets
    .map(asset => {
      const metadata = asset.metadata as { textContent?: string };
      return metadata.textContent || "";
    })
    .filter(Boolean)
    .join("\n\n");

  // 3. 使用 AI 生成知识库（这里需要调用你的 AI 服务）
  const aiSummary = await yourAIService.summarize(allTexts);

  // 4. 更新项目的 metadata
  const formData = new FormData();
  formData.append("projectId", projectId);
  formData.append("name", currentProjectName);
  formData.append("metadata", JSON.stringify({
    aiKnowledgeBase: aiSummary,
    summary: aiSummary.substring(0, 200),
    generatedAt: new Date().toISOString(),
  }));

  await updateProjectAction(null, formData);
}
```

## 注意事项

1. **安全性**：
   - 所有 Server Actions 都会验证用户身份
   - TOS objectKey 包含 userId，确保文件隔离
   - 下载时验证 objectKey 是否属于当前用户

2. **文件格式**：
   - 目前 `extractTextFromPdf` 仅支持 PDF 文件
   - 如需支持其他格式（如 Word、TXT），需要扩展提取逻辑

3. **性能优化**：
   - 大文件上传建议添加进度条
   - AI 总结建议异步处理，避免阻塞用户操作
   - 考虑对大量文本进行分块处理

4. **错误处理**：
   - 所有 Server Actions 都返回 `{ ok: boolean, message: string }` 结构
   - 前端应该适当处理错误并展示给用户
