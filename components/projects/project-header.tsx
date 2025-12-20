"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

interface ProjectHeaderProps {
  project: {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  return (
    <div className="space-y-4">
      <Link href="/projects">
        <Button variant="ghost" size="sm">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          返回项目列表
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold">{project.name}</h1>
        <p className="text-muted-foreground mt-1">
          创建于 {new Date(project.createdAt).toLocaleDateString("zh-CN")} ·
          最后更新于 {new Date(project.updatedAt).toLocaleDateString("zh-CN")}
        </p>
      </div>
    </div>
  );
}
