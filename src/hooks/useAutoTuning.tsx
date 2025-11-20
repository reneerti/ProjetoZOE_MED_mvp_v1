import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AutoTuningConfig {
  id: string;
  enabled: boolean;
  auto_apply_low_risk: boolean;
  auto_apply_medium_risk: boolean;
  require_admin_approval: boolean;
  min_confidence_score: number;
  max_daily_applications: number;
  excluded_functions: string[];
  created_at: string;
  updated_at: string;
}

export interface AutoTuningHistory {
  id: string;
  recommendation_id: string;
  applied_at: string;
  applied_by: string | null;
  auto_applied: boolean;
  previous_config: any;
  new_config: any;
  result: string | null;
  success: boolean | null;
  created_at: string;
}

// Hook para obter configuração de auto-tuning
export function useAutoTuningConfig() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['autotuning-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_autotuning_config')
        .select('*')
        .single();

      if (error) throw error;
      return data as AutoTuningConfig;
    },
    enabled: !!user
  });
}

// Hook para atualizar configuração de auto-tuning
export function useUpdateAutoTuningConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Partial<AutoTuningConfig>) => {
      // Buscar ID da config existente
      const { data: existing } = await supabase
        .from('ai_autotuning_config')
        .select('id')
        .single();

      if (!existing) {
        throw new Error('Auto-tuning config not found');
      }

      const { data, error } = await supabase
        .from('ai_autotuning_config')
        .update(config)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autotuning-config'] });
    }
  });
}

// Hook para obter histórico de auto-tuning
export function useAutoTuningHistory(limit: number = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['autotuning-history', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_autotuning_history')
        .select('*')
        .order('applied_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as AutoTuningHistory[];
    },
    enabled: !!user
  });
}

// Hook para aplicar recomendação manualmente
export function useApplyRecommendation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      recommendationId, 
      autoApplied = false 
    }: { 
      recommendationId: string; 
      autoApplied?: boolean;
    }) => {
      // Buscar recomendação
      const { data: recommendation, error: recError } = await supabase
        .from('ai_optimization_recommendations')
        .select('*')
        .eq('id', recommendationId)
        .single();

      if (recError) throw recError;

      // Registrar no histórico
      const { error: historyError } = await supabase
        .from('ai_autotuning_history')
        .insert({
          recommendation_id: recommendationId,
          applied_by: user?.id,
          auto_applied: autoApplied,
          previous_config: {
            function: recommendation.function_name,
            metric: recommendation.current_metric_value
          },
          new_config: {
            action: recommendation.recommended_action,
            expected: recommendation.expected_improvement
          },
          result: 'Recomendação aplicada manualmente pelo administrador',
          success: true
        });

      if (historyError) throw historyError;

      // Atualizar status da recomendação
      const { error: updateError } = await supabase
        .from('ai_optimization_recommendations')
        .update({
          status: 'applied',
          applied_at: new Date().toISOString()
        })
        .eq('id', recommendationId);

      if (updateError) throw updateError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['autotuning-history'] });
    }
  });
}
