"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbAvailable, getCurrentUser } from "./utils";
import type { ActionState } from "./types";

const projectSchema = z.object({
  name: z.string().min(1, "项目名称不能为空"),
  metadata: z.record(z.string(), z.any()).optional(),
});

export async function createProjectAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    metadata: formData.get("metadata")
      ? JSON.parse(formData.get("metadata") as string)
      : undefined,
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "输入不合法" };
  }

  if (!(await dbAvailable())) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    await prisma.project.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        metadata: parsed.data.metadata || {},
      },
    });

    revalidatePath("/projects");
    return { ok: true, message: "项目已创建" };
  } catch (error) {
    console.error("Create project failed", error);
    return { ok: false, message: "创建项目失败，请稍后再试" };
  }
}

export async function getProjects() {
  if (!(await dbAvailable())) {
    return [];
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        assets: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
      },
    });

    return projects;
  } catch (error) {
    console.error("Failed to get projects", error);
    return [];
  }
}

export async function getProjectById(projectId: string) {
  if (!(await dbAvailable())) {
    return null;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
      include: {
        assets: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return project;
  } catch (error) {
    console.error("Failed to get project", error);
    return null;
  }
}

export async function updateProjectAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const projectId = formData.get("projectId") as string | null;
  if (!projectId) {
    return { ok: false, message: "项目ID不能为空" };
  }

  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    metadata: formData.get("metadata")
      ? JSON.parse(formData.get("metadata") as string)
      : undefined,
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "输入不合法" };
  }

  if (!(await dbAvailable())) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    // 检查项目是否存在且属于当前用户
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
    });

    if (!existingProject) {
      return { ok: false, message: "项目不存在或无权访问" };
    }

    await prisma.project.update({
      where: { id: projectId },
      data: {
        name: parsed.data.name,
        metadata: parsed.data.metadata,
      },
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);
    return { ok: true, message: "项目已更新" };
  } catch (error) {
    console.error("Update project failed", error);
    return { ok: false, message: "更新项目失败，请稍后再试" };
  }
}

export async function deleteProjectAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const projectId = formData.get("projectId") as string | null;
  if (!projectId) {
    return { ok: false, message: "项目ID不能为空" };
  }

  if (!(await dbAvailable())) {
    return { ok: false, message: "数据库未连接" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, message: "请先登录" };
    }

    // 检查项目是否存在且属于当前用户
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
    });

    if (!existingProject) {
      return { ok: false, message: "项目不存在或无权访问" };
    }

    // 删除项目（级联删除所有资产）
    await prisma.project.delete({
      where: { id: projectId },
    });

    revalidatePath("/projects");
    return { ok: true, message: "项目已删除" };
  } catch (error) {
    console.error("Delete project failed", error);
    return { ok: false, message: "删除项目失败，请稍后再试" };
  }
}

