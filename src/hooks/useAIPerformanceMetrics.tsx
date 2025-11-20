import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface FunctionPerformance {
  function_name: string;
  total_requests: number;
  success_rate: number;
  avg_response_time_ms: number;
  total_cost_usd: number;
  lovable_ai_count: number;
  gemini_api_count: number;
  fallback_count: number;
}

export interface ProviderComparison {
  provider: string;
  total_requests: number;
  avg_response_time_ms: number;
  success_rate: number;
  total_cost_usd: number;
  avg_cost_per_request: number;
}

// Hook para obter métricas de performance por função
export function useFunctionPerformance(days: number = 30) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['function-performance', days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      // Agrupar por função
      const functionMap = new Map<string, any>();

      data.forEach((log: any) => {
        const funcName = log.function_name;
        
        if (!functionMap.has(funcName)) {
          functionMap.set(funcName, {
            function_name: funcName,
            total_requests: 0,
            successful_requests: 0,
            total_response_time: 0,
            total_cost: 0,
            lovable_ai_count: 0,
            gemini_api_count: 0,
            fallback_count: 0
          });
        }

        const func = functionMap.get(funcName);
        func.total_requests++;
        
        if (log.success) func.successful_requests++;
        if (log.response_time_ms) func.total_response_time += log.response_time_ms;
        if (log.estimated_cost_usd) func.total_cost += log.estimated_cost_usd;
        
        if (log.provider === 'lovable_ai') func.lovable_ai_count++;
        else if (log.provider === 'gemini_api') func.gemini_api_count++;
        else if (log.provider === 'fallback') func.fallback_count++;
      });

      // Calcular métricas finais
      const result: FunctionPerformance[] = Array.from(functionMap.values()).map(func => ({
        function_name: func.function_name,
        total_requests: func.total_requests,
        success_rate: (func.successful_requests / func.total_requests) * 100,
        avg_response_time_ms: Math.round(func.total_response_time / func.total_requests),
        total_cost_usd: func.total_cost,
        lovable_ai_count: func.lovable_ai_count,
        gemini_api_count: func.gemini_api_count,
        fallback_count: func.fallback_count
      }));

      return result.sort((a, b) => b.total_requests - a.total_requests);
    },
    enabled: !!user,
    refetchInterval: 60000 // Refetch a cada 1 minuto
  });
}

// Hook para comparar performance entre providers
export function useProviderComparison(days: number = 30) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['provider-comparison', days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      // Agrupar por provider
      const providerMap = new Map<string, any>();

      data.forEach((log: any) => {
        const provider = log.provider;
        
        if (!providerMap.has(provider)) {
          providerMap.set(provider, {
            provider,
            total_requests: 0,
            successful_requests: 0,
            total_response_time: 0,
            total_cost: 0,
            response_times: []
          });
        }

        const prov = providerMap.get(provider);
        prov.total_requests++;
        
        if (log.success) prov.successful_requests++;
        if (log.response_time_ms) {
          prov.total_response_time += log.response_time_ms;
          prov.response_times.push(log.response_time_ms);
        }
        if (log.estimated_cost_usd) prov.total_cost += log.estimated_cost_usd;
      });

      // Calcular métricas finais
      const result: ProviderComparison[] = Array.from(providerMap.values()).map(prov => ({
        provider: prov.provider,
        total_requests: prov.total_requests,
        avg_response_time_ms: Math.round(prov.total_response_time / prov.total_requests),
        success_rate: (prov.successful_requests / prov.total_requests) * 100,
        total_cost_usd: prov.total_cost,
        avg_cost_per_request: prov.total_cost / prov.total_requests
      }));

      return result.sort((a, b) => b.total_requests - a.total_requests);
    },
    enabled: !!user,
    refetchInterval: 60000 // Refetch a cada 1 minuto
  });
}

// Hook para obter histórico de latência
export function useLatencyHistory(days: number = 7) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['latency-history', days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('ai_usage_logs')
        .select('created_at, response_time_ms, provider, function_name')
        .gte('created_at', startDate.toISOString())
        .not('response_time_ms', 'is', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Agrupar por hora
      const hourlyMap = new Map<string, any>();

      data.forEach((log: any) => {
        const date = new Date(log.created_at);
        const hourKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
        
        if (!hourlyMap.has(hourKey)) {
          hourlyMap.set(hourKey, {
            timestamp: date.toISOString(),
            hour: `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}h`,
            response_times: [],
            lovable_times: [],
            gemini_times: [],
            fallback_times: []
          });
        }

        const hour = hourlyMap.get(hourKey);
        hour.response_times.push(log.response_time_ms);
        
        if (log.provider === 'lovable_ai') hour.lovable_times.push(log.response_time_ms);
        else if (log.provider === 'gemini_api') hour.gemini_times.push(log.response_time_ms);
        else if (log.provider === 'fallback') hour.fallback_times.push(log.response_time_ms);
      });

      // Calcular médias
      const result = Array.from(hourlyMap.values()).map(hour => ({
        hour: hour.hour,
        avg_response_time: Math.round(
          hour.response_times.reduce((a: number, b: number) => a + b, 0) / hour.response_times.length
        ),
        avg_lovable: hour.lovable_times.length > 0
          ? Math.round(hour.lovable_times.reduce((a: number, b: number) => a + b, 0) / hour.lovable_times.length)
          : null,
        avg_gemini: hour.gemini_times.length > 0
          ? Math.round(hour.gemini_times.reduce((a: number, b: number) => a + b, 0) / hour.gemini_times.length)
          : null,
        avg_fallback: hour.fallback_times.length > 0
          ? Math.round(hour.fallback_times.reduce((a: number, b: number) => a + b, 0) / hour.fallback_times.length)
          : null
      }));

      return result;
    },
    enabled: !!user,
    refetchInterval: 300000 // Refetch a cada 5 minutos
  });
}
