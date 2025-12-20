"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileTextIcon, MoreVerticalIcon, TrashIcon, DownloadIcon } from "lucide-react";
import { deleteProjectAssetAction, getPresignedDownloadUrl } from "@/app/actions";

interface DocumentListProps {
  projectId: string;
  documents: Array<{
    id: string;
    name: string;
    tosObjectKey: string;
    createdAt: Date;
    metadata: unknown;
  }>;
}

interface DocumentMetadata {
  fileType?: string;
  fileSize?: number;
  pageCount?: number;
  extractedAt?: string;
  textContent?: string;
}

export function DocumentList({ projectId, documents }: DocumentListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(documentId: string, documentName: string) {
    if (!confirm(`确定要删除文档"${documentName}"吗？`)) {
      return;
    }

    setDeletingId(documentId);
    const formData = new FormData();
    formData.append("assetId", documentId);

    const result = await deleteProjectAssetAction({ ok: true, message: "" }, formData);

    if (result.ok) {
      router.refresh();
    } else {
      alert(result.message);
      setDeletingId(null);
    }
  }

  async function handleDownload(objectKey: string, fileName: string) {
    const result = await getPresignedDownloadUrl(objectKey);

    if (result.ok && result.url) {
      window.open(result.url, "_blank");
    } else {
      alert(result.message || "获取下载链接失败");
    }
  }

  function formatFileSize(bytes?: number): string {
    if (!bytes) return "未知";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>文档列表</CardTitle>
        <CardDescription>
          已上传 {documents.length} 个文档
        </CardDescription>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileTextIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>暂无文档，请上传 PDF 文件</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => {
              const metadata = doc.metadata as DocumentMetadata;

              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileTextIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(metadata.fileSize)}
                        </span>
                        {metadata.pageCount && (
                          <>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">
                              {metadata.pageCount} 页
                            </span>
                          </>
                        )}
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(doc.createdAt).toLocaleDateString("zh-CN")}
                        </span>
                      </div>
                    </div>
                    {metadata.textContent && (
                      <Badge variant="secondary" className="flex-shrink-0">
                        已提取文本
                      </Badge>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        disabled={deletingId === doc.id}
                      >
                        <MoreVerticalIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleDownload(doc.tosObjectKey, doc.name)}
                      >
                        <DownloadIcon className="w-4 h-4 mr-2" />
                        下载文件
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(doc.id, doc.name)}
                        className="text-destructive"
                      >
                        <TrashIcon className="w-4 h-4 mr-2" />
                        删除文档
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
