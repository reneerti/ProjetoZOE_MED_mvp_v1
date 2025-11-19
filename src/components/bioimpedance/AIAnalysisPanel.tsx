import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, Trophy } from "lucide-react";

interface AIAnalysisPanelProps {
  analysis: any;
}

export const AIAnalysisPanel = ({ analysis }: AIAnalysisPanelProps) => {
  if (!analysis) return null;

  const renderSection = (title: string, content: string, icon: React.ReactNode) => (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="mt-1">{icon}</div>
        <div className="flex-1">
          <h4 className="font-semibold mb-2">{title}</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{content}</p>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-primary" />
        <h3 className="text-xl font-bold">Análise Inteligente por IA</h3>
        <Badge variant="secondary">Gemini 2.5 Pro</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {analysis.trends && renderSection(
          "Tendências Identificadas",
          analysis.trends,
          <TrendingUp className="h-5 w-5 text-blue-500" />
        )}

        {analysis.comparisons && renderSection(
          "Comparação com Medições Anteriores",
          analysis.comparisons,
          <TrendingDown className="h-5 w-5 text-purple-500" />
        )}

        {analysis.attention_points && renderSection(
          "Pontos de Atenção",
          analysis.attention_points,
          <AlertCircle className="h-5 w-5 text-orange-500" />
        )}

        {analysis.achievements && renderSection(
          "Conquistas e Progressos",
          analysis.achievements,
          <Trophy className="h-5 w-5 text-yellow-500" />
        )}
      </div>

      {analysis.suggestions && (
        <Card className="p-6 bg-primary/5 border-primary/20">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Sugestões Personalizadas
          </h4>
          <div className="space-y-2">
            {analysis.suggestions.split('\n').map((suggestion: string, index: number) => (
              suggestion.trim() && (
                <div key={index} className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <p className="text-sm flex-1">{suggestion.trim()}</p>
                </div>
              )
            ))}
          </div>
        </Card>
      )}

      {analysis.summary && (
        <Card className="p-6">
          <h4 className="font-semibold mb-3">Resumo Geral</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{analysis.summary}</p>
        </Card>
      )}
    </div>
  );
};
