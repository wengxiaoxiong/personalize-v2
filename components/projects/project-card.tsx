"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileTextIcon, MoreVerticalIcon, SparklesIcon, TrashIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteProjectAction } from "@/app/actions";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    metadata: unknown;
    assets: Array<{
      id: string;
      name: string;
      createdAt: Date;
    }>;
  };
}

interface KnowledgeBaseMetadata {
  summary?: string;
  keyPoints?: string[];
  categories?: string[];
  generatedAt?: string;
  documentCount?: number;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const metadata = project.metadata as KnowledgeBaseMetadata | null;
  const hasKnowledgeBase = metadata?.summary && metadata.summary.length > 0;
  const assetCount = project.assets.length;

  async function handleDelete() {
    if (!confirm(`确定要删除项目"${project.name}"吗？这将删除所有关联的文档。`)) {
      return;
    }

    setIsDeleting(true);
    const formData = new FormData();
    formData.append("projectId", project.id);

    const result = await deleteProjectAction({ ok: true, message: "" }, formData);

    if (result.ok) {
      router.refresh();
    } else {
      alert(result.message);
      setIsDeleting(false);
    }
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="line-clamp-1">{project.name}</CardTitle>
            <CardDescription className="mt-1">
              创建于 {new Date(project.createdAt).toLocaleDateString("zh-CN")}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVerticalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/projects/${project.id}`}>查看详情</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive"
              >
                <TrashIcon className="w-4 h-4 mr-2" />
                删除项目
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <FileTextIcon className="w-4 h-4" />
            <span>{assetCount} 个文档</span>
          </div>
          {hasKnowledgeBase && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <SparklesIcon className="w-3 h-3" />
              已生成知识库
            </Badge>
          )}
        </div>

        {/* Knowledge Base Summary */}
        {hasKnowledgeBase && metadata.summary && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {metadata.summary}
          </p>
        )}

        {/* Categories */}
        {hasKnowledgeBase && metadata.categories && metadata.categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {metadata.categories.slice(0, 3).map((category, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {category}
              </Badge>
            ))}
          </div>
        )}

        {/* Action Button */}
        <Link href={`/projects/${project.id}`} className="block">
          <Button variant="outline" className="w-full">
            查看项目
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
