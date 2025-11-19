import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface AIUsageStats {
  total_requests: number;
  lovable_ai_requests: number;
  gemini_api_requests: number;
  fallback_requests: number;
  success_rate: number;
  total_cost_usd: number;
  avg_response_time_ms: number;
  daily_stats: Array<{
    day: string;
    requests: number;
    lovable_count: number;
    gemini_count: number;
    fallback_count: number;
    cost: number;
  }>;
}

export const useAIUsageStats = (days: number = 30) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ai-usage-stats', user?.id, days],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase.rpc('get_ai_usage_stats', {
        _user_id: user.id,
        _days: days
      });

      if (error) throw error;
      
      return data?.[0] as AIUsageStats || null;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30s
  });
};

export const useAIUsageLogs = (limit: number = 50) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ai-usage-logs', user?.id, limit],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
};

export const useAIAlertSettings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ai-alert-settings', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('ai_usage_alerts')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore not found
      
      return data;
    },
    enabled: !!user,
  });
};

export const updateAIAlertSettings = async (settings: {
  fallback_threshold?: number;
  daily_cost_threshold?: number;
  enable_fallback_alerts?: boolean;
  enable_cost_alerts?: boolean;
}) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('ai_usage_alerts')
    .upsert({
      user_id: user.id,
      ...settings,
    });

  if (error) throw error;
};

export interface BudgetStatus {
  monthly_limit: number;
  current_spending: number;
  percentage_used: number;
  remaining_budget: number;
  projected_monthly_spending: number;
  days_in_month: number;
  days_elapsed: number;
  is_over_budget: boolean;
  alert_threshold_reached: boolean;
}

export const useBudgetStatus = () => {
  return useQuery({
    queryKey: ['budget-status'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_budget_status').single();
      if (error) throw error;
      return data as BudgetStatus;
    },
    refetchInterval: 60000, // Refetch every minute
  });
};

export const useBudgetConfig = () => {
  return useQuery({
    queryKey: ['budget-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_budget_config')
        .select('*')
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });
};

export const updateBudgetConfig = async (config: {
  monthly_limit_usd?: number;
  alert_threshold_percentage?: number;
  enable_budget_alerts?: boolean;
}) => {
  const { data: existing } = await supabase
    .from('ai_budget_config')
    .select('id')
    .limit(1)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('ai_budget_config')
      .update({
        ...config,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);
    
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('ai_budget_config')
      .insert(config);
    
    if (error) throw error;
  }
};

export interface CacheStats {
  total_cached_responses: number;
  total_cache_hits: number;
  cache_hit_rate: number;
  estimated_cost_saved: number;
  total_cached_tokens: number;
  avg_cache_age_hours: number;
  most_cached_functions: Array<{
    function_name: string;
    cache_count: number;
    hits: number;
  }>;
  cache_size_mb: number;
}

export const useCacheStats = () => {
  return useQuery({
    queryKey: ['cache-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cache_stats').single();
      if (error) throw error;
      return data as CacheStats;
    },
    refetchInterval: 30000, // Refetch every 30s
  });
};

export const invalidateCacheByFunction = async (functionName: string) => {
  const { data, error } = await supabase.rpc('invalidate_cache_by_function' as any, {
    _function_name: functionName
  });
  if (error) throw error;
  return data as number;
};

export const invalidateAllCache = async () => {
  const { data, error } = await supabase.rpc('invalidate_all_cache' as any);
  if (error) throw error;
  return data as number;
};

export interface CachePerformanceAlert {
  should_alert: boolean;
  avg_hit_rate: number;
  days_below_threshold: number;
}

export const useCachePerformanceAlert = () => {
  return useQuery({
    queryKey: ['cache-performance-alert'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('check_cache_performance_alert' as any).single();
      if (error) throw error;
      return data as CachePerformanceAlert;
    },
    refetchInterval: 3600000, // Refetch every hour
  });
};
