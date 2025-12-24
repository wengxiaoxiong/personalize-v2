import { ScanText, Users2, Share2 } from "lucide-react";

export function LandingFeatures() {
  return (
    <section id="features" className="container mx-auto max-w-7xl px-6 py-24">
      <div className="flex flex-col md:flex-row items-start justify-between mb-16 gap-8">
        <div className="max-w-xl">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl mb-4">
            自动化，<br />
            但不失人性化。
          </h2>
          <p className="text-muted-foreground text-lg">
            将繁琐的素材整理交给机器，将创造的灵魂留给自己。
          </p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="space-y-4">
          <div className="aspect-video rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden relative group">
            <ScanText className="w-12 h-12 text-zinc-400 group-hover:text-black group-hover:scale-110 transition-all duration-500" />
            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          <div>
            <h3 className="font-bold text-xl tracking-tight">素材智能解析</h3>
            <p className="text-muted-foreground mt-2">
              支持 PDF、PPT、白底图。自动提取卖点与规格参数，构建专属产品知识库。
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="aspect-video rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden relative group">
            <Users2 className="w-12 h-12 text-zinc-400 group-hover:text-black group-hover:scale-110 transition-all duration-500" />
            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          <div>
            <h3 className="font-bold text-xl tracking-tight">多维人设匹配</h3>
            <p className="text-muted-foreground mt-2">
              美妆 KOL、科技测评师...基于人格维度调整语气与关注点，千人千面。
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="aspect-video rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden relative group">
            <Share2 className="w-12 h-12 text-zinc-400 group-hover:text-black group-hover:scale-110 transition-all duration-500" />
            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          <div>
            <h3 className="font-bold text-xl tracking-tight">全平台原生输出</h3>
            <p className="text-muted-foreground mt-2">
              一键生成小红书图文、IG 贴文、LinkedIn 稿件，自动适配平台风格。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
