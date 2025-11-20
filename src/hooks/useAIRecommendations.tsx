import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AIRecommendation {
  id: string;
  function_name: string;
  recommendation_type: 'model_change' | 'prompt_optimization' | 'caching' | 'rate_limiting' | 'circuit_breaker';
  current_metric_value: number;
  recommended_action: string;
  expected_improvement: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'applied' | 'dismissed';
  reasoning: string;
  estimated_cost_savings: number | null;
  estimated_performance_gain: number | null;
  created_at: string;
  applied_at: string | null;
  dismissed_at: string | null;
}

export interface WebhookConfig {
  id: string;
  webhook_type: 'slack' | 'discord' | 'teams';
  webhook_url: string;
  enabled: boolean;
  alert_types: string[];
  created_at: string;
  updated_at: string;
}

// Hook para obter recomendações de otimização
export function useAIRecommendations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ai-recommendations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_optimization_recommendations')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AIRecommendation[];
    },
    enabled: !!user,
    refetchInterval: 300000 // Refetch a cada 5 minutos
  });
}

// Hook para gerar novas recomendações
export function useGenerateRecommendations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Buscar recomendações geradas pela função SQL
      const { data, error } = await supabase
        .rpc('generate_ai_optimization_recommendations');

      if (error) throw error;

      // Inserir apenas recomendações que não existem ainda
      if (data && data.length > 0) {
        const { error: insertError } = await supabase
          .from('ai_optimization_recommendations')
          .insert(
            data.map((rec: any) => ({
              function_name: rec.function_name,
              recommendation_type: rec.recommendation_type,
              current_metric_value: rec.current_metric_value,
              recommended_action: rec.recommended_action,
              expected_improvement: rec.expected_improvement,
              priority: rec.priority,
              reasoning: rec.reasoning,
              estimated_cost_savings: rec.estimated_cost_savings,
              estimated_performance_gain: rec.estimated_performance_gain
            }))
          );

        if (insertError) throw insertError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] });
    }
  });
}

// Hook para atualizar status da recomendação
export function useUpdateRecommendationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'applied' | 'dismissed' }) => {
      const updateData: any = { status };
      
      if (status === 'applied') {
        updateData.applied_at = new Date().toISOString();
      } else if (status === 'dismissed') {
        updateData.dismissed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('ai_optimization_recommendations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] });
    }
  });
}

// Hook para obter configurações de webhook
export function useWebhookConfigs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['webhook-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_webhook_config')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WebhookConfig[];
    },
    enabled: !!user
  });
}

// Hook para criar/atualizar configuração de webhook
export function useUpsertWebhookConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Partial<WebhookConfig>) => {
      if (config.id) {
        // Update
        const { data, error } = await supabase
          .from('ai_webhook_config')
          .update({
            webhook_type: config.webhook_type,
            webhook_url: config.webhook_url,
            enabled: config.enabled,
            alert_types: config.alert_types
          })
          .eq('id', config.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert
        const { data, error } = await supabase
          .from('ai_webhook_config')
          .insert({
            webhook_type: config.webhook_type!,
            webhook_url: config.webhook_url!,
            enabled: config.enabled ?? true,
            alert_types: config.alert_types ?? ['critical', 'threshold_breach', 'anomaly']
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-configs'] });
    }
  });
}

// Hook para deletar configuração de webhook
export function useDeleteWebhookConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_webhook_config')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-configs'] });
    }
  });
}

// Hook para testar webhook
export function useTestWebhook() {
  return useMutation({
    mutationFn: async (webhookUrl: string) => {
      const testNotification = {
        alertType: 'test',
        severity: 'info',
        functionName: 'test-function',
        message: 'Esta é uma mensagem de teste do sistema de monitoramento de IA.',
        details: {
          timestamp: new Date().toISOString()
        }
      };

      const { data, error } = await supabase.functions.invoke('send-webhook-notification', {
        body: { notification: testNotification }
      });

      if (error) throw error;
      return data;
    }
  });
}
