import { cn } from "@/lib/utils";
import { getScoreClass } from "@/lib/score-utils";

interface ScoreBadgeProps {
  score: number | null;
  par: number;
  className?: string;
}

export function ScoreBadge({ score, par, className }: ScoreBadgeProps) {
  const badgeClass = getScoreClass(score, par);
  
  return (
    <div 
      className={cn(
        "flex items-center justify-center font-display font-bold w-10 h-10 text-lg transition-all duration-300",
        badgeClass,
        className
      )}
    >
      {score || "-"}
    </div>
  );
}
