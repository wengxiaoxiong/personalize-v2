"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Home, PenLine, Upload, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

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

const navItems = [
  { href: "/dashboard", label: "工作台", icon: Home },
  { href: "/dashboard/personas", label: "KOS 人设库", icon: MaskIcon },
  { href: "/dashboard/generate", label: "内容生成", icon: PenLine },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed z-20 flex h-full w-20 flex-col justify-between border-r bg-background lg:w-64">
      <div>
        <div className="flex h-20 items-center justify-center border-b lg:justify-start lg:px-6">
          <div className="mr-0 flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground lg:mr-3">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="hidden text-xl font-bold lg:block">Personalize</span>
        </div>

        <nav className="space-y-2 p-4 text-sm font-medium">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="hidden lg:block">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4">
        <Link
          href="/"
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="hidden lg:block">退出</span>
        </Link>
      </div>
    </aside>
  );
}

