import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate, useLocation } from "react-router-dom";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Measurement {
  measurement_date: string;
  weight: number;
  body_fat_percentage?: number;
  muscle_mass?: number;
  water_percentage?: number;
  notes?: any;
}

const MetricsEvolution = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const measurements = (location.state?.measurements || []) as Measurement[];

  const chartData = measurements
    .slice()
    .reverse()
    .map(m => {
      const additionalData = typeof m.notes === 'string' ? JSON.parse(m.notes || '{}') : (m.notes || {});
      return {
        date: format(new Date(m.measurement_date), "dd/MM", { locale: ptBR }),
        fullDate: format(new Date(m.measurement_date), "dd/MM/yyyy", { locale: ptBR }),
        peso: m.weight,
        gordura: m.body_fat_percentage,
        musculo: m.muscle_mass,
        agua: m.water_percentage,
        imc: additionalData.bmi,
        visceral: additionalData.visceral_fat,
        tmb: additionalData.basal_metabolic_rate,
        proteina: additionalData.protein_percentage,
        massaOssea: additionalData.bone_mass
      };
    });

  const MetricChart = ({ 
    title, 
    dataKey, 
    color, 
    unit = "",
    description 
  }: { 
    title: string; 
    dataKey: string; 
    color: string; 
    unit?: string;
    description: string;
  }) => (
    <Card className="p-6 animate-fade-in" style={{ 
      background: `linear-gradient(135deg, ${color}08 0%, ${color}03 100%)`,
      borderLeft: `4px solid ${color}`
    }}>
      <div className="mb-4">
        <h3 className="text-xl font-bold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
          <XAxis 
            dataKey="date" 
            className="text-xs" 
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            domain={['auto', 'auto']}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
            labelFormatter={(label) => {
              const item = chartData.find(d => d.date === label);
              return item?.fullDate || label;
            }}
            formatter={(value: any) => [`${value}${unit}`, title]}
          />
          <Area 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color}
            strokeWidth={3}
            fill={`url(#gradient-${dataKey})`}
            dot={{ fill: color, r: 4, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
            activeDot={{ r: 6, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-4 p-3 bg-background/50 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Primeiro registro:</span>
          <span className="font-semibold">
            {chartData[0]?.[dataKey] ? `${chartData[0][dataKey]}${unit}` : '-'}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm mt-2">
          <span className="text-muted-foreground">Último registro:</span>
          <span className="font-semibold">
            {chartData[chartData.length - 1]?.[dataKey] 
              ? `${chartData[chartData.length - 1][dataKey]}${unit}` 
              : '-'}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t">
          <span className="text-muted-foreground">Variação total:</span>
          <span className={`font-bold ${
            chartData[chartData.length - 1]?.[dataKey] > chartData[0]?.[dataKey]
              ? 'text-red-500'
              : 'text-green-500'
          }`}>
            {chartData[0]?.[dataKey] && chartData[chartData.length - 1]?.[dataKey]
              ? `${(chartData[chartData.length - 1][dataKey] - chartData[0][dataKey] > 0 ? '+' : '')}${(chartData[chartData.length - 1][dataKey] - chartData[0][dataKey]).toFixed(1)}${unit}`
              : '-'}
          </span>
        </div>
      </div>
    </Card>
  );

  if (measurements.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5 mr-2" />
            Voltar
          </Button>
          <div className="text-center mt-12">
            <p className="text-muted-foreground">Nenhum dado disponível</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-20">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Evolução das Métricas</h1>
              <p className="text-sm text-muted-foreground">
                Acompanhe sua jornada de transformação
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <MetricChart
          title="Peso Corporal"
          dataKey="peso"
          color="hsl(262, 83%, 58%)"
          unit=" kg"
          description="Evolução do seu peso ao longo do tempo"
        />

        <MetricChart
          title="Percentual de Gordura"
          dataKey="gordura"
          color="hsl(0, 84%, 60%)"
          unit="%"
          description="Acompanhamento da gordura corporal"
        />

        <MetricChart
          title="Massa Muscular"
          dataKey="musculo"
          color="hsl(142, 76%, 36%)"
          unit=" kg"
          description="Ganho e perda de massa magra"
        />

        <MetricChart
          title="Hidratação Corporal"
          dataKey="agua"
          color="hsl(199, 89%, 48%)"
          unit="%"
          description="Nível de água no organismo"
        />

        <MetricChart
          title="Índice de Massa Corporal (IMC)"
          dataKey="imc"
          color="hsl(280, 70%, 55%)"
          unit=""
          description="Relação entre peso e altura"
        />

        <MetricChart
          title="Gordura Visceral"
          dataKey="visceral"
          color="hsl(25, 95%, 53%)"
          unit=""
          description="Gordura acumulada na região abdominal"
        />

        <MetricChart
          title="Taxa Metabólica Basal"
          dataKey="tmb"
          color="hsl(45, 93%, 47%)"
          unit=" kcal"
          description="Calorias gastas em repouso"
        />

        {chartData.some(d => d.proteina) && (
          <MetricChart
            title="Percentual de Proteína"
            dataKey="proteina"
            color="hsl(330, 75%, 50%)"
            unit="%"
            description="Quantidade de proteína no corpo"
          />
        )}

        {chartData.some(d => d.massaOssea) && (
          <MetricChart
            title="Massa Óssea"
            dataKey="massaOssea"
            color="hsl(35, 78%, 45%)"
            unit=" kg"
            description="Densidade óssea corporal"
          />
        )}
      </div>
    </div>
  );
};

export default MetricsEvolution;
