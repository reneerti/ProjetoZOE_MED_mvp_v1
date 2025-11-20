import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCostTrends, useCostAnomalies } from "@/hooks/useAITrends";
import { Skeleton } from "./ui/skeleton";
import { LineChart, Line, AreaChart, Area, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingUp, TrendingDown, AlertTriangle, Activity, DollarSign } from "lucide-react";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

export function AITrendsDashboard() {
  const { data: trends, isLoading: trendsLoading } = useCostTrends(30);
  const { data: anomalies, isLoading: anomaliesLoading } = useCostAnomalies(7, 2.0);

  if (trendsLoading || anomaliesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const getTrendIcon = (direction: string) => {
    if (direction === 'increasing') return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (direction === 'decreasing') return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = (direction: string) => {
    if (direction === 'increasing') return 'text-red-600';
    if (direction === 'decreasing') return 'text-green-600';
    return 'text-gray-600';
  };

  // Preparar dados para gráfico de tendências
  const trendChartData = trends?.map(trend => ({
    name: trend.function_name.replace('analyze-', '').replace('-', ' '),
    atual: trend.current_daily_avg,
    previsto: trend.predicted_daily_avg,
    mensal: trend.predicted_monthly_cost
  })) || [];

  // Agrupar anomalias por função
  const anomaliesByFunction = anomalies?.reduce((acc, anomaly) => {
    if (!acc[anomaly.function_name]) {
      acc[anomaly.function_name] = [];
    }
    acc[anomaly.function_name].push(anomaly);
    return acc;
  }, {} as Record<string, typeof anomalies>) || {};

  // Contar anomalias críticas
  const criticalAnomalies = anomalies?.filter(a => a.is_anomaly && a.deviation_score > 3) || [];

  return (
    <div className="space-y-6">
      {/* Alertas de Anomalias Críticas */}
      {criticalAnomalies.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Anomalias Críticas Detectadas</AlertTitle>
          <AlertDescription>
            {criticalAnomalies.length} anomalia(s) crítica(s) detectada(s) nos últimos 7 dias.
            Custos inesperados foram identificados e podem indicar problemas no sistema.
          </AlertDescription>
        </Alert>
      )}

      {/* Cards de Previsão */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {trends?.map((trend) => (
          <Card key={trend.function_name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {trend.function_name.replace('analyze-', '').replace(/-/g, ' ')}
              </CardTitle>
              {getTrendIcon(trend.trend_direction)}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Custo Diário Atual</p>
                  <p className="text-2xl font-bold">${trend.current_daily_avg.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Previsão (7 dias)</p>
                  <p className={`text-lg font-semibold ${getTrendColor(trend.trend_direction)}`}>
                    ${trend.predicted_daily_avg.toFixed(4)}
                  </p>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Projeção Mensal</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-bold">${trend.predicted_monthly_cost.toFixed(2)}</p>
                    <Badge variant="outline" className="text-xs">
                      {(trend.confidence_score * 100).toFixed(0)}% confiança
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráfico de Tendências */}
      <Card>
        <CardHeader>
          <CardTitle>Análise de Tendências e Previsões</CardTitle>
          <CardDescription>
            Comparação entre custo atual e previsão para os próximos 7 dias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={trendChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => `$${value.toFixed(4)}`}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="atual" 
                name="Custo Atual"
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary))"
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="previsto" 
                name="Previsão (7 dias)"
                stroke="hsl(var(--destructive))" 
                fill="hsl(var(--destructive))"
                fillOpacity={0.4}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detecção de Anomalias */}
      <Card>
        <CardHeader>
          <CardTitle>Detecção de Anomalias</CardTitle>
          <CardDescription>
            Custos que desviam significativamente da média esperada (últimos 7 dias)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(anomaliesByFunction).map(([funcName, funcAnomalies]) => {
            const hasAnomalies = funcAnomalies.some(a => a.is_anomaly);
            
            if (!hasAnomalies) return null;

            const chartData = funcAnomalies.map(a => ({
              date: new Date(a.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
              custo: a.actual_cost,
              esperado: a.expected_cost,
              desvio: a.deviation_score,
              isAnomaly: a.is_anomaly
            }));

            return (
              <div key={funcName} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">
                    {funcName.replace('analyze-', '').replace(/-/g, ' ')}
                  </h4>
                  <Badge variant="destructive">
                    {funcAnomalies.filter(a => a.is_anomaly).length} anomalia(s)
                  </Badge>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number, name: string) => {
                        if (name === 'desvio') return value.toFixed(2);
                        return `$${value.toFixed(4)}`;
                      }}
                    />
                    <Legend />
                    <ReferenceLine 
                      y={chartData[0]?.esperado || 0} 
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="3 3"
                      label="Média"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="custo" 
                      name="Custo Real"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={(props) => {
                        const { cx, cy, payload } = props;
                        if (payload.isAnomaly) {
                          return (
                            <circle 
                              cx={cx} 
                              cy={cy} 
                              r={6} 
                              fill="hsl(var(--destructive))"
                              stroke="white"
                              strokeWidth={2}
                            />
                          );
                        }
                        return <circle cx={cx} cy={cy} r={3} fill="hsl(var(--primary))" />;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="esperado" 
                      name="Esperado"
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })}

          {Object.keys(anomaliesByFunction).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma anomalia detectada nos últimos 7 dias</p>
              <p className="text-sm mt-2">O sistema está operando dentro dos padrões esperados</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights de ML */}
      <Card>
        <CardHeader>
          <CardTitle>Insights de Machine Learning</CardTitle>
          <CardDescription>Análises e recomendações baseadas em dados históricos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trends && trends.length > 0 && (
              <>
                {/* Maior crescimento previsto */}
                {(() => {
                  const highestGrowth = [...trends]
                    .filter(t => t.trend_direction === 'increasing')
                    .sort((a, b) => b.predicted_daily_avg - a.predicted_daily_avg)[0];
                  
                  if (!highestGrowth) return null;

                  const growthPercentage = ((highestGrowth.predicted_daily_avg - highestGrowth.current_daily_avg) / highestGrowth.current_daily_avg * 100);

                  return (
                    <Alert>
                      <TrendingUp className="h-4 w-4" />
                      <AlertTitle>Crescimento de Custo Previsto</AlertTitle>
                      <AlertDescription>
                        <strong>{highestGrowth.function_name}</strong> deve ter aumento de {growthPercentage.toFixed(1)}% 
                        nos próximos 7 dias. Custo mensal projetado: ${highestGrowth.predicted_monthly_cost.toFixed(2)}
                      </AlertDescription>
                    </Alert>
                  );
                })()}

                {/* Maior economia prevista */}
                {(() => {
                  const highestSaving = [...trends]
                    .filter(t => t.trend_direction === 'decreasing')
                    .sort((a, b) => a.predicted_daily_avg - b.predicted_daily_avg)[0];
                  
                  if (!highestSaving) return null;

                  const savingPercentage = Math.abs((highestSaving.predicted_daily_avg - highestSaving.current_daily_avg) / highestSaving.current_daily_avg * 100);

                  return (
                    <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                      <TrendingDown className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-800 dark:text-green-200">Redução de Custo Prevista</AlertTitle>
                      <AlertDescription className="text-green-700 dark:text-green-300">
                        <strong>{highestSaving.function_name}</strong> deve ter redução de {savingPercentage.toFixed(1)}% 
                        nos próximos 7 dias. Economia mensal estimada: ${(highestSaving.current_daily_avg * 30 - highestSaving.predicted_monthly_cost).toFixed(2)}
                      </AlertDescription>
                    </Alert>
                  );
                })()}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
