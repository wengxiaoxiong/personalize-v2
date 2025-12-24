import Link from "next/link";
import { Sparkles } from "lucide-react";

export function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          Personalize 2.0
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#philosophy" className="hover:text-black transition-colors">
            核心理念
          </a>
          <a href="#features" className="hover:text-black transition-colors">
            功能
          </a>
          <a href="#pricing" className="hover:text-black transition-colors">
            价格
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium hover:underline underline-offset-4">
            登录
          </Link>
          <Link
            href="/register"
            className="inline-flex h-9 items-center justify-center rounded-full bg-black px-5 py-2 text-sm font-medium text-white shadow-lg shadow-black/20 transition-all hover:bg-black/90 hover:scale-105 active:scale-95"
          >
            免费试用
          </Link>
        </div>
      </div>
    </nav>
  );
}
