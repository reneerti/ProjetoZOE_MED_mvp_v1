import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAIUsageStats } from "@/hooks/useAIUsageStats";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Activity, Clock, DollarSign, TrendingUp, Zap } from "lucide-react";
import { Skeleton } from "./ui/skeleton";

const COLORS = {
  lovable_ai: 'hsl(var(--primary))',
  gemini_api: 'hsl(var(--secondary))',
  fallback: 'hsl(var(--destructive))'
};

export function AIPerformanceDashboard() {
  const { data: stats, isLoading } = useAIUsageStats(30);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sem Dados</CardTitle>
          <CardDescription>Nenhum dado de performance disponível</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calcular métricas por provider
  const providerStats = [
    {
      name: 'Lovable AI',
      requests: stats.lovable_ai_requests,
      percentage: ((stats.lovable_ai_requests / stats.total_requests) * 100).toFixed(1),
      color: COLORS.lovable_ai
    },
    {
      name: 'Gemini API',
      requests: stats.gemini_api_requests,
      percentage: ((stats.gemini_api_requests / stats.total_requests) * 100).toFixed(1),
      color: COLORS.gemini_api
    },
    {
      name: 'Fallback',
      requests: stats.fallback_requests,
      percentage: ((stats.fallback_requests / stats.total_requests) * 100).toFixed(1),
      color: COLORS.fallback
    }
  ];

  // Dados diários processados
  const dailyData = (stats.daily_stats || []).map((day: any) => ({
    date: new Date(day.day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    lovable: day.lovable_count || 0,
    gemini: day.gemini_count || 0,
    fallback: day.fallback_count || 0,
    cost: day.cost || 0
  }));

  // Métricas resumidas
  const avgCostPerRequest = stats.total_requests > 0 
    ? (stats.total_cost_usd / stats.total_requests).toFixed(4)
    : '0.0000';

  return (
    <div className="space-y-6">
      {/* Métricas principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Requisições</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_requests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Últimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio de Resposta</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avg_response_time_ms}ms</div>
            <p className="text-xs text-muted-foreground">
              Tempo médio de processamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.success_rate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Requisições bem-sucedidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.total_cost_usd.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              ${avgCostPerRequest} por requisição
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="providers">Comparação de Providers</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="costs">Custos</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Gráfico de pizza - distribuição por provider */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Provider</CardTitle>
                <CardDescription>Porcentagem de uso de cada provider</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={providerStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="requests"
                    >
                      {providerStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Estatísticas por provider */}
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas por Provider</CardTitle>
                <CardDescription>Comparação detalhada</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {providerStats.map((provider) => (
                    <div key={provider.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: provider.color }}
                          />
                          <span className="font-medium">{provider.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {provider.requests.toLocaleString()} requisições
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${provider.percentage}%`,
                            backgroundColor: provider.color
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comparação de performance */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Comparativa</CardTitle>
              <CardDescription>Requisições por provider ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="lovable" name="Lovable AI" fill={COLORS.lovable_ai} />
                  <Bar dataKey="gemini" name="Gemini API" fill={COLORS.gemini_api} />
                  <Bar dataKey="fallback" name="Fallback" fill={COLORS.fallback} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Requisições</CardTitle>
              <CardDescription>Evolução diária do uso de IA</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="lovable" 
                    name="Lovable AI"
                    stroke={COLORS.lovable_ai} 
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="gemini" 
                    name="Gemini API"
                    stroke={COLORS.gemini_api}
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="fallback" 
                    name="Fallback"
                    stroke={COLORS.fallback}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Custos</CardTitle>
              <CardDescription>Custos diários de uso de IA</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => `$${value.toFixed(4)}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="cost" 
                    name="Custo Diário"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Card de insights de custos */}
          <Card>
            <CardHeader>
              <CardTitle>Insights de Custos</CardTitle>
              <CardDescription>Análise detalhada de gastos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Custo por Requisição</p>
                      <p className="text-sm text-muted-foreground">Média geral</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold">${avgCostPerRequest}</span>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Custo Médio Diário</p>
                      <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold">
                    ${(stats.total_cost_usd / 30).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Projeção Mensal</p>
                      <p className="text-sm text-muted-foreground">Baseado no uso atual</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold">
                    ${(stats.total_cost_usd).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
