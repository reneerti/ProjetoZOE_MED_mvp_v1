import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFunctionPerformance, useProviderComparison } from "@/hooks/useAIPerformanceMetrics";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "./ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Activity, Clock, DollarSign, TrendingUp } from "lucide-react";

export function AIFunctionMetrics() {
  const { data: functionPerf, isLoading: funcLoading } = useFunctionPerformance(30);
  const { data: providerComp, isLoading: provLoading } = useProviderComparison(30);

  if (funcLoading || provLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'bg-green-500';
    if (rate >= 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getProviderName = (provider: string) => {
    if (provider === 'lovable_ai') return 'Lovable AI';
    if (provider === 'gemini_api') return 'Gemini API';
    return 'Fallback';
  };

  return (
    <div className="space-y-6">
      {/* Comparação entre Providers */}
      <Card>
        <CardHeader>
          <CardTitle>Comparação de Providers</CardTitle>
          <CardDescription>Performance e custos por provider</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Requisições</TableHead>
                  <TableHead className="text-right">Taxa de Sucesso</TableHead>
                  <TableHead className="text-right">Tempo Médio</TableHead>
                  <TableHead className="text-right">Custo Total</TableHead>
                  <TableHead className="text-right">Custo/Req</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providerComp?.map((provider) => (
                  <TableRow key={provider.provider}>
                    <TableCell className="font-medium">
                      {getProviderName(provider.provider)}
                    </TableCell>
                    <TableCell className="text-right">
                      {provider.total_requests.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={`${getSuccessRateColor(provider.success_rate)} text-white`}
                      >
                        {provider.success_rate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {provider.avg_response_time_ms}ms
                    </TableCell>
                    <TableCell className="text-right">
                      ${provider.total_cost_usd.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${provider.avg_cost_per_request.toFixed(6)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Gráfico comparativo */}
          <div className="mt-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={providerComp}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="provider" 
                  tickFormatter={getProviderName}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'avg_response_time_ms') return `${value}ms`;
                    if (name === 'total_cost_usd') return `$${value.toFixed(4)}`;
                    return value;
                  }}
                  labelFormatter={getProviderName}
                />
                <Legend />
                <Bar 
                  yAxisId="left"
                  dataKey="avg_response_time_ms" 
                  name="Tempo Médio (ms)"
                  fill="hsl(var(--primary))" 
                />
                <Bar 
                  yAxisId="right"
                  dataKey="total_cost_usd" 
                  name="Custo Total (USD)"
                  fill="hsl(var(--secondary))" 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Métricas por Função */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Função</CardTitle>
          <CardDescription>Análise detalhada de cada função de IA</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Função</TableHead>
                  <TableHead className="text-right">Requisições</TableHead>
                  <TableHead className="text-right">Taxa de Sucesso</TableHead>
                  <TableHead className="text-right">Tempo Médio</TableHead>
                  <TableHead className="text-right">Custo Total</TableHead>
                  <TableHead className="text-right">Providers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {functionPerf?.map((func) => (
                  <TableRow key={func.function_name}>
                    <TableCell className="font-medium">
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {func.function_name}
                      </code>
                    </TableCell>
                    <TableCell className="text-right">
                      {func.total_requests.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={`${getSuccessRateColor(func.success_rate)} text-white`}
                      >
                        {func.success_rate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {func.avg_response_time_ms}ms
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                        {func.total_cost_usd.toFixed(4)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 text-xs">
                        {func.lovable_ai_count > 0 && (
                          <Badge variant="outline" className="text-xs">
                            L: {func.lovable_ai_count}
                          </Badge>
                        )}
                        {func.gemini_api_count > 0 && (
                          <Badge variant="outline" className="text-xs">
                            G: {func.gemini_api_count}
                          </Badge>
                        )}
                        {func.fallback_count > 0 && (
                          <Badge variant="outline" className="text-xs bg-yellow-500 text-white">
                            F: {func.fallback_count}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Insights e Recomendações */}
      <Card>
        <CardHeader>
          <CardTitle>Insights e Recomendações</CardTitle>
          <CardDescription>Análise automática de performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {functionPerf && functionPerf.length > 0 && (
              <>
                {/* Função mais custosa */}
                {(() => {
                  const mostExpensive = [...functionPerf].sort((a, b) => b.total_cost_usd - a.total_cost_usd)[0];
                  return (
                    <div className="flex items-start gap-3 p-4 border rounded-lg">
                      <DollarSign className="h-5 w-5 text-yellow-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">Função Mais Custosa</p>
                        <p className="text-sm text-muted-foreground">
                          <code className="text-sm bg-muted px-2 py-1 rounded">{mostExpensive.function_name}</code>
                          {' '}representa ${mostExpensive.total_cost_usd.toFixed(2)} do custo total.
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Função mais lenta */}
                {(() => {
                  const slowest = [...functionPerf].sort((a, b) => b.avg_response_time_ms - a.avg_response_time_ms)[0];
                  return (
                    <div className="flex items-start gap-3 p-4 border rounded-lg">
                      <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">Função Mais Lenta</p>
                        <p className="text-sm text-muted-foreground">
                          <code className="text-sm bg-muted px-2 py-1 rounded">{slowest.function_name}</code>
                          {' '}tem tempo médio de resposta de {slowest.avg_response_time_ms}ms.
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Uso de fallback */}
                {(() => {
                  const withFallback = functionPerf.filter(f => f.fallback_count > 0);
                  if (withFallback.length > 0) {
                    return (
                      <div className="flex items-start gap-3 p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950">
                        <Activity className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">Uso de Fallback Detectado</p>
                          <p className="text-sm text-muted-foreground">
                            {withFallback.length} função(ões) estão usando fallback. Isso pode indicar problemas com o provider principal.
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
