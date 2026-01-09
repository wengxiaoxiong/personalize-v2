"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { ActionState, loginAction } from "@/app/actions";

const initialState: ActionState = { ok: false, message: "" };

export function LoginForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    loginAction,
    initialState,
  );

  useEffect(() => {
    if (state.ok) {
      router.push("/dashboard");
    }
  }, [state, router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl border p-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <span className="text-2xl font-bold">P</span>
          </div>
          <h1 className="text-3xl font-bold">欢迎回来</h1>
          <p className="mt-2 text-sm text-muted-foreground">登录后进入 Dashboard 体验交互原型</p>
        </div>

        <form action={formAction} className="space-y-5">
          <div>
            <label className="text-sm font-medium">邮箱</label>
            <input
              name="email"
              required
              type="email"
              className="mt-2 w-full rounded-lg border px-4 py-3 text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium">密码</label>
            <input
              name="password"
              required
              minLength={6}
              type="password"
              className="mt-2 w-full rounded-lg border px-4 py-3 text-sm"
              placeholder="至少6位"
            />
          </div>

          {state.message && (
            <p className={state.ok ? "text-sm text-emerald-600" : "text-sm text-destructive"}>{state.message}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-70"
          >
            {pending ? "登录中..." : "登录并进入 Dashboard"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm">
          还没有账号？
          <Link href="/register" className="ml-1 font-semibold hover:underline">
            去注册
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          <Link href="/" className="hover:underline">
            返回首页
          </Link>
        </p>
      </div>
    </div>
  );
}
