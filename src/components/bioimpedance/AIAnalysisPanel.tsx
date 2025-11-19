import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, Trophy, Lightbulb } from "lucide-react";

interface AIAnalysisPanelProps {
  analysis: any;
}

export const AIAnalysisPanel = ({ analysis }: AIAnalysisPanelProps) => {
  if (!analysis) return null;

  const renderSection = (title: string, content: string, icon: React.ReactNode, bgColor: string) => (
    <Card className={`p-4 ${bgColor} border-2`}>
      <div className="flex items-start gap-3">
        <div className="mt-1">{icon}</div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold mb-2">{title}</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-line break-words">{content}</p>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-bold">Análise Inteligente por IA</h3>
        </div>
        <Badge variant="secondary" className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-200 dark:border-purple-800">
          Gemini 2.5 Pro
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {analysis.trends && renderSection(
          "Tendências Identificadas",
          analysis.trends,
          <TrendingUp className="h-5 w-5 text-blue-500" />,
          "bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-200 dark:border-blue-800"
        )}

        {analysis.comparisons && renderSection(
          "Comparação com Medições Anteriores",
          analysis.comparisons,
          <TrendingDown className="h-5 w-5 text-purple-500" />,
          "bg-gradient-to-br from-purple-500/10 to-pink-500/5 border-purple-200 dark:border-purple-800"
        )}

        {analysis.attention_points && renderSection(
          "Pontos de Atenção",
          analysis.attention_points,
          <AlertCircle className="h-5 w-5 text-orange-500" />,
          "bg-gradient-to-br from-orange-500/10 to-amber-500/5 border-orange-200 dark:border-orange-800"
        )}

        {analysis.achievements && renderSection(
          "Conquistas e Progressos",
          analysis.achievements,
          <Trophy className="h-5 w-5 text-yellow-500" />,
          "bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border-yellow-200 dark:border-yellow-800"
        )}
      </div>

      {analysis.suggestions && (
        <Card className="p-6 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-teal-500/5 border-2 border-green-200 dark:border-green-800">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
              <Lightbulb className="h-4 w-4 text-white" />
            </div>
            Sugestões Personalizadas
          </h4>
          <div className="space-y-2">
            {analysis.suggestions.split('\n').map((suggestion: string, index: number) => (
              suggestion.trim() && (
                <div key={index} className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                  <p className="text-sm flex-1 break-words">{suggestion.trim()}</p>
                </div>
              )
            ))}
          </div>
        </Card>
      )}

      {analysis.summary && (
        <Card className="p-6 bg-gradient-to-br from-indigo-500/10 to-violet-500/5 border-2 border-indigo-200 dark:border-indigo-800">
          <h4 className="font-semibold mb-3">Resumo Geral</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-line break-words">{analysis.summary}</p>
        </Card>
      )}
    </div>
  );
};
