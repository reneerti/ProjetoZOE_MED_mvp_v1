import { Card } from "@/components/ui/card";
import { Scale, Droplets, Activity, Flame, TrendingUp, TrendingDown } from "lucide-react";

interface Measurement {
  measurement_date: string;
  weight: number;
  body_fat_percentage?: number;
  muscle_mass?: number;
  water_percentage?: number;
  notes?: any;
}

interface InsightsDashboardProps {
  measurements: Measurement[];
}

export const InsightsDashboard = ({ measurements }: InsightsDashboardProps) => {
  if (measurements.length < 2) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center">
          Faça mais medições para ver insights detalhados da sua evolução
        </p>
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
    isHigherBetter = false 
  }: { 
    icon: any; 
    title: string; 
    value: number | string; 
    change: number | null; 
    unit?: string;
    isHigherBetter?: boolean;
  }) => {
    const isPositiveChange = change && (isHigherBetter ? change > 0 : change < 0);
    const TrendIcon = change && Math.abs(change) > 0.1 
      ? (isPositiveChange ? TrendingUp : TrendingDown) 
      : null;

    return (
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
            </div>
            <p className="text-2xl font-bold">{value}{unit}</p>
          </div>
          {TrendIcon && change && Math.abs(change) > 0.1 && (
            <div className={`flex items-center gap-1 ${isPositiveChange ? 'text-green-500' : 'text-red-500'}`}>
              <TrendIcon className="h-4 w-4" />
              <span className="text-sm font-medium">
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
        <h3 className="text-xl font-bold mb-2">Dashboard de Insights</h3>
        <p className="text-sm text-muted-foreground">
          Comparação com a última medição
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <InsightCard
          icon={Scale}
          title="Peso Atual"
          value={latest.weight.toFixed(1)}
          change={weightChange}
          unit="kg"
          isHigherBetter={false}
        />

        {latest.body_fat_percentage && (
          <InsightCard
            icon={Activity}
            title="Gordura Corporal"
            value={latest.body_fat_percentage.toFixed(1)}
            change={fatChange}
            unit="%"
            isHigherBetter={false}
          />
        )}

        {latest.muscle_mass && (
          <InsightCard
            icon={Activity}
            title="Massa Muscular"
            value={latest.muscle_mass.toFixed(1)}
            change={muscleChange}
            unit="kg"
            isHigherBetter={true}
          />
        )}

        {latest.water_percentage && (
          <InsightCard
            icon={Droplets}
            title="Hidratação"
            value={latest.water_percentage.toFixed(1)}
            change={waterChange}
            unit="%"
            isHigherBetter={true}
          />
        )}

        {latestData.bmi && (
          <InsightCard
            icon={Scale}
            title="IMC"
            value={latestData.bmi.toFixed(1)}
            change={previousData.bmi ? latestData.bmi - previousData.bmi : null}
            isHigherBetter={false}
          />
        )}

        {latestData.visceral_fat && (
          <InsightCard
            icon={Activity}
            title="Gordura Visceral"
            value={latestData.visceral_fat}
            change={previousData.visceral_fat ? latestData.visceral_fat - previousData.visceral_fat : null}
            isHigherBetter={false}
          />
        )}

        {latestData.basal_metabolic_rate && (
          <InsightCard
            icon={Flame}
            title="TMB"
            value={latestData.basal_metabolic_rate}
            change={previousData.basal_metabolic_rate ? latestData.basal_metabolic_rate - previousData.basal_metabolic_rate : null}
            unit="kcal"
            isHigherBetter={true}
          />
        )}

        {latestData.metabolic_age && (
          <InsightCard
            icon={Activity}
            title="Idade Metabólica"
            value={latestData.metabolic_age}
            change={previousData.metabolic_age ? latestData.metabolic_age - previousData.metabolic_age : null}
            unit=" anos"
            isHigherBetter={false}
          />
        )}
      </div>

      <Card className="p-6 bg-muted/50">
        <h4 className="font-semibold mb-3">Progresso Total</h4>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Mudança de Peso</p>
            <p className={`text-2xl font-bold ${totalWeightChange < 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalWeightChange > 0 ? '+' : ''}{totalWeightChange.toFixed(1)} kg
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Desde {new Date(oldest.measurement_date).toLocaleDateString('pt-BR')}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Total de Medições</p>
            <p className="text-2xl font-bold">{measurements.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Registros salvos
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Última Medição</p>
            <p className="text-2xl font-bold">
              {Math.floor((Date.now() - new Date(latest.measurement_date).getTime()) / (1000 * 60 * 60 * 24))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              dias atrás
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
