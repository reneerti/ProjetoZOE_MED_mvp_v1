/**
 * Dashboard de Uso e Custos de APIs
 *
 * Exibe métricas de uso, custos e performance das APIs configuradas
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DollarSign, Activity, TrendingUp, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface APIUsageStats {
  provider: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  success_rate: number;
  total_tokens: number;
  total_cost_usd: number;
  avg_response_time_ms: number;
}

interface MonthlyCost {
  month: string;
  category: string;
  provider: string;
  total_requests: number;
  total_tokens: number;
  total_cost_usd: number;
  avg_cost_per_request: number;
}

const PROVIDER_COLORS: Record<string, string> = {
  ocr_space: 'bg-blue-500',
  google_vision: 'bg-green-500',
  groq: 'bg-purple-500',
  google_ai: 'bg-yellow-500',
  together_ai: 'bg-pink-500',
  openrouter: 'bg-indigo-500',
  pdf_co: 'bg-orange-500',
};

export function APIUsageDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<APIUsageStats[]>([]);
  const [monthlyCosts, setMonthlyCosts] = useState<MonthlyCost[]>([]);
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30');

  useEffect(() => {
    loadUsageData();
  }, [period]);

  const loadUsageData = async () => {
    try {
      setLoading(true);

      // Buscar estatísticas de uso
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_api_usage_stats', { p_days: parseInt(period) });

      if (statsError) throw statsError;
      setStats(statsData || []);

      // Buscar custos mensais
      const { data: costsData, error: costsError } = await supabase
        .from('api_monthly_costs')
        .select('*')
        .order('month', { ascending: false })
        .limit(12);

      if (costsError) throw costsError;
      setMonthlyCosts(costsData || []);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar métricas de uso',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const totalRequests = stats.reduce((sum, s) => sum + s.total_requests, 0);
  const totalCost = stats.reduce((sum, s) => sum + s.total_cost_usd, 0);
  const avgSuccessRate = stats.length > 0
    ? stats.reduce((sum, s) => sum + s.success_rate, 0) / stats.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Resumo Geral */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Requisições</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Últimos {period} dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalCost.toFixed(4)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalRequests > 0 && `$${(totalCost / totalRequests).toFixed(6)} por req`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            {avgSuccessRate >= 95 ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgSuccessRate.toFixed(1)}%</div>
            <Progress value={avgSuccessRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">APIs Ativas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.length}</div>
            <p className="text-xs text-muted-foreground">
              Provedores em uso
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Visualização */}
      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="providers">Por Provedor</TabsTrigger>
          <TabsTrigger value="monthly">Custos Mensais</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Tab: Por Provedor */}
        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Uso por Provedor</CardTitle>
              <CardDescription>Estatísticas detalhadas de cada API</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.map((stat) => (
                  <div key={stat.provider} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${PROVIDER_COLORS[stat.provider] || 'bg-gray-500'}`} />
                        <h4 className="font-semibold">{stat.provider}</h4>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {stat.total_requests.toLocaleString()} requisições
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Sucesso</div>
                        <div className="flex items-center gap-2">
                          <div className="text-lg font-semibold">{stat.success_rate.toFixed(1)}%</div>
                          {stat.success_rate >= 95 ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-muted-foreground">Custo Total</div>
                        <div className="text-lg font-semibold">
                          ${stat.total_cost_usd.toFixed(4)}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-muted-foreground">Tokens</div>
                        <div className="text-lg font-semibold">
                          {stat.total_tokens.toLocaleString()}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-muted-foreground">Tempo Médio</div>
                        <div className="text-lg font-semibold">
                          {stat.avg_response_time_ms.toFixed(0)}ms
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">
                          {stat.successful_requests.toLocaleString()} sucessos
                        </span>
                        <span className="text-muted-foreground">
                          {stat.failed_requests.toLocaleString()} falhas
                        </span>
                      </div>
                      <Progress value={stat.success_rate} />
                    </div>
                  </div>
                ))}

                {stats.length === 0 && (
                  <Alert>
                    <AlertDescription>
                      Nenhum uso registrado nos últimos {period} dias.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Custos Mensais */}
        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Custos Mensais</CardTitle>
              <CardDescription>Evolução de gastos ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthlyCosts.slice(0, 6).map((cost, index) => {
                  const monthDate = new Date(cost.month);
                  const monthName = monthDate.toLocaleDateString('pt-BR', {
                    month: 'long',
                    year: 'numeric'
                  });

                  return (
                    <div key={index} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <div className="font-medium capitalize">{monthName}</div>
                        <div className="text-sm text-muted-foreground">
                          {cost.provider} - {cost.total_requests.toLocaleString()} req
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${cost.total_cost_usd.toFixed(4)}</div>
                        <div className="text-xs text-muted-foreground">
                          ${cost.avg_cost_per_request.toFixed(6)}/req
                        </div>
                      </div>
                    </div>
                  );
                })}

                {monthlyCosts.length === 0 && (
                  <Alert>
                    <AlertDescription>
                      Nenhum custo registrado ainda.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Performance */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance por Provedor</CardTitle>
              <CardDescription>Comparação de tempo de resposta médio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...stats]
                  .sort((a, b) => a.avg_response_time_ms - b.avg_response_time_ms)
                  .map((stat) => {
                    const maxTime = Math.max(...stats.map(s => s.avg_response_time_ms));
                    const barWidth = (stat.avg_response_time_ms / maxTime) * 100;

                    return (
                      <div key={stat.provider}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{stat.provider}</span>
                          <span className="text-sm text-muted-foreground">
                            {stat.avg_response_time_ms.toFixed(0)}ms
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${PROVIDER_COLORS[stat.provider] || 'bg-gray-500'}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Seletor de Período */}
      <div className="flex justify-center gap-2">
        <Button
          variant={period === '7' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPeriod('7')}
        >
          7 dias
        </Button>
        <Button
          variant={period === '30' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPeriod('30')}
        >
          30 dias
        </Button>
        <Button
          variant={period === '90' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPeriod('90')}
        >
          90 dias
        </Button>
      </div>
    </div>
  );
}
