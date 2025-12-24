"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { dbAvailable, getCurrentUser } from "./utils";
import type { ActionState } from "./types";

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(2).optional(),
});

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, message: "请提供有效的邮箱和至少6位密码" };
  }

  try {
    // 并行执行：检查数据库可用性和获取 cookieStore
    const [dbOk, cookieStore] = await Promise.all([
      dbAvailable(),
      cookies(),
    ]);

    if (!dbOk) {
      return { ok: false, message: "数据库未连接，无法登录" };
    }

    // 查找用户（只选择需要的字段，减少数据传输）
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return { ok: false, message: "邮箱或密码错误" };
    }

    // 验证密码（这是必要的安全操作，无法优化）
    const isValid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!isValid) {
      return { ok: false, message: "邮箱或密码错误" };
    }

    // 设置认证 cookie（使用已获取的 cookieStore）
    cookieStore.set("auth-user", parsed.data.email, {
      path: "/",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return { ok: true, message: "登录成功" };
  } catch (error) {
    console.error("Login failed", error);
    return { ok: false, message: "登录失败，请稍后再试" };
  }
}

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    username: formData.get("username"),
  });

  if (!parsed.success) {
    return { ok: false, message: "请填写有效邮箱、用户名和至少6位密码" };
  }

  if (!parsed.data.username) {
    return { ok: false, message: "用户名是必填项" };
  }

  if (!(await dbAvailable())) {
    return { ok: false, message: "数据库未连接，无法注册" };
  }

  try {
    // 并行检查邮箱和用户名是否存在，以及提前准备 cookieStore
    const [existingUser, existingUsername, cookieStore] = await Promise.all([
      prisma.user.findUnique({
        where: { email: parsed.data.email },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { username: parsed.data.username },
        select: { id: true },
      }),
      cookies(), // 提前获取 cookieStore
    ]);

    if (existingUser) {
      return { ok: false, message: "该邮箱已被注册" };
    }

    if (existingUsername) {
      return { ok: false, message: "该用户名已被使用" };
    }

    // 哈希密码（在检查通过后再执行，避免不必要的计算）
    const passwordHash = await hashPassword(parsed.data.password);

    // 创建用户
    await prisma.user.create({
      data: {
        email: parsed.data.email,
        username: parsed.data.username,
        passwordHash,
      },
    });

    // 设置认证 cookie（使用已获取的 cookieStore）
    cookieStore.set("auth-user", parsed.data.email, {
      path: "/",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return { ok: true, message: "注册成功" };
  } catch (error) {
    console.error("Register failed", error);
    // 如果是唯一约束冲突，返回更友好的错误信息
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      if (error.message.includes("email")) {
        return { ok: false, message: "该邮箱已被注册" };
      }
      if (error.message.includes("username")) {
        return { ok: false, message: "该用户名已被使用" };
      }
    }
    return { ok: false, message: "注册失败，请稍后再试" };
  }
}

