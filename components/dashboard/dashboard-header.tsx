import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function DashboardHeader({ displayName }: { displayName: string }) {
  return (
    <header className="mb-8 flex items-center justify-between">
      <div>
        <h2 className="text-3xl font-bold">欢迎回来, {displayName}</h2>
        <p className="mt-1 text-sm text-muted-foreground">今日热点：消费电子展、环保新规发布</p>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <Badge className="absolute right-3 top-3 h-2 w-2 rounded-full bg-destructive p-0" />
        </Button>
        <div className="flex items-center gap-3 border-l pl-4">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
            alt="User"
            className="h-10 w-10 rounded-full border"
          />
          <div className="hidden md:block">
            <p className="text-sm font-bold">Alex Chen</p>
            <p className="text-xs text-muted-foreground">Pro Plan</p>
          </div>
        </div>
      </div>
    </header>
  );
}

