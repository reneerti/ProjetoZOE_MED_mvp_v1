import { Card } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Measurement {
  measurement_date: string;
  weight: number;
  body_fat_percentage?: number;
  muscle_mass?: number;
  water_percentage?: number;
  notes?: any;
}

interface MetricChartsProps {
  measurements: Measurement[];
}

export const MetricCharts = ({ measurements }: MetricChartsProps) => {
  const chartData = measurements
    .slice()
    .reverse()
    .map(m => {
      const additionalData = typeof m.notes === 'string' ? JSON.parse(m.notes || '{}') : (m.notes || {});
      return {
        date: format(new Date(m.measurement_date), "dd/MM", { locale: ptBR }),
        peso: m.weight,
        gordura: m.body_fat_percentage,
        musculo: m.muscle_mass,
        agua: m.water_percentage,
        imc: additionalData.bmi,
        visceral: additionalData.visceral_fat,
        tmb: additionalData.basal_metabolic_rate
      };
    });

  const ChartWrapper = ({ children, title }: { children: React.ReactElement; title: string }) => (
    <Card className="p-6">
      <h4 className="text-sm font-semibold mb-4">{title}</h4>
      <ResponsiveContainer width="100%" height={250}>
        {children}
      </ResponsiveContainer>
    </Card>
  );

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold">Evolução das Métricas</h3>
      
      <Tabs defaultValue="composicao" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="composicao">Composição Corporal</TabsTrigger>
          <TabsTrigger value="metabolismo">Metabolismo</TabsTrigger>
          <TabsTrigger value="geral">Visão Geral</TabsTrigger>
        </TabsList>

        <TabsContent value="composicao" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ChartWrapper title="Peso (kg)">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} className="text-xs" />
                <Tooltip />
                <Line type="monotone" dataKey="peso" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ChartWrapper>

            <ChartWrapper title="Gordura Corporal (%)">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Line type="monotone" dataKey="gordura" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ChartWrapper>

            <ChartWrapper title="Massa Muscular (kg)">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Line type="monotone" dataKey="musculo" stroke="hsl(142 76% 36%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ChartWrapper>

            <ChartWrapper title="Hidratação (%)">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Line type="monotone" dataKey="agua" stroke="hsl(199 89% 48%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ChartWrapper>
          </div>
        </TabsContent>

        <TabsContent value="metabolismo" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ChartWrapper title="IMC">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Line type="monotone" dataKey="imc" stroke="hsl(262 83% 58%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ChartWrapper>

            <ChartWrapper title="Taxa Metabólica Basal (kcal)">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Line type="monotone" dataKey="tmb" stroke="hsl(25 95% 53%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ChartWrapper>

            <ChartWrapper title="Gordura Visceral">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Line type="monotone" dataKey="visceral" stroke="hsl(0 84% 60%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ChartWrapper>
          </div>
        </TabsContent>

        <TabsContent value="geral" className="space-y-4">
          <Card className="p-6">
            <h4 className="text-sm font-semibold mb-4">Todas as Métricas</h4>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="peso" name="Peso" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="gordura" name="Gordura %" stroke="hsl(var(--destructive))" strokeWidth={2} />
                <Line type="monotone" dataKey="musculo" name="Músculo" stroke="hsl(142 76% 36%)" strokeWidth={2} />
                <Line type="monotone" dataKey="agua" name="Água %" stroke="hsl(199 89% 48%)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
