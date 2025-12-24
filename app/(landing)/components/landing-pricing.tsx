import { Check } from "lucide-react";

export function LandingPricing() {
  return (
    <section id="pricing" className="py-24 bg-black text-white">
      <div className="container mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">简单透明的定价</h2>
          <p className="text-zinc-400 mt-4">选择最适合您业务阶段的方案</p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {/* Free Plan */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8">
            <h3 className="font-semibold text-lg">Free</h3>
            <div className="mt-4 flex items-baseline text-4xl font-bold">
              ¥0<span className="ml-1 text-base font-normal text-zinc-500">/月</span>
            </div>
            <ul className="mt-8 space-y-4 text-sm text-zinc-400">
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-white" /> 5次生成/月
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-white" /> 2个基础人设模板
              </li>
            </ul>
            <button className="mt-8 w-full rounded-full border border-zinc-700 bg-transparent py-3 text-sm font-medium hover:bg-zinc-800 transition-colors">
              免费开始
            </button>
          </div>

          {/* Pro Plan */}
          <div className="relative rounded-3xl border border-white bg-white text-black p-8 scale-105 shadow-2xl shadow-white/10">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-xs font-bold px-3 py-1 rounded-full border border-zinc-700">
              MOST POPULAR
            </div>
            <h3 className="font-semibold text-lg">Pro</h3>
            <div className="mt-4 flex items-baseline text-4xl font-bold">
              ¥79<span className="ml-1 text-base font-normal text-zinc-500">/月</span>
            </div>
            <ul className="mt-8 space-y-4 text-sm">
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-black" /> 100次生成/月
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-black" /> 5个自定义人设
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-black" /> 图片 AI 增强
              </li>
            </ul>
            <button className="mt-8 w-full rounded-full bg-black text-white py-3 text-sm font-medium hover:bg-zinc-800 transition-colors">
              立即订阅
            </button>
          </div>

          {/* Business Plan */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8">
            <h3 className="font-semibold text-lg">Business</h3>
            <div className="mt-4 flex items-baseline text-4xl font-bold">
              ¥2xxx<span className="ml-1 text-base font-normal text-zinc-500">/月</span>
            </div>
            <ul className="mt-8 space-y-4 text-sm text-zinc-400">
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-white" /> 无限次生成
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-white" /> 无限自定义人设
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-white" /> 团队协作功能
              </li>
            </ul>
            <button className="mt-8 w-full rounded-full border border-zinc-700 bg-transparent py-3 text-sm font-medium hover:bg-zinc-800 transition-colors">
              联系销售
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
