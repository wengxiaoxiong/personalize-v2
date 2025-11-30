"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { ActionState, loginAction } from "@/app/actions";

const initialState: ActionState = { ok: false, message: "" };

export default function LoginPage() {
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-white to-amber-50 px-6 py-12">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-10 shadow-2xl shadow-sky-100">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500 text-white">
            <span className="text-2xl font-bold">P</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">欢迎回来</h1>
          <p className="mt-2 text-sm text-slate-500">登录后进入 Dashboard 体验交互原型</p>
        </div>

        <form action={formAction} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-700">邮箱</label>
            <input
              name="email"
              required
              type="email"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-sky-300 focus:outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">密码</label>
            <input
              name="password"
              required
              minLength={6}
              type="password"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-sky-300 focus:outline-none"
              placeholder="至少6位"
            />
          </div>

          {state.message && (
            <p className={state.ok ? "text-sm text-emerald-600" : "text-sm text-rose-500"}>{state.message}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-600 disabled:opacity-70"
          >
            {pending ? "登录中..." : "登录并进入 Dashboard"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          还没有账号？
          <Link href="/register" className="ml-1 font-semibold text-sky-600 hover:underline">
            去注册
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-slate-500">
          <Link href="/" className="hover:text-sky-600 hover:underline">
            返回首页
          </Link>
        </p>
      </div>
    </div>
  );
}
