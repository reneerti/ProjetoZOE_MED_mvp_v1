import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { WearableData } from "@/hooks/useWearables";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Heart, Moon, Flame } from "lucide-react";

interface WearablesEvolutionChartsProps {
  data: WearableData[];
}

export const WearablesEvolutionCharts = ({ data }: WearablesEvolutionChartsProps) => {
  const [period, setPeriod] = useState<"7" | "30" | "90">("30");

  // Filtrar dados por período
  const filterDataByPeriod = (days: number) => {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return data
      .filter(d => new Date(d.date) >= startDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(d => ({
        date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        steps: d.steps || 0,
        heart_rate: d.heart_rate || 0,
        sleep_hours: d.sleep_hours || 0,
        calories: d.calories || 0
      }));
  };

  const filteredData = filterDataByPeriod(parseInt(period));

  const chartConfig = {
    steps: { color: "hsl(var(--primary))" },
    heart_rate: { color: "hsl(var(--destructive))" },
    sleep_hours: { color: "hsl(var(--info))" },
    calories: { color: "hsl(var(--warning))" }
  };

  return (
    <Card className="border-accent/20 shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Evolução Temporal
          </CardTitle>
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="steps" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="steps" className="text-xs">
              <Activity className="w-4 h-4 mr-1" />
              Passos
            </TabsTrigger>
            <TabsTrigger value="heart_rate" className="text-xs">
              <Heart className="w-4 h-4 mr-1" />
              BPM
            </TabsTrigger>
            <TabsTrigger value="sleep" className="text-xs">
              <Moon className="w-4 h-4 mr-1" />
              Sono
            </TabsTrigger>
            <TabsTrigger value="calories" className="text-xs">
              <Flame className="w-4 h-4 mr-1" />
              Calorias
            </TabsTrigger>
          </TabsList>

          <TabsContent value="steps" className="mt-4">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="steps" 
                  stroke={chartConfig.steps.color}
                  strokeWidth={2}
                  dot={{ fill: chartConfig.steps.color, r: 4 }}
                  name="Passos"
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Média</p>
                <p className="text-lg font-bold text-primary">
                  {Math.round(filteredData.reduce((sum, d) => sum + d.steps, 0) / filteredData.length).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Máximo</p>
                <p className="text-lg font-bold text-primary">
                  {Math.max(...filteredData.map(d => d.steps)).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mínimo</p>
                <p className="text-lg font-bold text-primary">
                  {Math.min(...filteredData.map(d => d.steps)).toLocaleString()}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="heart_rate" className="mt-4">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={filteredData.filter(d => d.heart_rate > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  domain={[40, 120]}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="heart_rate" 
                  stroke={chartConfig.heart_rate.color}
                  strokeWidth={2}
                  dot={{ fill: chartConfig.heart_rate.color, r: 4 }}
                  name="BPM"
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Média</p>
                <p className="text-lg font-bold text-destructive">
                  {Math.round(filteredData.filter(d => d.heart_rate > 0).reduce((sum, d) => sum + d.heart_rate, 0) / filteredData.filter(d => d.heart_rate > 0).length)} BPM
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Máximo</p>
                <p className="text-lg font-bold text-destructive">
                  {Math.max(...filteredData.map(d => d.heart_rate))} BPM
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mínimo</p>
                <p className="text-lg font-bold text-destructive">
                  {Math.min(...filteredData.filter(d => d.heart_rate > 0).map(d => d.heart_rate))} BPM
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sleep" className="mt-4">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={filteredData.filter(d => d.sleep_hours > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  domain={[0, 12]}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="sleep_hours" 
                  stroke={chartConfig.sleep_hours.color}
                  strokeWidth={2}
                  dot={{ fill: chartConfig.sleep_hours.color, r: 4 }}
                  name="Horas de Sono"
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Média</p>
                <p className="text-lg font-bold text-info">
                  {(filteredData.filter(d => d.sleep_hours > 0).reduce((sum, d) => sum + d.sleep_hours, 0) / filteredData.filter(d => d.sleep_hours > 0).length).toFixed(1)}h
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Máximo</p>
                <p className="text-lg font-bold text-info">
                  {Math.max(...filteredData.map(d => d.sleep_hours)).toFixed(1)}h
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mínimo</p>
                <p className="text-lg font-bold text-info">
                  {Math.min(...filteredData.filter(d => d.sleep_hours > 0).map(d => d.sleep_hours)).toFixed(1)}h
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="calories" className="mt-4">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={filteredData.filter(d => d.calories > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="calories" 
                  stroke={chartConfig.calories.color}
                  strokeWidth={2}
                  dot={{ fill: chartConfig.calories.color, r: 4 }}
                  name="Calorias"
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Média</p>
                <p className="text-lg font-bold text-warning">
                  {Math.round(filteredData.filter(d => d.calories > 0).reduce((sum, d) => sum + d.calories, 0) / filteredData.filter(d => d.calories > 0).length).toLocaleString()} kcal
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Máximo</p>
                <p className="text-lg font-bold text-warning">
                  {Math.max(...filteredData.map(d => d.calories)).toLocaleString()} kcal
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mínimo</p>
                <p className="text-lg font-bold text-warning">
                  {Math.min(...filteredData.filter(d => d.calories > 0).map(d => d.calories)).toLocaleString()} kcal
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
