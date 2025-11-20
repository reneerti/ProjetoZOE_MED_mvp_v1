import { Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { HealthScoreBreakdownModal } from "./HealthScoreBreakdownModal";

interface HealthScoreCardProps {
  score: number | null;
}

export const HealthScoreCard = ({ score }: HealthScoreCardProps) => {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const displayScore = score !== null ? Math.round(score) : 0;
  const percentage = score !== null ? (score / 1000) * 100 : 0;

  const getScoreLabel = (score: number) => {
    if (score >= 800) return { label: "Excelente", color: "bg-success/5 text-success border-success/10", bgGradient: "from-success/5 to-success/10" };
    if (score >= 600) return { label: "Muito Bom", color: "bg-accent/5 text-accent border-accent/10", bgGradient: "from-accent/5 to-accent/10" };
    if (score >= 400) return { label: "Bom", color: "bg-warning/5 text-warning border-warning/10", bgGradient: "from-warning/5 to-warning/10" };
    if (score >= 200) return { label: "Regular", color: "bg-warning/8 text-warning border-warning/15", bgGradient: "from-warning/8 to-warning/15" };
    return { label: "Necessita Atenção", color: "bg-destructive/5 text-destructive border-destructive/10", bgGradient: "from-destructive/5 to-destructive/10" };
  };

  const scoreInfo = getScoreLabel(displayScore);

  return (
    <>
      <Card 
        className={`p-6 bg-gradient-to-br ${scoreInfo.bgGradient} border-border/50 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02]`}
        onClick={() => setShowBreakdown(true)}
      >
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
        <div className="relative h-3 bg-muted/30 rounded-full overflow-hidden">
          <div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-success/60 via-accent/60 to-success/60 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

        <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
          Baseado em seus exames, bioimpedância e histórico de saúde
        </p>

        <p className="text-xs text-primary mt-2 font-medium">
          Clique para ver detalhamento →
        </p>
      </Card>

      <HealthScoreBreakdownModal 
        open={showBreakdown}
        onOpenChange={setShowBreakdown}
        totalScore={score}
      />
    </>
  );
};
