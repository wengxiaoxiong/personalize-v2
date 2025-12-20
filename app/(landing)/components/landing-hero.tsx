import Link from "next/link";
import { Logs } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function LandingHero() {
  return (
    <section className="px-6 pb-20 pt-40">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium">
          <span className="h-2 w-2 rounded-full bg-primary" />
          全平台 AI 营销内容生成
        </div>
        <h1 className="mt-6 text-5xl font-bold leading-tight md:text-7xl">
          从产品文档到爆款社媒内容，
          <br />
          只需一键生成
        </h1>
        <p className="mt-6 text-xl leading-relaxed text-muted-foreground">
          上传 PDF 或产品图，选择「人设」，自动生成小红书、Instagram、LinkedIn 等多平台原生内容。让品牌拥有统一而多元的人格。
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/register">开始生成内容</Link>
          </Button>
          <Button size="lg" variant="outline">
            观看演示视频
          </Button>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-6xl">
        <Card className="relative flex aspect-[16/9] items-center justify-center overflow-hidden">
          <div className="space-y-4 text-center">
            <Logs className="mx-auto h-14 w-14 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">Dashboard Preview Interface</p>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Button size="lg" asChild>
              <Link href="/dashboard">点击进入后台交互原型</Link>
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
}

