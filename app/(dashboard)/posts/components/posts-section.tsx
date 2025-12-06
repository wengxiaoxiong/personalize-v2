"use client";

import { Logs, PenLine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/providers/dashboard-provider";

export function PostsSection() {
  const { snapshot } = useDashboard();

  return (
    <section className="flex-1">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-bold">近期发布任务</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">全部状态</Button>
          <Button variant="outline" size="sm">平台筛选</Button>
        </div>
      </div>

      {snapshot.posts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <PenLine className="mx-auto h-16 w-16 text-muted-foreground" />
            <h4 className="mt-4 text-lg font-semibold">还没有发布任务</h4>
            <p className="mt-2 text-sm text-muted-foreground">使用 AI 一键生成功能创建您的第一个内容</p>
            <p className="mt-1 text-xs text-muted-foreground">生成的内容将显示在这里</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-hidden">
            <table className="w-full border-collapse text-left">
              <thead className="bg-muted text-xs font-medium uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">预览 / 标题</th>
                  <th className="px-6 py-4">关联人设</th>
                  <th className="px-6 py-4">平台</th>
                  <th className="px-6 py-4">状态</th>
                  <th className="px-6 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {snapshot.posts.map((post) => (
                  <tr key={post.id || post.title} className="hover:bg-muted/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border text-xs">
                          {post.platform === "LinkedIn" ? "PDF" : "IMG"}
                        </div>
                        <span className="font-medium">{post.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{post.persona}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold">{post.platform}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="text-xs font-medium">
                        {post.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon">
                        <Logs className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </section>
  );
}

