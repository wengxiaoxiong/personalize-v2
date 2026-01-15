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
import { User, FolderKanban, Loader2 } from "lucide-react";
import type { PersonaPostStateApi } from "@/modules/persona-post/usePersonaPostState";
import { useAvatarUrl } from "@/app/(dashboard)/(personas)/hooks/use-avatar-url";
import { getPersonasAction } from "@/app/actions/persona";
import { getProjectsAction } from "@/app/actions/project";

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
  compact?: boolean;
}

// 头像显示组件（用于在循环中使用 hook）
function PersonaAvatar({ avatarUrl }: { avatarUrl: string | null | undefined }) {
  const isObjectKey = avatarUrl && avatarUrl.startsWith("avatars/") && !avatarUrl.startsWith("http");
  const { url: signedAvatarUrl, loading: loadingAvatarUrl } = useAvatarUrl(
    isObjectKey ? avatarUrl : null
  );
  
  const displayAvatarUrl = signedAvatarUrl || (isObjectKey ? null : avatarUrl);

  if (displayAvatarUrl) {
    return (
      <img
        src={displayAvatarUrl}
        alt=""
        className="h-4 w-4 rounded-full"
      />
    );
  }
  
  if (loadingAvatarUrl) {
    return (
      <div className="h-4 w-4 rounded-full border bg-muted flex items-center justify-center">
        <Loader2 className="h-2 w-2 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return null;
}

export function PersonaPostSelectors({ state, compact = false }: PersonaPostSelectorsProps) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // 加载人设列表（使用 Server Action）
      const personasRes = await getPersonasAction();
      if (personasRes.ok && personasRes.data) {
        setPersonas(personasRes.data);
      }

      // 加载项目列表（使用 Server Action）
      const projectsRes = await getProjectsAction();
      if (projectsRes.ok && projectsRes.data) {
        setProjects(projectsRes.data);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  // 获取当前选中的人设
  const selectedPersona = personas.find(p => p.id === state.state.selectedPersonaId);

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-3 animate-in fade-in-50 duration-300">
        {/* 人设选择 */}
        <div className="flex items-center gap-2">
          <Select
            value={state.state.selectedPersonaId || ""}
            onValueChange={state.setSelectedPersonaId}
            disabled={loading}
          >
            <SelectTrigger className="h-9 min-w-[180px] max-w-[280px] bg-transparent transition-all duration-200 hover:bg-muted/30 hover:border-primary/30 focus-visible:border-primary/50">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-colors duration-200" />
                <SelectValue placeholder="选择人设..." className="truncate" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {personas.map((persona) => {
                const isPreset = persona.id?.startsWith("preset-");
                return (
                  <SelectItem 
                    key={persona.id} 
                    value={persona.id}
                    className="transition-colors duration-150 hover:bg-primary/5"
                    textValue={persona.name}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <PersonaAvatar avatarUrl={persona.avatarUrl} />
                      <span className="truncate">{persona.name}</span>
                      {isPreset && (
                        <span className="text-[10px] text-muted-foreground shrink-0">(预设)</span>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* 项目选择（知识库） */}
        <div className="flex items-center gap-2">
          <Select
            value={state.state.selectedProjectId || "none"}
            onValueChange={(value) => state.setSelectedProjectId(value === "none" ? null : value)}
            disabled={loading}
          >
            <SelectTrigger className="h-9 w-[180px] bg-transparent transition-all duration-200 hover:bg-muted/30 hover:border-primary/30 focus-visible:border-primary/50">
              <div className="flex items-center gap-2 truncate">
                <FolderKanban className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-colors duration-200 group-hover:text-primary" />
                <SelectValue placeholder="项目知识库..." />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="transition-colors duration-150 hover:bg-primary/5">
                不使用知识库
              </SelectItem>
              {projects.map((project) => (
                <SelectItem 
                  key={project.id} 
                  value={project.id}
                  className="transition-colors duration-150 hover:bg-primary/5"
                >
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 平台选择 */}
        <div className="flex items-center gap-2">
          <Select
            value={state.state.platform}
            onValueChange={(value: "xiaohongshu" | "weibo" | "other") => state.setPlatform(value)}
          >
            <SelectTrigger className="h-9 w-[120px] bg-transparent transition-all duration-200 hover:bg-muted/30 hover:border-primary/30 focus-visible:border-primary/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="xiaohongshu" className="transition-colors duration-150 hover:bg-primary/5">
                小红书
              </SelectItem>
              <SelectItem value="weibo" className="transition-colors duration-150 hover:bg-primary/5">
                微博
              </SelectItem>
              <SelectItem value="other" className="transition-colors duration-150 hover:bg-primary/5">
                其他
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
      {/* 人设选择 */}
      <Card className="transition-all duration-300 hover:shadow-md border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
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
              <SelectTrigger 
                id="persona-select"
                className="bg-transparent transition-all duration-200 hover:bg-muted/30 hover:border-primary/50 focus-visible:border-primary/50"
              >
                <SelectValue placeholder="选择一个人设..." />
              </SelectTrigger>
              <SelectContent>
                {personas.map((persona) => {
                  const isPreset = persona.id?.startsWith("preset-");
                  return (
                    <SelectItem 
                      key={persona.id} 
                      value={persona.id}
                      className="transition-colors duration-150 hover:bg-primary/5"
                    >
                      <div className="flex items-center gap-2">
                        <PersonaAvatar avatarUrl={persona.avatarUrl} />
                        <span>{persona.name}</span>
                        {isPreset && (
                          <span className="text-[10px] text-muted-foreground ml-1">(预设)</span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {state.state.selectedPersonaId && (
              <p className="text-xs text-muted-foreground animate-in fade-in-50 slide-in-from-top-1 duration-300">
                已选择人设，生成的帖子将基于该人设的风格
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 项目选择（知识库） */}
      <Card className="transition-all duration-300 hover:shadow-md border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderKanban className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
            项目知识库
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="project-select">项目（可选）</Label>
            <Select
              value={state.state.selectedProjectId || "none"}
              onValueChange={(value) => state.setSelectedProjectId(value === "none" ? null : value)}
              disabled={loading}
            >
              <SelectTrigger 
                id="project-select"
                className="bg-transparent transition-all duration-200 hover:bg-muted/30 hover:border-primary/50 focus-visible:border-primary/50"
              >
                <SelectValue placeholder="选择项目读取知识库..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="transition-colors duration-150 hover:bg-primary/5">
                  不使用知识库
                </SelectItem>
                {projects.map((project) => (
                  <SelectItem 
                    key={project.id} 
                    value={project.id}
                    className="transition-colors duration-150 hover:bg-primary/5"
                  >
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state.state.selectedProjectId && state.state.selectedProjectId !== "none" && (
              <div className="mt-2 animate-in fade-in-50 slide-in-from-top-1 duration-300">
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
      <Card className="transition-all duration-300 hover:shadow-md border-border/50">
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
              <SelectTrigger 
                id="platform-select"
                className="bg-transparent transition-all duration-200 hover:bg-muted/30 hover:border-primary/50 focus-visible:border-primary/50"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xiaohongshu" className="transition-colors duration-150 hover:bg-primary/5">
                  小红书
                </SelectItem>
                <SelectItem value="weibo" className="transition-colors duration-150 hover:bg-primary/5">
                  微博
                </SelectItem>
                <SelectItem value="other" className="transition-colors duration-150 hover:bg-primary/5">
                  其他
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
