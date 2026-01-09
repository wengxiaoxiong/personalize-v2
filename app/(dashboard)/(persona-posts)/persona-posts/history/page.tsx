"use client";

import React, { useCallback, useEffect, useState, useMemo } from "react";
import { DashboardHeader } from "@/app/(dashboard)/components/dashboard-header";
import { getPersonaPostsAction, deletePersonaPostAction } from "@/app/actions/persona-post";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import type { PersonaPostMetadata } from "@/modules/agent/adapters/persona-post";
import { PersonaPostPreview } from "../../components/persona-post-preview";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PersonaPostRecord {
  id: string;
  title: string;
  content: string;
  status: "draft" | "published" | "archived";
  personaId?: string | null;
  persona?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  metadata?: PersonaPostMetadata | null;
}

export default function PersonaPostsHistoryPage() {
  const [posts, setPosts] = useState<PersonaPostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("all");

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getPersonaPostsAction();
      if (res.posts) {
        setPosts(res.posts as any);
      }
    } catch (err) {
      console.error("Failed to load posts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleDelete = async (id: string) => {
    try {
      await deletePersonaPostAction(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
  };

  // 提取所有唯一的 persona
  const uniquePersonas = useMemo(() => {
    const personaMap = new Map<string, { id: string; name: string; avatarUrl: string | null }>();
    posts.forEach((post) => {
      if (post.persona) {
        personaMap.set(post.persona.id, post.persona);
      }
    });
    return Array.from(personaMap.values());
  }, [posts]);

  const filteredPosts = posts.filter(
    (post) => {
      const matchesSearch =
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPersona =
        selectedPersonaId === "all" ||
        (selectedPersonaId === "none" && !post.persona) ||
        (post.persona?.id === selectedPersonaId);

      return matchesSearch && matchesPersona;
    }
  );

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader />
      
      <div className="flex-1 space-y-6 mt-6 max-w-7xl mx-auto w-full px-4 pb-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/persona-posts">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">历史帖子</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Persona 筛选器 */}
            {uniquePersonas.length > 0 && (
              <Select value={selectedPersonaId} onValueChange={setSelectedPersonaId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="筛选人设" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有人设</SelectItem>
                  <SelectItem value="none">未关联人设</SelectItem>
                  {uniquePersonas.map((persona) => (
                    <SelectItem key={persona.id} value={persona.id}>
                      {persona.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索历史帖子..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border rounded-xl bg-muted/20">
            <p>{searchQuery ? "没有找到匹配的帖子" : "暂无历史记录"}</p>
            {!searchQuery && (
              <Link href="/persona-posts" className="mt-4">
                <Button>去生成第一篇帖子</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <div key={post.id} className="group relative border rounded-xl overflow-hidden hover:shadow-md transition-shadow bg-card">
                <PersonaPostPreview
                  post={{
                    id: post.id,
                    title: post.title,
                    content: post.content,
                    status: post.status,
                    tags: post.metadata?.tags || [],
                    platform: post.metadata?.platform,
                    metadata: post.metadata || {},
                  }}
                  posterUrl={null}
                  generatingPoster={false}
                  persona={post.persona}
                  onDelete={() => handleDelete(post.id)}
                  compactView
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
