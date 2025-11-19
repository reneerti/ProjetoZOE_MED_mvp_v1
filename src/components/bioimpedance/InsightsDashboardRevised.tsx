import { Card } from "@/components/ui/card";
import { Scale, Droplets, Activity, Flame, TrendingUp, TrendingDown, Heart, Zap, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InsightDetailDialog } from "./InsightDetailDialog";
import { useState } from "react";

interface Measurement {
  measurement_date: string;
  weight: number;
  body_fat_percentage?: number;
  muscle_mass?: number;
  water_percentage?: number;
  notes?: any;
}

interface InsightsDashboardRevisedProps {
  measurements: Measurement[];
}

const metricColors = {
  weight: {
    bg: "from-purple-500/10 to-purple-600/5",
    icon: "text-purple-600 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800",
    trend: { up: "text-purple-600", down: "text-purple-600" }
  },
  fat: {
    bg: "from-red-500/10 to-orange-500/5",
    icon: "text-red-600 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
    trend: { up: "text-red-500", down: "text-green-500" }
  },
  muscle: {
    bg: "from-green-500/10 to-emerald-500/5",
    icon: "text-green-600 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
    trend: { up: "text-green-500", down: "text-red-500" }
  },
  water: {
    bg: "from-blue-500/10 to-cyan-500/5",
    icon: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
    trend: { up: "text-blue-500", down: "text-orange-500" }
  },
  bmi: {
    bg: "from-indigo-500/10 to-violet-500/5",
    icon: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-200 dark:border-indigo-800",
    trend: { up: "text-indigo-600", down: "text-indigo-600" }
  },
  visceral: {
    bg: "from-orange-500/10 to-amber-500/5",
    icon: "text-orange-600 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-800",
    trend: { up: "text-red-500", down: "text-green-500" }
  },
  bmr: {
    bg: "from-yellow-500/10 to-amber-500/5",
    icon: "text-yellow-600 dark:text-yellow-500",
    border: "border-yellow-200 dark:border-yellow-800",
    trend: { up: "text-green-500", down: "text-red-500" }
  },
  metabolic: {
    bg: "from-pink-500/10 to-rose-500/5",
    icon: "text-pink-600 dark:text-pink-400",
    border: "border-pink-200 dark:border-pink-800",
    trend: { up: "text-red-500", down: "text-green-500" }
  }
};

export const InsightsDashboardRevised = ({ measurements }: InsightsDashboardRevisedProps) => {
  const [selectedInsight, setSelectedInsight] = useState<{
    title: string;
    description: string;
    detailedInfo: string;
  } | null>(null);

  if (measurements.length < 2) {
    return (
      <Card className="p-8 bg-gradient-to-br from-muted/30 to-muted/10">
        <div className="text-center">
          <Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            Faça mais medições para ver insights detalhados da sua evolução
          </p>
        </div>
      </Card>
    );
  }

  const latest = measurements[0];
  const previous = measurements[1];
  const oldest = measurements[measurements.length - 1];

  const weightChange = latest.weight - previous.weight;
  const totalWeightChange = latest.weight - oldest.weight;
  
  const fatChange = latest.body_fat_percentage && previous.body_fat_percentage 
    ? latest.body_fat_percentage - previous.body_fat_percentage 
    : null;
  
  const muscleChange = latest.muscle_mass && previous.muscle_mass
    ? latest.muscle_mass - previous.muscle_mass
    : null;

  const waterChange = latest.water_percentage && previous.water_percentage
    ? latest.water_percentage - previous.water_percentage
    : null;

  const parseAdditionalData = (notes: any) => {
    try {
      return typeof notes === 'string' ? JSON.parse(notes || '{}') : (notes || {});
    } catch {
      return {};
    }
  };

  const latestData = parseAdditionalData(latest.notes);
  const previousData = parseAdditionalData(previous.notes);

  const InsightCard = ({ 
    icon: Icon, 
    title, 
    value, 
    change, 
    unit = "",
    colorScheme,
    isHigherBetter = false,
    shortDescription = "",
    detailedInfo = ""
  }: { 
    icon: any; 
    title: string; 
    value: number | string; 
    change: number | null; 
    unit?: string;
    colorScheme: typeof metricColors.weight;
    isHigherBetter?: boolean;
    shortDescription?: string;
    detailedInfo?: string;
  }) => {
    const isPositiveChange = change && (isHigherBetter ? change > 0 : change < 0);
    const TrendIcon = change && Math.abs(change) > 0.1 
      ? (isPositiveChange ? TrendingUp : TrendingDown) 
      : null;

    return (
      <Card 
        className={`p-6 bg-gradient-to-br ${colorScheme.bg} border-2 ${colorScheme.border} hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer`}
        onClick={() => detailedInfo && setSelectedInsight({ title, description: shortDescription, detailedInfo })}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-background/50 ${colorScheme.icon}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 flex items-center gap-2">
                <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
                {shortDescription && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="text-xs">{shortDescription}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight">{value}{unit}</p>
            </div>
          </div>
          {TrendIcon && change && Math.abs(change) > 0.1 && (
            <div className={`flex flex-col items-end gap-1 ml-2 ${isPositiveChange ? colorScheme.trend.up : colorScheme.trend.down}`}>
              <TrendIcon className="h-5 w-5" />
              <span className="text-sm font-bold whitespace-nowrap">
                {change > 0 ? '+' : ''}{change.toFixed(1)}{unit}
              </span>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Dashboard de Insights
        </h3>
        <p className="text-sm text-muted-foreground">
          Comparação com a última medição • {measurements.length} registros
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <InsightCard
          icon={Scale}
          title="Peso Atual"
          value={latest.weight.toFixed(1)}
          change={weightChange}
          unit="kg"
          colorScheme={metricColors.weight}
          isHigherBetter={false}
          shortDescription="Acompanhe sua massa corporal total"
          detailedInfo="O peso corporal é a soma de todos os tecidos do corpo incluindo músculo, gordura, ossos e água. **Variações normais:** 0,5-1kg por dia devido a hidratação e alimentação. **Meta saudável:** Manter peso estável ou perder 0,5-1kg por semana de forma gradual."
        />

        {latest.body_fat_percentage && (
          <InsightCard
            icon={Activity}
            title="Gordura Corporal"
            value={latest.body_fat_percentage.toFixed(1)}
            change={fatChange}
            unit="%"
            colorScheme={metricColors.fat}
            isHigherBetter={false}
            shortDescription="Percentual de gordura no corpo"
            detailedInfo="A gordura corporal inclui gordura essencial e de reserva. **Homens:** Ideal 10-20%, Atletas 6-13%. **Mulheres:** Ideal 18-28%, Atletas 14-20%. **Atenção:** Menos de 5% (homens) ou 12% (mulheres) pode ser prejudicial à saúde."
          />
        )}

        {latest.muscle_mass && (
          <InsightCard
            icon={Heart}
            title="Massa Muscular"
            value={latest.muscle_mass.toFixed(1)}
            change={muscleChange}
            unit="kg"
            colorScheme={metricColors.muscle}
            isHigherBetter={true}
            shortDescription="Quantidade de músculo no corpo"
            detailedInfo="A massa muscular é crucial para metabolismo, força e saúde óssea. **Benefícios:** Maior metabolismo basal, melhor controle glicêmico, proteção articular. **Como aumentar:** Treino de força 2-3x/semana + proteína adequada (1,6-2g/kg)."
          />
        )}

        {latest.water_percentage && (
          <InsightCard
            icon={Droplets}
            title="Hidratação"
            value={latest.water_percentage.toFixed(1)}
            change={waterChange}
            unit="%"
            colorScheme={metricColors.water}
            isHigherBetter={false}
            shortDescription="Nível de água no organismo"
            detailedInfo="A água corporal é vital para todas as funções metabólicas. **Ideal:** 55-65% para adultos. **Sinais de desidratação:** <50%. **Fatores:** Exercício, clima quente e alimentação afetam os níveis. **Dica:** Beba 35ml/kg de peso ao dia."
          />
        )}

        {latestData.bmi && (
          <InsightCard
            icon={Scale}
            title="IMC"
            value={latestData.bmi.toFixed(1)}
            change={previousData.bmi ? latestData.bmi - previousData.bmi : null}
            colorScheme={metricColors.bmi}
            isHigherBetter={false}
            shortDescription="Índice de Massa Corporal"
            detailedInfo="O IMC relaciona peso e altura. **Classificação:** Abaixo 18,5 = baixo peso, 18,5-24,9 = normal, 25-29,9 = sobrepeso, acima 30 = obesidade. **Limitação:** Não diferencia músculo de gordura. Atletas podem ter IMC alto mas baixa gordura."
          />
        )}

        {latestData.visceral_fat && (
          <InsightCard
            icon={Activity}
            title="Gordura Visceral"
            value={latestData.visceral_fat}
            change={previousData.visceral_fat ? latestData.visceral_fat - previousData.visceral_fat : null}
            colorScheme={metricColors.visceral}
            isHigherBetter={false}
            shortDescription="Gordura ao redor dos órgãos"
            detailedInfo="Gordura visceral envolve órgãos internos e é mais perigosa que subcutânea. **Ideal:** 1-12, **Atenção:** 13-59, **Alto risco:** >60. **Riscos:** Diabetes tipo 2, doenças cardíacas, inflamação. **Como reduzir:** Exercício aeróbico, redução de carboidratos refinados."
          />
        )}

        {latestData.basal_metabolic_rate && (
          <InsightCard
            icon={Flame}
            title="TMB"
            value={latestData.basal_metabolic_rate}
            change={previousData.basal_metabolic_rate ? latestData.basal_metabolic_rate - previousData.basal_metabolic_rate : null}
            unit="kcal"
            colorScheme={metricColors.bmr}
            isHigherBetter={true}
            shortDescription="Gasto calórico em repouso"
            detailedInfo="Taxa Metabólica Basal é a energia que seu corpo gasta em repouso absoluto. **Representa:** 60-75% do gasto calórico diário total. **Fatores:** Massa muscular aumenta TMB. **Aplicação:** Base para cálculo de dieta e déficit/superávit calórico."
          />
        )}

        {latestData.metabolic_age && (
          <InsightCard
            icon={Zap}
            title="Idade Metabólica"
            value={latestData.metabolic_age}
            change={previousData.metabolic_age ? latestData.metabolic_age - previousData.metabolic_age : null}
            unit=" anos"
            colorScheme={metricColors.metabolic}
            isHigherBetter={false}
            shortDescription="Idade do seu metabolismo"
            detailedInfo="Idade metabólica compara seu metabolismo com média da população. **Ideal:** Igual ou menor que sua idade real. **Significa:** Metabolismo mais jovem = melhor composição corporal. **Como melhorar:** Ganho de massa muscular, redução de gordura, exercício regular."
          />
        )}
      </div>

      <Card className="p-6 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 border-2 border-primary/20">
        <h4 className="font-bold mb-4 text-lg">📊 Resumo do Progresso</h4>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-4 bg-background/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Mudança de Peso</p>
            <p className={`text-2xl font-bold ${totalWeightChange < 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalWeightChange > 0 ? '+' : ''}{totalWeightChange.toFixed(1)} kg
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              Desde {new Date(oldest.measurement_date).toLocaleDateString('pt-BR')}
            </p>
          </div>

          <div className="p-4 bg-background/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Total de Medições</p>
            <p className="text-2xl font-bold text-primary">{measurements.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Registros salvos
            </p>
          </div>

          <div className="p-4 bg-background/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Última Medição</p>
            <p className="text-2xl font-bold text-purple-600">
              {Math.floor((Date.now() - new Date(latest.measurement_date).getTime()) / (1000 * 60 * 60 * 24))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              dias atrás
            </p>
          </div>
        </div>
      </Card>

      <InsightDetailDialog
        open={!!selectedInsight}
        onOpenChange={(open) => !open && setSelectedInsight(null)}
        title={selectedInsight?.title || ""}
        description={selectedInsight?.description || ""}
        detailedInfo={selectedInsight?.detailedInfo || ""}
      />
    </div>
  );
};
