import { Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface HealthScoreCardProps {
  score: number | null;
}

export const HealthScoreCard = ({ score }: HealthScoreCardProps) => {
  const displayScore = score !== null ? Math.round(score) : 0;
  const percentage = score !== null ? (score / 1000) * 100 : 0;

  const getScoreLabel = (score: number) => {
    if (score >= 800) return { label: "Excelente", color: "bg-success/10 text-success border-success/20" };
    if (score >= 600) return { label: "Muito Bom", color: "bg-accent/10 text-accent border-accent/20" };
    if (score >= 400) return { label: "Bom", color: "bg-warning/10 text-warning border-warning/20" };
    if (score >= 200) return { label: "Regular", color: "bg-warning/15 text-warning border-warning/30" };
    return { label: "Necessita Atenção", color: "bg-destructive/10 text-destructive border-destructive/20" };
  };

  const scoreInfo = getScoreLabel(displayScore);

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-muted/30 border-border/50">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
          <Activity className="w-4 h-4 text-accent" />
        </div>
        <h3 className="text-sm font-medium text-muted-foreground">Índice de Saúde</h3>
      </div>

      <div className="flex items-end gap-4 mb-6">
        <div className="text-6xl font-bold text-foreground tracking-tight">
          {displayScore}
        </div>
        <Badge variant="outline" className={`mb-2 ${scoreInfo.color} border`}>
          {scoreInfo.label}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0</span>
          <span>500</span>
          <span>1000</span>
        </div>
        <div className="relative h-3 bg-muted/50 rounded-full overflow-hidden">
          <div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-success/80 via-accent/80 to-success/80 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
        Baseado em seus exames, bioimpedância e histórico de saúde
      </p>
    </Card>
  );
};
