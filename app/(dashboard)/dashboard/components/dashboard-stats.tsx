"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats } from "@/app/actions/dashboard";
import { useEffect, useState } from "react";
import type { DashboardStats } from "@/app/actions/dashboard";
import {
  FileText,
  User,
  FolderKanban,
  File,
  Loader2,
} from "lucide-react";

interface StatCard {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
}

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const result = await getDashboardStats();
      if (result.ok && result.data) {
        setStats(result.data);
      }
      setLoading(false);
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardTitle>
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards: StatCard[] = [
    {
      title: "帖子数",
      value: stats?.postsCount || 0,
      icon: <FileText className="h-4 w-4 text-muted-foreground" />,
      description: "已生成的帖子总数",
    },
    {
      title: "人设数",
      value: stats?.personasCount || 0,
      icon: <User className="h-4 w-4 text-muted-foreground" />,
      description: "已创建的人设数量",
    },
    {
      title: "项目数",
      value: stats?.projectsCount || 0,
      icon: <FolderKanban className="h-4 w-4 text-muted-foreground" />,
      description: "知识库项目数量",
    },
    {
      title: "文档数",
      value: stats?.documentsCount || 0,
      icon: <File className="h-4 w-4 text-muted-foreground" />,
      description: "上传的文档总数",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            {card.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
