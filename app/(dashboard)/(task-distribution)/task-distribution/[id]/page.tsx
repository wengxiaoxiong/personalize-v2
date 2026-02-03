"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardHeader } from "@/app/(dashboard)/components/dashboard-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, FileText, CheckCircle2, Clock, Lock, ImageIcon } from "lucide-react";
import { getTaskBatchById } from "@/app/actions/task-distribution";
import { QRCodeSection } from "../../components/qr-code-section";
import Link from "next/link";

export default function TaskBatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.id as string;

  const [batch, setBatch] = useState<{
    id: string;
    name: string | null;
    createdAt: Date;
    metadata: Record<string, unknown> | null;
    posts: Array<{
      id: string;
      platform: string;
      url: string;
      _count: { comments: number };
    }>;
    stats: {
      totalPosts: number;
      totalComments: number;
      pending: number;
      locked: number;
      completed: number;
      platformStats: Record<string, number>;
    };
    submissions: Array<{
      commentId: string;
      content: string;
      completedAt: Date;
      screenshotKey: string | null;
      post: { platform: string; url: string };
    }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!batchId) return;

    const loadBatch = async () => {
      setIsLoading(true);
      try {
        const result = await getTaskBatchById(batchId);
        if (result.ok && result.data) {
          setBatch(result.data);
        } else {
          alert(result.message || "加载失败");
          router.push("/task-distribution");
        }
      } catch (error) {
        console.error("加载批次详情失败:", error);
        alert("加载失败，请稍后重试");
        router.push("/task-distribution");
      } finally {
        setIsLoading(false);
      }
    };

    void loadBatch();
  }, [batchId, router]);

  if (isLoading) {
    return (
      <>
        <DashboardHeader />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!batch) {
    return (
      <>
        <DashboardHeader />
        <div className="text-center py-12">
          <p className="text-muted-foreground">批次不存在</p>
          <Link href="/task-distribution">
            <Button variant="outline" className="mt-4">
              返回列表
            </Button>
          </Link>
        </div>
      </>
    );
  }

  const completionRate =
    batch.stats.totalComments > 0
      ? ((batch.stats.completed / batch.stats.totalComments) * 100).toFixed(1)
      : "0";

  return (
    <>
      <DashboardHeader />
      <div className="space-y-6 mt-6">
        {/* 返回按钮 */}
        <div className="flex items-center gap-4">
          <Link href="/task-distribution">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回列表
            </Button>
          </Link>
        </div>

        {/* 批次基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>{batch.name || `批次 ${batch.id.slice(0, 8)}`}</CardTitle>
            <CardDescription>
              创建于 {new Date(batch.createdAt).toLocaleString("zh-CN")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">总帖子数</p>
                <p className="text-2xl font-bold">{batch.stats.totalPosts}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">总评论数</p>
                <p className="text-2xl font-bold">{batch.stats.totalComments}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">完成率</p>
                <p className="text-2xl font-bold">{completionRate}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">平台数</p>
                <p className="text-2xl font-bold">
                  {Object.keys(batch.stats.platformStats).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 任务状态统计 */}
        <Card>
          <CardHeader>
            <CardTitle>任务状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm text-muted-foreground">待处理</p>
                  <p className="text-2xl font-bold">{batch.stats.pending}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                <Lock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <p className="text-sm text-muted-foreground">已锁定</p>
                  <p className="text-2xl font-bold">{batch.stats.locked}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm text-muted-foreground">已完成</p>
                  <p className="text-2xl font-bold">{batch.stats.completed}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 平台统计 */}
        <Card>
          <CardHeader>
            <CardTitle>平台分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(batch.stats.platformStats).map(([platform, count]) => (
                <div key={platform} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span className="font-medium">{platform}</span>
                  <span className="text-sm text-muted-foreground">{count} 个帖子</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 帖子列表 */}
        <Card>
          <CardHeader>
            <CardTitle>帖子列表</CardTitle>
            <CardDescription>共 {batch.posts.length} 个帖子</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {batch.posts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-1 text-xs font-medium rounded bg-primary/10 text-primary">
                        {post.platform}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {post._count.comments} 条评论
                      </span>
                    </div>
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                    >
                      {post.url}
                    </a>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={post.url} target="_blank" rel="noopener noreferrer">
                      <FileText className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 用户提交的截图 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              用户提交的截图
            </CardTitle>
            <CardDescription>
              共 {batch.submissions.length} 条已完成提交，可点击截图查看大图
            </CardDescription>
          </CardHeader>
          <CardContent>
            {batch.submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                暂无用户提交的截图，用户扫码完成任务并上传截图后会显示在此处
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {batch.submissions.map((sub) => (
                  <div
                    key={sub.commentId}
                    className="rounded-lg border bg-card p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-primary/10 text-primary">
                        {sub.post.platform}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(sub.completedAt).toLocaleString("zh-CN")}
                      </span>
                    </div>
                    <p className="text-sm line-clamp-2 text-muted-foreground">
                      {sub.content}
                    </p>
                    <a
                      href={sub.post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline break-all"
                    >
                      {sub.post.url}
                    </a>
                    {sub.screenshotKey ? (
                      (() => {
                        const isKey = sub.screenshotKey.startsWith("task-screenshots/");
                        const imgSrc = isKey
                          ? `/api/task-distribution/screenshot?key=${encodeURIComponent(sub.screenshotKey)}`
                          : sub.screenshotKey;
                        const openUrl = isKey
                          ? `/api/task-distribution/screenshot?key=${encodeURIComponent(sub.screenshotKey)}`
                          : sub.screenshotKey;
                        return (
                          <a
                            href={openUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded overflow-hidden border bg-muted aspect-video"
                          >
                            <img
                              src={imgSrc}
                              alt="用户上传的截图"
                              className="w-full h-full object-contain"
                            />
                          </a>
                        );
                      })()
                    ) : (
                      <div className="flex items-center justify-center rounded border bg-muted aspect-video text-muted-foreground text-sm">
                        无截图
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 二维码生成 */}
        <QRCodeSection batchId={batch.id} platforms={Object.keys(batch.stats.platformStats)} />
      </div>
    </>
  );
}

