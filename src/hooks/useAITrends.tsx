import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface CostTrend {
  function_name: string;
  current_daily_avg: number;
  predicted_daily_avg: number;
  trend_direction: 'increasing' | 'decreasing' | 'stable';
  predicted_monthly_cost: number;
  confidence_score: number;
}

export interface CostAnomaly {
  function_name: string;
  date: string;
  actual_cost: number;
  expected_cost: number;
  std_dev: number;
  deviation_score: number;
  is_anomaly: boolean;
}

export interface FunctionThreshold {
  id: string;
  function_name: string;
  max_response_time_ms: number | null;
  max_cost_per_request: number | null;
  max_failure_rate: number | null;
  enable_alerts: boolean;
  last_alert_sent_at: string | null;
}

export interface ThresholdAlert {
  should_alert: boolean;
  function_name: string;
  alert_type: 'response_time' | 'cost' | 'failure_rate';
  threshold_value: number;
  actual_value: number;
  severity: 'warning' | 'critical';
}

export interface AlertHistory {
  id: string;
  alert_type: string;
  function_name: string;
  severity: string;
  title: string;
  message: string;
  threshold_value: number | null;
  actual_value: number | null;
  acknowledged: boolean;
  created_at: string;
}

// Hook para obter tendências de custo
export function useCostTrends(days: number = 30) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cost-trends', days],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('calculate_cost_trend', {
          _function_name: null,
          _days: days
        });

      if (error) throw error;
      return (data || []) as CostTrend[];
    },
    enabled: !!user,
    refetchInterval: 300000 // Refetch a cada 5 minutos
  });
}

// Hook para detectar anomalias
export function useCostAnomalies(days: number = 7, threshold: number = 2.0) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cost-anomalies', days, threshold],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('detect_cost_anomalies', {
          _threshold_std_dev: threshold,
          _days: days
        });

      if (error) throw error;
      return (data || []) as CostAnomaly[];
    },
    enabled: !!user,
    refetchInterval: 300000 // Refetch a cada 5 minutos
  });
}

// Hook para obter thresholds configurados
export function useFunctionThresholds() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['function-thresholds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_function_thresholds')
        .select('*')
        .order('function_name');

      if (error) throw error;
      return data as FunctionThreshold[];
    },
    enabled: !!user,
    refetchInterval: 60000 // Refetch a cada 1 minuto
  });
}

// Hook para verificar alertas de threshold
export function useThresholdAlerts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['threshold-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('check_function_thresholds');

      if (error) throw error;
      return (data || []) as ThresholdAlert[];
    },
    enabled: !!user,
    refetchInterval: 60000 // Refetch a cada 1 minuto
  });
}

// Hook para obter histórico de alertas
export function useAlertHistory(limit: number = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['alert-history', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_alert_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as AlertHistory[];
    },
    enabled: !!user,
    refetchInterval: 30000 // Refetch a cada 30 segundos
  });
}

// Mutation para criar/atualizar threshold
export function useUpsertThreshold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (threshold: Partial<FunctionThreshold> & { function_name: string }) => {
      const { data, error } = await supabase
        .from('ai_function_thresholds')
        .upsert({
          function_name: threshold.function_name,
          max_response_time_ms: threshold.max_response_time_ms,
          max_cost_per_request: threshold.max_cost_per_request,
          max_failure_rate: threshold.max_failure_rate,
          enable_alerts: threshold.enable_alerts ?? true
        }, {
          onConflict: 'function_name'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['function-thresholds'] });
    }
  });
}

// Mutation para deletar threshold
export function useDeleteThreshold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (functionName: string) => {
      const { error } = await supabase
        .from('ai_function_thresholds')
        .delete()
        .eq('function_name', functionName);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['function-thresholds'] });
    }
  });
}

// Mutation para reconhecer alerta
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data, error } = await supabase
        .from('ai_alert_history')
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user?.id
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-history'] });
    }
  });
}
