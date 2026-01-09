"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "./utils";
import type { ActionState } from "./types";

export interface DashboardStats {
  postsCount: number;
  personasCount: number;
  projectsCount: number;
  documentsCount: number;
}

export interface TimelineDataPoint {
  date: string;
  count: number;
}

export async function getDashboardStats(): Promise<ActionState<DashboardStats>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "未登录" };
    }

    const [postsCount, personasCount, projectsCount, documentsCount] =
      await Promise.all([
        prisma.personaPost.count({
          where: { persona: { userId: user.id } },
        }),
        prisma.persona.count({
          where: { userId: user.id },
        }),
        prisma.project.count({
          where: { userId: user.id },
        }),
        prisma.projectAsset.count({
          where: { project: { userId: user.id } },
        }),
      ]);

    return {
      ok: true,
      message: "获取成功",
      data: {
        postsCount,
        personasCount,
        projectsCount,
        documentsCount,
      },
    };
  } catch (error) {
    console.error("Failed to get dashboard stats:", error);
    return { ok: false, message: "获取统计数据失败" };
  }
}

export async function getPostsTimeline(
  days: number = 30
): Promise<ActionState<TimelineDataPoint[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "未登录" };
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const posts = await prisma.personaPost.findMany({
      where: {
        persona: { userId: user.id },
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Group posts by date
    const timelineMap = new Map<string, number>();

    // Initialize all dates with 0
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toISOString().split("T")[0];
      timelineMap.set(dateStr, 0);
    }

    // Count posts per date
    posts.forEach((post) => {
      const dateStr = post.createdAt.toISOString().split("T")[0];
      timelineMap.set(dateStr, (timelineMap.get(dateStr) || 0) + 1);
    });

    const timeline = Array.from(timelineMap.entries()).map(
      ([date, count]) => ({
        date,
        count,
      })
    );

    return {
      ok: true,
      message: "获取成功",
      data: timeline,
    };
  } catch (error) {
    console.error("Failed to get posts timeline:", error);
    return { ok: false, message: "获取时间线数据失败" };
  }
}
