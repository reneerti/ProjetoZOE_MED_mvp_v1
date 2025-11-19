import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, AlertTriangle, CheckCircle, DollarSign, Zap, Shield } from "lucide-react";
import { useAIUsageStats, useAIUsageLogs } from "@/hooks/useAIUsageStats";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AIBudgetManager } from "./AIBudgetManager";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

const COLORS = {
  lovable: '#8B5CF6',
  gemini: '#10B981',
  fallback: '#F59E0B'
};

export const AIMonitoringDashboard = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const { data: stats, isLoading: statsLoading } = useAIUsageStats(30);
  const { data: logs, isLoading: logsLoading } = useAIUsageLogs(20);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setCheckingAdmin(false);
        return;
      }

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      setIsAdmin(data?.role === 'admin');
      setCheckingAdmin(false);
    };

    checkAdminRole();
  }, [user]);

  if (checkingAdmin || statsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-semibold mb-2">Acesso Restrito</p>
          <p className="text-muted-foreground">
            Este painel é acessível apenas para administradores do sistema.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Nenhum dado de uso de AI disponível ainda.</p>
        </CardContent>
      </Card>
    );
  }

  const providerData = [
    { name: 'Lovable AI', value: Number(stats.lovable_ai_requests), color: COLORS.lovable },
    { name: 'Gemini API', value: Number(stats.gemini_api_requests), color: COLORS.gemini },
    { name: 'Fallback', value: Number(stats.fallback_requests), color: COLORS.fallback }
  ].filter(d => d.value > 0);

  const fallbackRate = stats.total_requests > 0 
    ? ((Number(stats.fallback_requests) / Number(stats.total_requests)) * 100).toFixed(1)
    : '0';

  const chartData = stats.daily_stats?.map((day) => ({
    date: format(new Date(day.day), 'dd/MM', { locale: ptBR }),
    'Lovable AI': day.lovable_count,
    'Gemini API': day.gemini_count,
    'Fallback': day.fallback_count,
    'Custo': Number(day.cost).toFixed(4)
  })).reverse() || [];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="usage" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="usage">Uso de AI</TabsTrigger>
          <TabsTrigger value="budget">Orçamento</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Requisições</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_requests}</div>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.success_rate}%</div>
            <p className="text-xs text-muted-foreground">Requisições bem-sucedidas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(stats.total_cost_usd).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Estimativa últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avg_response_time_ms}ms</div>
            <p className="text-xs text-muted-foreground">Tempo de resposta</p>
          </CardContent>
        </Card>
      </div>

      {/* Fallback Alert */}
      {Number(stats.fallback_requests) > 5 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-900 dark:text-orange-100">
                Uso Frequente de Fallback Detectado
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-800 dark:text-orange-200">
              {fallbackRate}% das suas requisições usaram fallback para Gemini API. 
              Isso pode indicar que seus créditos do Lovable AI estão acabando ou que você está atingindo limites de taxa.
            </p>
            <p className="text-sm text-orange-800 dark:text-orange-200 mt-2">
              <strong>Ação recomendada:</strong> Considere adicionar créditos ao Lovable AI ou revisar seu uso.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Provider Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Provedores</CardTitle>
            <CardDescription>Qual AI respondeu suas requisições</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={providerData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {providerData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Requests Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Requisições Diárias</CardTitle>
            <CardDescription>Uso de AI nos últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="Lovable AI" stackId="1" stroke={COLORS.lovable} fill={COLORS.lovable} />
                <Area type="monotone" dataKey="Gemini API" stackId="1" stroke={COLORS.gemini} fill={COLORS.gemini} />
                <Area type="monotone" dataKey="Fallback" stackId="1" stroke={COLORS.fallback} fill={COLORS.fallback} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Logs Recentes</CardTitle>
          <CardDescription>Últimas 20 requisições de AI</CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {logs?.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{log.function_name}</span>
                        <Badge
                          variant={
                            log.provider === 'lovable_ai' ? 'default' :
                            log.provider === 'gemini_api' ? 'secondary' :
                            'outline'
                          }
                        >
                          {log.provider === 'lovable_ai' ? 'Lovable AI' :
                           log.provider === 'gemini_api' ? 'Gemini API' :
                           'Fallback'}
                        </Badge>
                        {log.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        {' • '}
                        {log.response_time_ms}ms
                        {log.estimated_cost_usd && ` • $${Number(log.estimated_cost_usd).toFixed(4)}`}
                      </p>
                      {log.error_message && (
                        <p className="text-xs text-red-600">{log.error_message}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="budget" className="space-y-6">
          <AIBudgetManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};
