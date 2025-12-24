import { HeartHandshake, BrainCircuit, Swords, Lightbulb } from "lucide-react";

export function LandingPhilosophy() {
  return (
    <section id="philosophy" className="py-24 bg-zinc-50/50 border-t border-b border-border/50">
      <div className="container px-6 mx-auto max-w-7xl">
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tighter mb-4">
            不仅是工具，<br className="md:hidden" />
            更是创作伙伴。
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(280px,auto)]">
          <div className="group relative md:col-span-2 overflow-hidden rounded-3xl border bg-white p-8 shadow-sm transition-all hover:shadow-md">
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 group-hover:bg-black group-hover:text-white transition-colors duration-300">
                <HeartHandshake className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight mb-3">一语见心，一念成篇</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Personalize 能听懂您的弦外之音，不放过每一次灵光乍现。在这里，每一个想法都能得到全方位的滋养与支持。我们让
                  AI 拥有了“共情”的能力，让生成的内容不再冰冷。
                </p>
              </div>
            </div>
            <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-gradient-to-br from-zinc-100 to-transparent opacity-50 blur-2xl group-hover:from-zinc-200 transition-all"></div>
          </div>

          <div className="group relative md:row-span-2 overflow-hidden rounded-3xl border bg-black text-white p-8 shadow-sm transition-all hover:shadow-xl">
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 border border-white/10 text-white">
                  <BrainCircuit className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight mb-3">
                  属于 Agent 的<br />
                  记忆宫殿
                </h3>
                <p className="text-zinc-400 leading-relaxed mb-6">
                  自研上下文引擎，无论是万字长文的深度创作，还是多线并行的复杂构思，它都能构建起坚不可摧的思维脉络。
                </p>
              </div>
              <div className="mt-auto pt-6 border-t border-white/10">
                <p className="text-sm text-zinc-500 font-medium">复杂任务从此永不迷失，每一步都恰如其分。</p>
              </div>
            </div>
            <div className="absolute bottom-0 right-0 h-64 w-full bg-gradient-to-t from-zinc-900 to-transparent opacity-50"></div>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border bg-white p-8 shadow-sm transition-all hover:shadow-md">
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 group-hover:bg-black group-hover:text-white transition-colors duration-300">
                <Swords className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight mb-3">并非花拳绣腿</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  话题洞察、受众侧写、场域探针... 20+ 专家 Agent 协同工作，只为将你的想法以最完整、最优质的形态呈现。确保你每一次出手，都直抵杰作水准。
                </p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border bg-white p-8 shadow-sm transition-all hover:shadow-md">
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 group-hover:bg-black group-hover:text-white transition-colors duration-300">
                <Lightbulb className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight mb-3">我们相信 Know-how</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  每一条爆款背后，都有可被遵循的逻辑。我们与 100+ 内容从业者一道，将爆款策略沉淀为 Personalize 的底层智慧。与你同行的，是百位行家的经验。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

