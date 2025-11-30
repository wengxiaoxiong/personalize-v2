import { PersonaSummary } from "@/app/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PersonaCard({ persona }: { persona: PersonaSummary }) {
  return (
    <Card className="relative">
      <CardContent className="p-5">
        <Badge className="absolute right-3 top-3">
          {persona.badge || "模板"}
        </Badge>
        <div className="mb-3 flex items-center gap-3">
          <img
            src={
              persona.avatarUrl ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(persona.name)}`
            }
            className="h-12 w-12 rounded-full border"
            alt={persona.name}
          />
          <div>
            <h4 className="font-bold">{persona.name}</h4>
            <span className="text-xs text-muted-foreground">{persona.style}</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {persona.domain.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[11px]">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>使用次数：{persona.usage}</span>
          <span>最近：{persona.lastUsed}</span>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm">编辑</Button>
          <Button variant="outline" size="sm">复制</Button>
          <Button variant="outline" size="sm">删除</Button>
        </div>
      </CardContent>
    </Card>
  );
}

