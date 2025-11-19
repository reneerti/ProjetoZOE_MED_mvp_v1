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
