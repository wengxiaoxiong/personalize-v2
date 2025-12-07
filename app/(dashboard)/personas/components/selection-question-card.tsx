import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type SelectionQuestion } from "./persona-generator-helpers";

type SelectionQuestionCardProps = {
  question: SelectionQuestion;
  selectedOptions: string[];
  onSelect: (option: string) => void;
};

export function SelectionQuestionCard({
  question,
  selectedOptions,
  onSelect,
}: SelectionQuestionCardProps) {
  return (
    <div className="space-y-2 rounded-lg border bg-muted/50 p-3 shadow-sm">
      <p className="font-medium text-sm text-foreground">{question.title}</p>
      <div className="flex flex-wrap gap-2">
        {question.options.map((option) => {
          const isSelected = selectedOptions.includes(option);
          return (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={isSelected ? "secondary" : "outline"}
              className={cn(
                "rounded-full border px-3 text-xs transition-colors",
                isSelected
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                  : "hover:border-primary/40"
              )}
              onClick={() => onSelect(option)}
            >
              {option}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
