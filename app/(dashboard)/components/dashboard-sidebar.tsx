"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Home, PenLine, Sparkles, ChevronLeft, ChevronRight, LogOut, Settings, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/components/providers/dashboard-provider";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  { href: "/personas", label: "人设库", icon: MaskIcon },
  { href: "/persona-posts", label: "帖子生成", icon: PenLine },
  { href: "/projects", label: "项目管理", icon: FolderKanban },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, setSidebarCollapsed, user } = useDashboard();

  return (
    <aside
      className={cn(
        "fixed z-20 flex h-full flex-col justify-between border-r bg-background transition-all duration-300",
        "w-20",
        sidebarCollapsed ? "lg:w-20" : "lg:w-64"
      )}
    >
      <div>
        <div className="flex h-20 items-center justify-between border-b lg:justify-between lg:px-6">
          <div className="flex items-center justify-center lg:justify-start">
            <div className="mr-0 flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground lg:mr-3">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className={cn("hidden text-xl font-bold lg:block", sidebarCollapsed && "lg:hidden")}>Personalize</span>
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-accent"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav
          className={cn(
            "space-y-2 p-2 text-sm font-medium lg:p-4",
            sidebarCollapsed && "lg:space-y-3 lg:px-2"
          )}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 transition-colors",
                  sidebarCollapsed ? "lg:justify-center lg:px-2 lg:gap-0" : "lg:px-4",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className={cn("hidden lg:block", sidebarCollapsed && "lg:hidden")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t">
        <Dialog>
          <DialogTrigger
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer w-full transition-colors",
              sidebarCollapsed && "lg:justify-center lg:px-2 lg:gap-0"
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className={cn("hidden lg:block", sidebarCollapsed && "lg:hidden")}>
              <div className="text-sm font-medium">{user.username}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <div className="grid gap-4 py-4">
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium">{user.username}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </div>
              </div>
              <div className="grid gap-2">
                <Link
                  href="/settings"
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <Settings className="h-4 w-4" />
                  <span className="text-sm">设置</span>
                </Link>
                <Link
                  href="/"
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm">退出账号</span>
                </Link>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </aside>
  );
}

