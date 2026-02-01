"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Trash2, QrCode } from "lucide-react";
import { getTaskBatches, deleteTaskBatch } from "@/app/actions/task-distribution";
import { useRouter } from "next/navigation";
import Link from "next/link";

export interface TaskBatch {
  id: string;
  name?: string | null;
  createdAt: Date;
  metadata?: Record<string, unknown> | null;
  _count: {
    posts: number;
    comments: number;
  };
}

export function TaskBatchSection() {
  const router = useRouter();
  const [batches, setBatches] = useState<TaskBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadBatches = async () => {
    setIsLoading(true);
    try {
      const result = await getTaskBatches();
      if (result.ok && result.data) {
        setBatches(result.data);
      }
    } catch (error) {
      console.error("加载批次失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const handleDelete = async (batchId: string) => {
    if (!confirm("确定要删除这个批次吗？删除后无法恢复。")) {
      return;
    }

    setDeletingId(batchId);
    try {
      const result = await deleteTaskBatch(batchId);
      if (result.ok) {
        router.refresh();
        await loadBatches();
      } else {
        alert(result.message || "删除失败");
      }
    } catch (error) {
      console.error("删除失败:", error);
      alert("删除失败，请稍后重试");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (batches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>任务批次</CardTitle>
          <CardDescription>还没有创建任何任务批次，请先上传 CSV 文件。</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>任务批次</CardTitle>
        <CardDescription>所有已创建的任务批次列表</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {batches.map((batch) => {
            const platformStats = (batch.metadata as { platformStats?: Record<string, number> })?.platformStats || {};
            const platformNames = Object.keys(platformStats).join("、") || "未分类";

            return (
              <div
                key={batch.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <h3 className="font-medium mb-1">
                    {batch.name || `批次 ${batch.id.slice(0, 8)}`}
                  </h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>创建于 {new Date(batch.createdAt).toLocaleString("zh-CN")}</p>
                    <p>
                      帖子: {batch._count.posts} | 评论: {batch._count.comments} | 平台: {platformNames}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Link href={`/task-distribution/${batch.id}`}>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      查看详情
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(batch.id)}
                    disabled={deletingId === batch.id}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {deletingId === batch.id ? "删除中..." : "删除"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

