"use client";

/**
 * Persona Posts Section
 *
 * Dashboard上的帖子快捷入口组件
 */

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PenLine, Plus, ArrowRight } from "lucide-react";

export function PersonaPostsSection() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/persona-posts");
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts?.slice(0, 3) || []); // 只显示最近3个
      }
    } catch (error) {
      console.error("Failed to load posts:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <PenLine className="h-5 w-5" />
          最近的帖子
        </CardTitle>
        <Link href="/persona-posts">
          <Button variant="ghost" size="sm">
            查看全部
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 bg-muted animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8">
            <PenLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">还没有生成任何帖子</p>
            <Link href="/persona-posts">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                开始生成
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">{post.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {post.persona.name}
                      </Badge>
                      {post.status === "published" && (
                        <Badge variant="secondary" className="text-xs">
                          已发布
                        </Badge>
                      )}
                      {post.status === "draft" && (
                        <Badge variant="outline" className="text-xs">
                          草稿
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {posts.length > 0 && (
          <div className="mt-4">
            <Link href="/persona-posts">
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                生成新帖子
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
