import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface CircuitBreakerConfig {
  id: string;
  failure_threshold: number;
  failure_window_minutes: number;
  cooldown_seconds: number;
  alert_threshold_percentage: number;
  enable_notifications: boolean;
}

export interface CircuitBreakerState {
  id: string;
  function_name: string;
  state: 'closed' | 'open' | 'half_open';
  failure_count: number;
  last_failure_at: string | null;
  opened_at: string | null;
  last_success_at: string | null;
}

export interface FailureAlert {
  should_alert: boolean;
  function_name: string;
  failure_rate: number;
  total_failures: number;
  threshold_percentage: number;
}

// Hook para obter configuração do circuit breaker
export function useCircuitBreakerConfig() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['circuit-breaker-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_circuit_breaker_config')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      return data as CircuitBreakerConfig;
    },
    enabled: !!user,
    refetchInterval: 30000 // Refetch a cada 30 segundos
  });
}

// Hook para obter estados dos circuit breakers
export function useCircuitBreakerStates() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['circuit-breaker-states'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_circuit_breaker_state')
        .select('*')
        .order('last_failure_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as CircuitBreakerState[];
    },
    enabled: !!user,
    refetchInterval: 10000 // Refetch a cada 10 segundos
  });
}

// Hook para verificar alertas de falhas
export function useFailureAlerts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['failure-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('check_ai_failure_alert');

      if (error) throw error;
      return (data || []) as FailureAlert[];
    },
    enabled: !!user,
    refetchInterval: 60000 // Refetch a cada 1 minuto
  });
}

// Mutation para atualizar configuração
export function useUpdateCircuitBreakerConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Partial<CircuitBreakerConfig>) => {
      const { data, error } = await supabase
        .from('ai_circuit_breaker_config')
        .update(config)
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circuit-breaker-config'] });
    }
  });
}

// Mutation para resetar circuit breaker
export function useResetCircuitBreaker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (functionName: string) => {
      const { error } = await supabase
        .rpc('record_circuit_breaker_state', {
          _function_name: functionName,
          _new_state: 'closed',
          _failure_count: 0
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circuit-breaker-states'] });
    }
  });
}
