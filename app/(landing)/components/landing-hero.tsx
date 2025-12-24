import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";

export function LandingHero() {
  return (
    <section className="relative pt-32 pb-24 md:pt-48 md:pb-32 overflow-hidden">
      <div className="container px-6 mx-auto max-w-7xl relative z-10">
        <div className="flex flex-col items-center text-center animate-fade-in-up">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-white/50 backdrop-blur px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span>
            </span>
            Introducing Personalize Intelligence
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-balance leading-[1.1] mb-8">
            从产品文档到爆款社媒，<br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-black to-zinc-500">
              只需一念之间。
            </span>
          </h1>

          <p className="max-w-[640px] text-lg text-muted-foreground sm:text-xl leading-relaxed mb-10 text-balance">
            上传资料，定义人设，剩下的交给 Personalize。
            让品牌拥有统一而多元的人格，让每一次创作都直抵人心。
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link
              href="/register"
              className="h-12 px-8 rounded-full bg-black text-white font-medium text-base shadow-xl shadow-black/10 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 group"
            >
              开始创作
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="h-12 px-8 rounded-full border border-zinc-200 bg-white text-zinc-900 font-medium text-base hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2">
              <PlayCircle className="w-4 h-4" />
              观看演示
            </button>
          </div>
        </div>
      </div>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-blue-50/50 to-transparent blur-3xl -z-10 opacity-60 pointer-events-none rounded-full"></div>
    </section>
  );
}
