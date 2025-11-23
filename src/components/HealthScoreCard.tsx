import { Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import type { View } from "@/types/views";

interface HealthScoreCardProps {
  score: number | null;
  onNavigate: (view: View) => void;
}

export const HealthScoreCard = ({ score, onNavigate }: HealthScoreCardProps) => {
  const [cachedScore, setCachedScore] = useState<number | null>(() => {
    const cached = localStorage.getItem('healthScore');
    return cached ? Number(cached) : null;
  });
  
  const [displayScore, setDisplayScore] = useState(cachedScore || 0);

  useEffect(() => {
    if (score !== null) {
      localStorage.setItem('healthScore', score.toString());
      setCachedScore(score);
      setDisplayScore(Math.round(score));
    } else if (cachedScore !== null) {
      setDisplayScore(Math.round(cachedScore));
    }
  }, [score, cachedScore]);

  const percentage = displayScore ? (displayScore / 1000) * 100 : 0;

  const getScoreLabel = (score: number) => {
    if (score >= 800) return { label: "Excelente", color: "bg-success/5 text-success border-success/10", bgGradient: "from-success/5 to-success/10" };
    if (score >= 600) return { label: "Muito Bom", color: "bg-accent/5 text-accent border-accent/10", bgGradient: "from-accent/5 to-accent/10" };
    if (score >= 400) return { label: "Bom", color: "bg-warning/5 text-warning border-warning/10", bgGradient: "from-warning/5 to-warning/10" };
    if (score >= 200) return { label: "Regular", color: "bg-warning/8 text-warning border-warning/15", bgGradient: "from-warning/8 to-warning/15" };
    return { label: "Necessita Atenção", color: "bg-destructive/5 text-destructive border-destructive/10", bgGradient: "from-destructive/5 to-destructive/10" };
  };

  const scoreInfo = getScoreLabel(displayScore);

  return (
    <div className="space-y-3">
      {/* Alertas Críticos Badge */}
      <Card className="p-3 border-2 border-destructive bg-destructive/5 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
            <Activity className="w-4 h-4 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-destructive">🔴 Alertas Críticos Detectados</p>
            <p className="text-[10px] text-muted-foreground truncate">Fígado Gorduroso • Inflamação Alta</p>
          </div>
          <Badge className="bg-destructive text-white text-xs">3</Badge>
        </div>
      </Card>

      {/* Health Score Card */}
      <Card 
        className={`p-6 bg-gradient-to-br ${scoreInfo.bgGradient} border-border/50 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02]`}
        onClick={() => onNavigate("health-dashboard")}
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
          <div className="relative h-3 bg-muted/30 rounded-full overflow-hidden shadow-inner">
            {/* Background glow effect */}
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-300/40 via-cyan-300/40 to-green-400/40 rounded-full transition-all duration-1000 ease-out blur-sm"
              style={{ width: `${percentage}%` }}
            />
            {/* Main progress bar */}
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 via-cyan-400 to-green-500 rounded-full transition-all duration-1000 ease-out shadow-md"
              style={{ 
                width: `${percentage}%`,
                animation: 'shimmer 3s ease-in-out infinite'
              }}
            />
          </div>
        </div>

        {/* Mini gráfico de evolução */}
        <div className="mt-4 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
          <p className="text-[10px] font-semibold text-destructive mb-2">📈 Evolução Marcadores Críticos</p>
          <div className="flex items-end gap-1 h-12">
            <div className="flex-1 bg-warning/30 rounded-t" style={{ height: '40%' }}></div>
            <div className="flex-1 bg-warning/50 rounded-t" style={{ height: '55%' }}></div>
            <div className="flex-1 bg-destructive/70 rounded-t" style={{ height: '75%' }}></div>
            <div className="flex-1 bg-destructive rounded-t" style={{ height: '100%' }}></div>
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
            <span>Dez</span>
            <span>Jan</span>
            <span>Fev</span>
            <span>Mar</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
          Baseado em seus exames, bioimpedância e histórico de saúde
        </p>

        <p className="text-xs text-primary mt-2 font-medium">
          Clique para ver Dashboard Completo →
        </p>
      </Card>
    </div>
  );
};
