"use client";

/**
 * Persona Post Selectors
 *
 * 人设和项目选择组件
 */

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, FolderKanban } from "lucide-react";
import type { PersonaPostStateApi } from "@/modules/persona-post/usePersonaPostState";

interface Persona {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface Project {
  id: string;
  name: string;
}

export interface PersonaPostSelectorsProps {
  state: PersonaPostStateApi;
}

export function PersonaPostSelectors({ state }: PersonaPostSelectorsProps) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // 加载人设列表
      const personasRes = await fetch("/api/personas");
      if (personasRes.ok) {
        const data = await personasRes.json();
        setPersonas(data.personas || []);
      }

      // 加载项目列表
      const projectsRes = await fetch("/api/projects");
      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 人设选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            选择人设
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="persona-select">人设</Label>
            <Select
              value={state.state.selectedPersonaId || ""}
              onValueChange={state.setSelectedPersonaId}
              disabled={loading}
            >
              <SelectTrigger id="persona-select">
                <SelectValue placeholder="选择一个人设..." />
              </SelectTrigger>
              <SelectContent>
                {personas.map((persona) => (
                  <SelectItem key={persona.id} value={persona.id}>
                    <div className="flex items-center gap-2">
                      {persona.avatarUrl && (
                        <img
                          src={persona.avatarUrl}
                          alt={persona.name}
                          className="h-4 w-4 rounded-full"
                        />
                      )}
                      <span>{persona.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state.state.selectedPersonaId && (
              <p className="text-xs text-muted-foreground">
                已选择人设，生成的帖子将基于该人设的风格
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 项目选择（知识库） */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderKanban className="h-4 w-4" />
            项目知识库
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="project-select">项目（可选）</Label>
            <Select
              value={state.state.selectedProjectId || ""}
              onValueChange={state.setSelectedProjectId}
              disabled={loading}
            >
              <SelectTrigger id="project-select">
                <SelectValue placeholder="选择项目读取知识库..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">不使用知识库</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state.state.selectedProjectId && (
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs">
                  已关联知识库
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  AI将基于项目知识库生成更相关的内容
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 平台选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">目标平台</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="platform-select">平台</Label>
            <Select
              value={state.state.platform}
              onValueChange={(value: "xiaohongshu" | "weibo" | "other") => state.setPlatform(value)}
            >
              <SelectTrigger id="platform-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xiaohongshu">小红书</SelectItem>
                <SelectItem value="weibo">微博</SelectItem>
                <SelectItem value="other">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
