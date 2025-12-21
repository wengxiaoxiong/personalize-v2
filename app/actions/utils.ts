"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/constants";

export async function dbAvailable() {
  return Boolean(process.env.DATABASE_URL);
}

export async function getAuthUser() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("auth-user")?.value;
  return authCookie ?? null;
}

export async function getSessionUser() {
  const email = await getAuthUser();
  if (!email) {
    return null;
  }

  if (!(await dbAvailable())) {
    // 如果没有数据库，返回一个默认的用户对象
    return {
      id: DEMO_USER_ID,
      email,
      username: email.split("@")[0], // 使用邮箱前缀作为用户名
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });
    // 如果数据库中没有找到用户，返回 null（表示未登录）
    if (!user) {
      return null;
    }
    return user;
  } catch (error) {
    console.error("Failed to get session user", error);
    return null;
  }
}

export async function getCurrentUser() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !(await dbAvailable())) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
    });
    return user;
  } catch (error) {
    console.error("Failed to get current user", error);
    return null;
  }
}

