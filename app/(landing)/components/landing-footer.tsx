import { Sparkles } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="py-12 border-t border-border bg-background">
      <div className="container mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2 font-bold text-xl">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          Personalize 2.0
        </div>
        <p className="text-sm text-muted-foreground">© 2024 Personalize Inc. All rights reserved.</p>
      </div>
    </footer>
  );
}

