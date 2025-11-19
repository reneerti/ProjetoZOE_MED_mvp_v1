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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-bold">Preview das Métricas</h3>
          <p className="text-sm text-muted-foreground">
            Visualização rápida • Veja a evolução completa clicando no botão acima
          </p>
        </div>
      </div>
      
      <Tabs defaultValue="composicao" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-muted/50">
          <TabsTrigger value="composicao" className="data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300">
            Composição
          </TabsTrigger>
          <TabsTrigger value="metabolismo" className="data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-700 dark:data-[state=active]:text-orange-300">
            Metabolismo
          </TabsTrigger>
          <TabsTrigger value="geral" className="data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300">
            Visão Geral
          </TabsTrigger>
        </TabsList>

        <TabsContent value="composicao" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ChartWrapper title="Peso (kg)">
              <LineChart data={chartData}>
                <defs>
                  <linearGradient id="gradientPeso" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} className="text-xs" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="peso" stroke="hsl(262, 83%, 58%)" strokeWidth={3} fill="url(#gradientPeso)" dot={{ r: 4, fill: 'hsl(262, 83%, 58%)' }} />
              </LineChart>
            </ChartWrapper>

            <ChartWrapper title="Gordura Corporal (%)">
              <LineChart data={chartData}>
                <defs>
                  <linearGradient id="gradientGordura" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="gordura" stroke="hsl(0, 84%, 60%)" strokeWidth={3} fill="url(#gradientGordura)" dot={{ r: 4, fill: 'hsl(0, 84%, 60%)' }} />
              </LineChart>
            </ChartWrapper>

            <ChartWrapper title="Massa Muscular (kg)">
              <LineChart data={chartData}>
                <defs>
                  <linearGradient id="gradientMusculo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="musculo" stroke="hsl(142, 76%, 36%)" strokeWidth={3} fill="url(#gradientMusculo)" dot={{ r: 4, fill: 'hsl(142, 76%, 36%)' }} />
              </LineChart>
            </ChartWrapper>

            <ChartWrapper title="Hidratação (%)">
              <LineChart data={chartData}>
                <defs>
                  <linearGradient id="gradientAgua" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="agua" stroke="hsl(199, 89%, 48%)" strokeWidth={3} fill="url(#gradientAgua)" dot={{ r: 4, fill: 'hsl(199, 89%, 48%)' }} />
              </LineChart>
            </ChartWrapper>
          </div>
        </TabsContent>

        <TabsContent value="metabolismo" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ChartWrapper title="IMC">
              <LineChart data={chartData}>
                <defs>
                  <linearGradient id="gradientIMC" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(280, 70%, 55%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(280, 70%, 55%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="imc" stroke="hsl(280, 70%, 55%)" strokeWidth={3} fill="url(#gradientIMC)" dot={{ r: 4, fill: 'hsl(280, 70%, 55%)' }} />
              </LineChart>
            </ChartWrapper>

            <ChartWrapper title="Taxa Metabólica Basal (kcal)">
              <LineChart data={chartData}>
                <defs>
                  <linearGradient id="gradientTMB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="tmb" stroke="hsl(25, 95%, 53%)" strokeWidth={3} fill="url(#gradientTMB)" dot={{ r: 4, fill: 'hsl(25, 95%, 53%)' }} />
              </LineChart>
            </ChartWrapper>

            <ChartWrapper title="Gordura Visceral">
              <LineChart data={chartData}>
                <defs>
                  <linearGradient id="gradientVisceral" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="visceral" stroke="hsl(0, 84%, 60%)" strokeWidth={3} fill="url(#gradientVisceral)" dot={{ r: 4, fill: 'hsl(0, 84%, 60%)' }} />
              </LineChart>
            </ChartWrapper>
          </div>
        </TabsContent>

        <TabsContent value="geral" className="space-y-4">
          <Card className="p-6">
            <h4 className="text-sm font-semibold mb-4">Todas as Métricas</h4>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Line type="monotone" dataKey="peso" name="Peso" stroke="hsl(262, 83%, 58%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="gordura" name="Gordura %" stroke="hsl(0, 84%, 60%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="musculo" name="Músculo" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="agua" name="Água %" stroke="hsl(199, 89%, 48%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
