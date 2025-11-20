import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, DollarSign, TrendingDown, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFailureAlerts, useCircuitBreakerStates } from "@/hooks/useCircuitBreaker";

interface AlertStatus {
  type: 'cache_performance' | 'budget_warning' | 'fallback_frequent' | 'circuit_breaker' | 'failure_rate';
  title: string;
  message: string;
  severity: 'warning' | 'error';
}

export const AIUsageNotifications = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const { data: failureAlerts } = useFailureAlerts();
  const { data: circuitBreakerStates } = useCircuitBreakerStates();

  useEffect(() => {
    if (user) {
      checkUserRole();
    }
  }, [user]);

  useEffect(() => {
    if (user && isAdmin) {
      checkAlerts();
      // Verificar alertas a cada 5 minutos
      const interval = setInterval(checkAlerts, 5 * 60 * 1000);
      
      // Subscrever mudanças em cache_performance_daily
      const channel = supabase
        .channel('cache_performance_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cache_performance_daily'
          },
          () => checkAlerts()
        )
        .subscribe();

      return () => {
        clearInterval(interval);
        channel.unsubscribe();
      };
    }
  }, [user, isAdmin]);

  const checkUserRole = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      setIsAdmin(data?.role === 'admin');
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const checkAlerts = async () => {
    setLoading(true);
    const newAlerts: AlertStatus[] = [];

    try {
      // 1. Verificar performance do cache
      const { data: cacheAlert } = await supabase
        .rpc('check_cache_performance_alert');

      if (cacheAlert && cacheAlert.length > 0 && cacheAlert[0].should_alert) {
        const alert = cacheAlert[0];
        newAlerts.push({
          type: 'cache_performance',
          title: 'Performance de Cache Baixa',
          message: `A taxa de acerto do cache está em ${(alert.avg_hit_rate * 100).toFixed(1)}% há ${alert.days_below_threshold} dias consecutivos. Considere revisar as estratégias de caching.`,
          severity: 'warning'
        });
      }

      // 2. Verificar budget de AI
      const { data: budgetStatus } = await supabase
        .rpc('get_budget_status');

      if (budgetStatus && budgetStatus.length > 0) {
        const budget = budgetStatus[0];
        if (budget.alert_threshold_reached && !budget.is_over_budget) {
          newAlerts.push({
            type: 'budget_warning',
            title: 'Orçamento AI Próximo do Limite',
            message: `Você usou ${budget.percentage_used.toFixed(1)}% do orçamento mensal ($${budget.current_spending.toFixed(2)} de $${budget.monthly_limit.toFixed(2)}). Projeção para o mês: $${budget.projected_monthly_spending.toFixed(2)}.`,
            severity: 'warning'
          });
        } else if (budget.is_over_budget) {
          newAlerts.push({
            type: 'budget_warning',
            title: 'Orçamento AI Excedido',
            message: `O orçamento mensal foi excedido! Uso atual: $${budget.current_spending.toFixed(2)} (limite: $${budget.monthly_limit.toFixed(2)}). Por favor, ajuste o orçamento ou reduza o uso.`,
            severity: 'error'
          });
        }
      }

      // 3. Verificar uso frequente de fallback (últimos 7 dias)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: usageLogs } = await supabase
        .from('ai_usage_logs')
        .select('provider')
        .gte('created_at', sevenDaysAgo.toISOString());

      if (usageLogs && usageLogs.length > 0) {
        const geminiCount = usageLogs.filter(log => log.provider === 'gemini').length;
        const totalCount = usageLogs.length;
        const fallbackRate = geminiCount / totalCount;

        if (fallbackRate > 0.3) { // Mais de 30% usando fallback
          newAlerts.push({
            type: 'fallback_frequent',
            title: 'Uso Frequente de Fallback',
            message: `${(fallbackRate * 100).toFixed(1)}% das requisições estão usando o Gemini API (fallback) nos últimos 7 dias. Verifique os créditos do Lovable AI.`,
            severity: 'warning'
          });
        }
      }

      setAlerts(newAlerts);
    } catch (error) {
      console.error('Error checking AI alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Adicionar alertas de falhas e circuit breaker
  useEffect(() => {
    if (!failureAlerts || !circuitBreakerStates || !isAdmin) return;

    setAlerts(prev => {
      const baseAlerts = prev.filter(a => a.type !== 'failure_rate' && a.type !== 'circuit_breaker');
      const newAlerts: AlertStatus[] = [...baseAlerts];

      // Alertas de taxa de falhas alta
      failureAlerts.forEach(alert => {
        if (alert.should_alert) {
          newAlerts.push({
            type: 'failure_rate',
            title: `Taxa de Falhas Alta: ${alert.function_name}`,
            message: `Taxa de falhas de ${alert.failure_rate.toFixed(1)}% (${alert.total_failures} falhas). Limite: ${alert.threshold_percentage}%`,
            severity: 'error'
          });
        }
      });

      // Alertas de circuit breaker aberto
      circuitBreakerStates
        .filter(state => state.state === 'open')
        .forEach(state => {
          newAlerts.push({
            type: 'circuit_breaker',
            title: `Circuit Breaker Aberto: ${state.function_name}`,
            message: `Chamadas temporariamente bloqueadas devido a múltiplas falhas (${state.failure_count}). Sistema em modo de proteção.`,
            severity: 'error'
          });
        });

      return newAlerts;
    });
  }, [failureAlerts, circuitBreakerStates, isAdmin]);

  const handleViewDashboard = () => {
    // Este será chamado pelo componente pai
    window.dispatchEvent(new CustomEvent('navigate-to-ai-monitoring'));
  };

  // Não mostrar nada se não for admin ou se não houver alertas
  if (loading || !isAdmin || alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => (
        <Alert
          key={index}
          variant={alert.severity === 'error' ? 'destructive' : 'default'}
          className="border-l-4"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {alert.type === 'cache_performance' && (
                <TrendingDown className="w-5 h-5" />
              )}
              {alert.type === 'budget_warning' && (
                <DollarSign className="w-5 h-5" />
              )}
              {alert.type === 'fallback_frequent' && (
                <AlertTriangle className="w-5 h-5" />
              )}
              {alert.type === 'failure_rate' && (
                <AlertTriangle className="w-5 h-5" />
              )}
              {alert.type === 'circuit_breaker' && (
                <XCircle className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <AlertTitle className="mb-1">{alert.title}</AlertTitle>
              <AlertDescription className="text-sm">
                {alert.message}
              </AlertDescription>
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleViewDashboard}
                  className="text-xs"
                >
                  Ver Dashboard de AI
                </Button>
              </div>
            </div>
          </div>
        </Alert>
      ))}
    </div>
  );
};
