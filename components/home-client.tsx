"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useActionState, useMemo, useState, useTransition } from "react";
import { useCompletion } from "@ai-sdk/react";
import {
  ArrowLeft,
  Bell,
  ChevronDown,
  Copy,
  FileText,
  Flame,
  Home,
  Image as ImageIcon,
  Loader2,
  Logs,
  PenLine,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";

import {
  ActionState,
  DashboardSnapshot,
  createMaterialAction,
  createPersonaAction,
  recordGenerationAction,
} from "@/app/actions";
import { cn } from "@/lib/utils";

const statusColor: Record<string, string> = {
  草稿: "bg-slate-100 text-slate-800",
  待发布: "bg-amber-100 text-amber-800",
  已发布: "bg-emerald-100 text-emerald-800",
  已过期: "bg-rose-100 text-rose-800",
};

const platforms: { label: string; value: string; accent: string }[] = [
  { label: "小红书", value: "XiaoHongShu", accent: "text-rose-500" },
  { label: "Instagram", value: "Instagram", accent: "text-pink-500" },
  { label: "LinkedIn", value: "LinkedIn", accent: "text-blue-700" },
  { label: "Twitter/X", value: "Twitter/X", accent: "text-slate-700" },
];

const featureSteps = [
  {
    icon: <FileText className="h-6 w-6" />,
    title: "素材解析",
    desc: "支持 PDF、PPT、白底图。自动提取卖点、规格参数，OCR 识别包装文字。",
    accent: "text-slate-900",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "人设匹配",
    desc: "选择“美妆KOL”、“科技测评师”或自定义人设。基于人格维度调整语气与关注点。",
    accent: "text-orange-500",
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    title: "全平台生成",
    desc: "一键输出小红书图文、IG 贴文、LinkedIn 专业稿。包含自动配图与排版。",
    accent: "text-green-500",
  },
];

const pricing = [
  {
    title: "Free",
    price: "¥0",
    highlight: false,
    items: ["5次生成/月", "2个基础人设模板"],
    cta: "免费开始",
  },
  {
    title: "Pro",
    price: "¥79",
    highlight: true,
    items: ["100次生成/月", "5个自定义人设", "全部人设模板库", "图片AI增强"],
    cta: "立即订阅",
  },
  {
    title: "Business",
    price: "¥199",
    highlight: false,
    items: ["无限次生成", "无限自定义人设", "团队协作功能"],
    cta: "联系销售",
  },
];

export function HomeClient({
  snapshot,
  mode = "landing",
  userEmail,
}: {
  snapshot: DashboardSnapshot;
  mode?: "landing" | "app";
  userEmail?: string | null;
}) {
  const [personaState, personaFormAction] = useActionState<ActionState, FormData>(
    createPersonaAction,
    { ok: false, message: "" },
  );
  const [materialState, materialFormAction] = useActionState<ActionState, FormData>(
    createMaterialAction,
    { ok: false, message: "" },
  );
  const [generationState, generationFormAction] = useActionState<ActionState, FormData>(
    recordGenerationAction,
    { ok: false, message: "" },
  );
  const [selectedPlatform, setSelectedPlatform] = useState(platforms[0]);
  const [topic, setTopic] = useState("环保随行杯发布");
  const [tone, setTone] = useState("温暖、口语化");
  const [personaName, setPersonaName] = useState(snapshot.personas[0]?.name || "Tech Bob");
  const [saving, startSaving] = useTransition();
  const displayName = userEmail || "TechMaster";

  const { completion, complete, isLoading, stop, setCompletion, error } = useCompletion({
    api: "/api/generate",
    body: {
      persona: personaName,
      platform: selectedPlatform.value,
      tone,
    },
    experimental_throttle: 50,
    onFinish: async (_prompt, text) => {
      startSaving(() =>
        generationFormAction(
          new FormData(
            Object.entries({
              title: `${selectedPlatform.label} · ${topic}`,
              persona: personaName,
              platform: selectedPlatform.value,
              content: text.trim(),
            }).reduce((fd, [key, value]) => {
              fd.append(key, value);
              return fd;
            }, new FormData()),
          ),
        ),
      );
    },
  });

  const landingHidden = mode !== "landing";
  const appHidden = mode !== "app";

  const personaChips = useMemo(
    () =>
      snapshot.personas.length > 0
        ? snapshot.personas.map((p) => ({ label: p.name, value: p.name }))
        : [{ label: personaName, value: personaName }],
    [personaName, snapshot.personas],
  );

  return (
    <div className="min-h-screen bg-[#F0F9FF] text-slate-900">
      <div
        id="landing-page"
        className={cn(
          "flex min-h-screen flex-col transition-opacity duration-500",
          landingHidden ? "pointer-events-none opacity-0" : "opacity-100",
        )}
      >
        <nav className="fixed z-50 w-full border-b border-white/50 bg-white/70 backdrop-blur-xl">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-xl text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="text-2xl font-bold tracking-tight">Personalize 2.0</span>
            </div>
            <div className="hidden items-center gap-8 text-slate-500 md:flex">
              <a href="#features" className="transition hover:text-sky-500">
                功能特性
              </a>
              <a href="#scenarios" className="transition hover:text-sky-500">
                使用场景
              </a>
              <a href="#pricing" className="transition hover:text-sky-500">
                价格
              </a>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-medium text-white shadow-md shadow-sky-200 transition hover:bg-sky-600"
              >
                免费试用
              </Link>
            </div>
          </div>
        </nav>

        <section className="px-6 pb-20 pt-40">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white px-4 py-2 text-sm font-medium text-sky-600 shadow-sm animate-bounce">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              全平台 AI 营销内容生成
            </div>
            <h1 className="mt-6 text-5xl font-bold leading-tight md:text-7xl">
              从产品文档到 <span className="italic text-sky-500">爆款</span> 社媒内容，
              <br />
              只需 <span className="relative inline-block">一键生成</span>
            </h1>
            <p className="mt-6 text-xl leading-relaxed text-slate-600">
              上传 PDF 或产品图，选择“KOS人设”，自动生成小红书、Instagram、LinkedIn 等多平台原生内容。让品牌拥有统一而多元的人格。
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="w-full rounded-xl bg-sky-500 px-8 py-4 text-lg font-medium text-white shadow-lg shadow-sky-200 transition hover:scale-105 sm:w-auto"
              >
                开始生成内容
              </Link>
              <button className="w-full rounded-xl border border-slate-200 bg-white px-8 py-4 text-lg font-medium text-slate-800 transition hover:bg-slate-50 sm:w-auto">
                观看演示视频
              </button>
            </div>
          </div>

          <div className="group relative mx-auto mt-16 max-w-6xl">
            <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-sky-500 to-orange-400 opacity-30 blur transition duration-1000 group-hover:opacity-60" />
            <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-2xl">
              <div className="space-y-4 text-center">
                <Logs className="mx-auto h-14 w-14 text-slate-200" />
                <p className="text-lg text-slate-500">Dashboard Preview Interface</p>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                <Link
                  href="/dashboard"
                  className="rounded-xl bg-white px-8 py-3 text-base font-bold text-sky-500 shadow-xl transition hover:scale-110"
                >
                  点击进入后台交互原型
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="rounded-t-[3rem] bg-white px-6 py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <h2 className="text-4xl font-bold">核心流程</h2>
              <p className="text-slate-500">三步实现内容自动化</p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {featureSteps.map((step) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-8 transition hover:-translate-y-1 hover:border-sky-300"
                >
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-white text-2xl text-sky-500 shadow-sm">
                    {step.icon}
                  </div>
                  <h3 className="text-2xl font-bold">{step.title}</h3>
                  <p className="mt-3 text-slate-600">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="px-6 py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <h2 className="text-4xl font-bold">简单透明的定价</h2>
            </div>
            <div className="grid items-center gap-8 md:grid-cols-3">
              {pricing.map((plan) => (
                <div
                  key={plan.title}
                  className={cn(
                    "h-fit rounded-2xl border border-slate-200 bg-white p-8",
                    plan.highlight && "scale-105 border-0 bg-sky-500 text-white shadow-xl shadow-sky-200",
                  )}
                >
                  {plan.highlight && (
                    <div className="absolute right-4 top-4 rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white">
                      POPULAR
                    </div>
                  )}
                  <h3 className="text-2xl font-bold">{plan.title}</h3>
                  <div className="my-4 text-4xl font-bold">
                    {plan.price}
                    <span className="text-base font-medium"> /月</span>
                  </div>
                  <ul className={cn("mb-8 space-y-3 text-sm", plan.highlight ? "text-blue-50" : "text-slate-600")}>
                    {plan.items.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-sky-500">
                          ✓
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    className={cn(
                      "w-full rounded-xl border px-6 py-3 text-sm font-medium transition",
                      plan.highlight
                        ? "border-white bg-white text-sky-500 hover:bg-slate-50"
                        : "border-slate-200 hover:bg-slate-50",
                    )}
                  >
                    {plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div
        id="app-page"
        className={cn(
          "min-h-screen bg-[#F8FAFC] transition-opacity duration-500",
          appHidden ? "pointer-events-none opacity-0" : "opacity-100",
        )}
      >
        <aside className="fixed z-20 flex h-full w-20 flex-col justify-between border-r border-slate-200 bg-white transition-all lg:w-64">
          <div>
            <div className="flex h-20 items-center justify-center border-b border-slate-200 lg:justify-start lg:px-6">
              <div className="mr-0 flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white lg:mr-3">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="hidden font-heading text-xl font-bold text-slate-900 lg:block">Personalize</span>
            </div>

            <nav className="space-y-2 p-4 text-sm font-medium text-slate-600">
              <a className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sky-600" href="#">
                <Home className="h-5 w-5" />
                <span className="hidden lg:block">工作台</span>
              </a>
              <a className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-slate-50" href="#">
                <MaskIcon />
                <span className="hidden lg:block">KOS 人设库</span>
              </a>
              <a className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-slate-50" href="#">
                <PenLine className="h-5 w-5" />
                <span className="hidden lg:block">内容生成</span>
              </a>
              <a className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-slate-50" href="#">
                <Upload className="h-5 w-5" />
                <span className="hidden lg:block">素材库</span>
              </a>
            </nav>
          </div>

          <div className="p-4">
            <Link
              href="/"
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-slate-500 transition hover:text-rose-500"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden lg:block">退出</span>
            </Link>
          </div>
        </aside>

        <main className="ml-20 flex-1 p-6 lg:ml-64 lg:p-10">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">欢迎回来, {displayName} 👋</h2>
              <p className="mt-1 text-sm text-slate-500">今日热点：消费电子展、环保新规发布</p>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-sky-500">
                <Bell className="h-5 w-5" />
                <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-rose-500" />
              </button>
              <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                  alt="User"
                  className="h-10 w-10 rounded-full border border-slate-200"
                />
                <div className="hidden md:block">
                  <p className="text-sm font-bold text-slate-900">Alex Chen</p>
                  <p className="text-xs text-slate-500">Pro Plan</p>
                </div>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
            <div className="xl:col-span-8 space-y-8">
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">常用 KOS 人设</h3>
                  <div className="flex gap-2 text-xs">
                    <form action={personaFormAction} className="flex items-center gap-2">
                      <input
                        name="name"
                        required
                        placeholder="新建人设名"
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-sky-300 focus:outline-none"
                      />
                      <input
                        name="domain"
                        required
                        placeholder="领域标签，用逗号分隔"
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-sky-300 focus:outline-none"
                      />
                      <input
                        name="style"
                        required
                        placeholder="表达风格"
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-sky-300 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-sky-500 px-3 py-2 font-semibold text-white shadow hover:bg-sky-600"
                      >
                        + 新建人设
                      </button>
                    </form>
                  </div>
                </div>
                {personaState.message && (
                  <p className={cn("text-xs", personaState.ok ? "text-emerald-600" : "text-rose-500")}>{personaState.message}</p>
                )}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {snapshot.personas.map((persona) => (
                    <div
                      key={persona.name}
                      className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-sky-300 hover:shadow-lg"
                    >
                      <div className="absolute right-3 top-3 rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white">
                        {persona.badge || "模板"}
                      </div>
                      <div className="mb-3 flex items-center gap-3">
                        <img
                          src={
                            persona.avatarUrl ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(persona.name)}`
                          }
                          className="h-12 w-12 rounded-full bg-slate-100"
                          alt={persona.name}
                        />
                        <div>
                          <h4 className="font-bold text-slate-900">{persona.name}</h4>
                          <span className="text-xs text-slate-500">{persona.style}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {persona.domain.map((tag) => (
                          <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span>使用次数：{persona.usage}</span>
                        <span>最近：{persona.lastUsed}</span>
                      </div>
                      <div className="mt-3 hidden items-center justify-end gap-2 text-xs font-semibold text-slate-700 group-hover:flex">
                        <button className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50">编辑</button>
                        <button className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50">复制</button>
                        <button className="rounded-md border border-rose-200 px-2 py-1 text-rose-600 hover:bg-rose-50">删除</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="flex-1">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">近期发布任务</h3>
                  <div className="flex gap-2">
                    <span className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600">全部状态</span>
                    <span className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600">平台筛选</span>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <table className="w-full border-collapse text-left">
                    <thead className="bg-slate-50 text-xs font-medium uppercase text-slate-500">
                      <tr>
                        <th className="px-6 py-4">预览 / 标题</th>
                        <th className="px-6 py-4">关联人设</th>
                        <th className="px-6 py-4">平台</th>
                        <th className="px-6 py-4">状态</th>
                        <th className="px-6 py-4 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {snapshot.posts.map((post) => (
                        <tr key={post.title} className="group transition hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-600">
                                {post.platform === "LinkedIn" ? "PDF" : "IMG"}
                              </div>
                              <span className="font-medium text-slate-900">{post.title}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{post.persona}</td>
                          <td className="px-6 py-4">
                          <span
                            className={cn(
                              "text-sm font-semibold",
                              statusColor[post.status] ? "" : "text-slate-900",
                            )}
                          >
                            {post.platform}
                          </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                statusColor[post.status] || "bg-slate-100 text-slate-800",
                              )}
                            >
                              {post.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="text-slate-500 transition hover:text-sky-500">
                              <Logs className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <div className="xl:col-span-4 space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">快速录入素材</h3>
                <form action={materialFormAction} className="mt-4 space-y-3 text-sm">
                  <input
                    name="name"
                    placeholder="素材名称，如产品卖点白皮书"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-sky-300 focus:outline-none"
                  />
                  <div className="flex gap-3">
                    <select
                      name="type"
                      className="w-1/2 rounded-lg border border-slate-200 px-3 py-2 focus:border-sky-300 focus:outline-none"
                      defaultValue="document"
                    >
                      <option value="document">文档</option>
                      <option value="image">图片</option>
                    </select>
                    <input
                      name="size"
                      placeholder="大小，如 1.2MB"
                      className="w-1/2 rounded-lg border border-slate-200 px-3 py-2 focus:border-sky-300 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Upload className="h-4 w-4" />
                    保存素材信息
                  </button>
                  {materialState.message && (
                    <p className={cn("text-xs", materialState.ok ? "text-emerald-600" : "text-rose-500")}>{materialState.message}</p>
                  )}
                </form>
                <div className="mt-4 space-y-2">
                  {snapshot.materials.map((material) => (
                    <div key={material.name} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        {material.type === "image" ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                        <span>{material.name}</span>
                      </div>
                      <span className="text-slate-400">{material.sizeLabel}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">AI 一键生成</h3>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    useCompletion
                  </span>
                </div>
                <div className="space-y-3 text-sm">
                  <label className="block text-xs font-semibold text-slate-500">选择平台</label>
                  <div className="flex flex-wrap gap-2">
                    {platforms.map((platform) => (
                      <button
                        key={platform.value}
                        onClick={() => setSelectedPlatform(platform)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-semibold transition",
                          selectedPlatform.value === platform.value
                            ? "border-sky-500 bg-sky-50 text-sky-600"
                            : "border-slate-200 text-slate-600 hover:border-slate-300",
                        )}
                      >
                        {platform.label}
                      </button>
                    ))}
                  </div>

                  <label className="block text-xs font-semibold text-slate-500">绑定人设</label>
                  <div className="flex flex-wrap gap-2">
                    {personaChips.map((chip) => (
                      <button
                        key={chip.value}
                        onClick={() => setPersonaName(chip.value)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-semibold transition",
                          personaName === chip.value
                            ? "border-sky-500 bg-sky-50 text-sky-600"
                            : "border-slate-200 text-slate-600 hover:border-slate-300",
                        )}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  <label className="block text-xs font-semibold text-slate-500">主题/卖点</label>
                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-300 focus:outline-none"
                  />

                  <label className="block text-xs font-semibold text-slate-500">语气偏好</label>
                  <input
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-300 focus:outline-none"
                  />

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        setCompletion("");
                        complete(topic, { body: { topic } });
                      }}
                      className="flex-1 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-sky-600"
                      disabled={isLoading}
                    >
                      {isLoading ? "生成中..." : "一键生成文案"}
                    </button>
                    {isLoading && (
                      <button
                        onClick={stop}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        停止
                      </button>
                    )}
                  </div>

                  {error && <p className="text-xs text-rose-500">生成失败：{error.message}</p>}

                  <form action={generationFormAction} className="space-y-2">
                    <input type="hidden" name="title" value={`${selectedPlatform.label} · ${topic}`} />
                    <input type="hidden" name="persona" value={personaName} />
                    <input type="hidden" name="platform" value={selectedPlatform.value} />
                    <textarea
                      name="content"
                      value={completion}
                      onChange={(e) => setCompletion(e.target.value)}
                      className="h-44 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm focus:border-sky-300 focus:outline-none"
                      placeholder="生成内容预览..."
                    />
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                      保存生成结果
                    </button>
                    {generationState.message && (
                      <p className={cn("text-xs", generationState.ok ? "text-emerald-600" : "text-rose-500")}>{generationState.message}</p>
                    )}
                  </form>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">热点 + 发布推荐</h3>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>热点订阅引擎</span>
                    <span>上次更新: 5 分钟前</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
                    <Flame className="h-4 w-4 text-amber-500" />
                    <span>热源: 12 个 · 今日关键词：环保, AI, 极简</span>
                  </div>
                </div>

                {snapshot.recommendations.map((rec) => (
                  <div
                    key={rec.title}
                    className="relative rounded-lg border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition hover:-translate-y-1 hover:border-sky-300"
                  >
                    <div className="absolute -right-2 -top-2 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      HOT
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{rec.title}</h4>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{rec.source} · 产品：{rec.product}</p>
                    <div className="my-2 flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="rounded border border-slate-200 bg-white px-2 py-0.5">{rec.persona}</span>
                      <span className="rounded border border-slate-200 bg-white px-2 py-0.5">{rec.platform}</span>
                      <span className="rounded border border-slate-200 bg-white px-2 py-0.5">匹配度 {rec.score}</span>
                    </div>
                    <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-600 transition hover:bg-sky-50">
                      <Sparkles className="h-4 w-4" /> 一键生成文案
                    </button>
                  </div>
                ))}

                <button className="flex w-full items-center justify-center gap-2 border-t border-dashed border-slate-200 pt-3 text-xs text-slate-500">
                  查看更多推荐 <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function MaskIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3c-3 2-6.5 2.5-9 2.5 0 4 .5 8 4 12 2.5 2.5 5 3.5 5 3.5s2.5-1 5-3.5c3.5-4 4-8 4-12C18.5 5.5 15 5 12 3Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h.01M15 12h.01" />
    </svg>
  );
}
