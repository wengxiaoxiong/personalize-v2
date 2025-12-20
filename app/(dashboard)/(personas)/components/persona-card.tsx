import { PersonaSummary } from "@/app/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PersonaCard({
  persona,
  onEdit,
  onCopy,
  onDelete
}: {
  persona: PersonaSummary;
  onEdit?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
}) {
  return (
    <Card className="relative">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center gap-3">
          {persona.avatarUrl ? (
            <img
              src={persona.avatarUrl}
              className="h-12 w-12 rounded-full border object-cover"
              alt={persona.name}
            />
          ) : (
            <div className="h-12 w-12 rounded-full border bg-muted flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-bold truncate">{persona.name}</h4>
            {persona.alias && (
              <span className="text-xs text-muted-foreground">{persona.alias}</span>
            )}
            {persona.tagline && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{persona.tagline}</p>
            )}
          </div>
        </div>
        {/* 核心特质：领域标签 */}
        {persona.domain.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {persona.domain.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[11px]">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* 风格：Voice + Tone */}
        {(persona.voice || persona.tone) && (
          <div className="mt-3 space-y-1.5 border-t pt-2">
            <div className="text-xs font-medium text-muted-foreground mb-1">风格</div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {persona.voice && (
                <span className="line-clamp-1">Voice: {persona.voice}</span>
              )}
              {persona.tone && (
                <span className="line-clamp-1">Tone: {persona.tone}</span>
              )}
            </div>
          </div>
        )}

        {/* 价值主张：受众 + CTA */}
        {(persona.audience || persona.callToAction) && (
          <div className="mt-3 space-y-1.5 border-t pt-2">
            <div className="text-xs font-medium text-muted-foreground mb-1">价值主张</div>
            {persona.audience && (
              <div className="text-xs text-foreground line-clamp-1">
                <span className="text-muted-foreground">受众:</span> {persona.audience}
              </div>
            )}
            {persona.callToAction && (
              <div className="text-xs text-foreground line-clamp-2">
                <span className="text-muted-foreground">CTA:</span> {persona.callToAction}
              </div>
            )}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>使用次数：{persona.usage}</span>
          <span>最近：{persona.lastUsed}</span>
        </div>
            <div className="mt-3 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            编辑
          </Button>
          <Button variant="outline" size="sm" onClick={onCopy}>
            复制
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete}>
            删除
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

