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

  if (!(await dbAvailable())) {
    return { ok: false, message: "数据库未连接，无法登录" };
  }

  try {
    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (!user) {
      return { ok: false, message: "邮箱或密码错误" };
    }

    // 验证密码
    const isValid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!isValid) {
      return { ok: false, message: "邮箱或密码错误" };
    }

    // 设置认证 cookie
    const cookieStore = await cookies();
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
    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (existingUser) {
      return { ok: false, message: "该邮箱已被注册" };
    }

    // 检查用户名是否已存在
    const existingUsername = await prisma.user.findUnique({
      where: { username: parsed.data.username },
    });

    if (existingUsername) {
      return { ok: false, message: "该用户名已被使用" };
    }

    // 哈希密码
    const passwordHash = await hashPassword(parsed.data.password);

    // 创建用户
    await prisma.user.create({
      data: {
        email: parsed.data.email,
        username: parsed.data.username,
        passwordHash,
      },
    });

    // 设置认证 cookie
    const cookieStore = await cookies();
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
    return { ok: false, message: "注册失败，请稍后再试" };
  }
}

