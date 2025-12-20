import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingNav() {
  return (
    <nav className="fixed z-50 w-full border-b bg-background">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-2xl font-bold tracking-tight">Personalize 2.0</span>
        </div>
        <div className="hidden items-center gap-8 text-muted-foreground md:flex">
          <a href="#features">功能特性</a>
          <a href="#scenarios">使用场景</a>
          <a href="#pricing">价格</a>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild>
            <Link href="/login">登录</Link>
          </Button>
          <Button asChild>
            <Link href="/register">免费试用</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}

