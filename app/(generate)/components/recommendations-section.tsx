"use client";

import { Flame, Sparkles, ChevronDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDashboard } from "@/components/providers/dashboard-provider";

export function RecommendationsSection() {
  const { snapshot } = useDashboard();

  return (
    <Card>
      <CardHeader>
        <CardTitle>热点 + 发布推荐</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Card className="bg-muted">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>热点订阅引擎</span>
              <span>上次更新: 5 分钟前</span>
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs">
              <Flame className="h-4 w-4" />
              <span>热源: 12 个 · 今日关键词：环保, AI, 极简</span>
            </div>
          </CardContent>
        </Card>

        {snapshot.recommendations.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <Flame className="mx-auto h-8 w-8 text-muted-foreground" />
              <CardDescription className="mt-2">暂无推荐内容</CardDescription>
              <CardDescription className="mt-1 text-xs">系统会根据热点自动生成推荐</CardDescription>
            </CardContent>
          </Card>
        ) : (
          snapshot.recommendations.map((rec) => (
            <Card key={rec.id || rec.title} className="relative">
              <Badge className="absolute -right-2 -top-2">HOT</Badge>
              <CardContent className="p-4">
                <CardTitle className="text-sm">{rec.title}</CardTitle>
                <CardDescription className="mt-1 line-clamp-2">
                  {rec.source} · 产品：{rec.product}
                </CardDescription>
                <div className="my-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Badge variant="outline" className="text-[11px]">{rec.persona}</Badge>
                  <Badge variant="outline" className="text-[11px]">{rec.platform}</Badge>
                  <Badge variant="outline" className="text-[11px]">匹配度 {rec.score}</Badge>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  <Sparkles className="mr-2 h-4 w-4" />
                  一键生成文案
                </Button>
              </CardContent>
            </Card>
          ))
        )}

        <Button variant="ghost" className="w-full border-t border-dashed">
          查看更多推荐 <ChevronDown className="ml-2 h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
}

