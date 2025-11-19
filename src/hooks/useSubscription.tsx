import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionData {
  plan_id: string;
  active: boolean;
  exams_used_this_month: number;
  max_exams_per_month: number | null;
  modules_enabled: {
    exams: boolean;
    goals: boolean;
    evolution: boolean;
    medications: boolean;
    supplements: boolean;
    bioimpedance: boolean;
  };
}

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: subData } = await supabase
        .from('user_subscriptions')
        .select(`
          plan_id,
          active,
          exams_used_this_month,
          subscription_plans (
            max_exams_per_month,
            modules_enabled
          )
        `)
        .eq('user_id', user.id)
        .eq('active', true)
        .single();

      if (subData) {
        const plan = subData.subscription_plans as any;
        setSubscription({
          plan_id: subData.plan_id,
          active: subData.active,
          exams_used_this_month: subData.exams_used_this_month,
          max_exams_per_month: plan?.max_exams_per_month || null,
          modules_enabled: plan?.modules_enabled || {
            exams: true,
            goals: false,
            evolution: false,
            medications: false,
            supplements: false,
            bioimpedance: false
          }
        });
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkExamLimit = (): { allowed: boolean; message?: string } => {
    if (!subscription) {
      return { allowed: true };
    }

    const { max_exams_per_month, exams_used_this_month } = subscription;

    if (max_exams_per_month === null) {
      return { allowed: true };
    }

    if (exams_used_this_month >= max_exams_per_month) {
      return {
        allowed: false,
        message: `Você atingiu o limite de ${max_exams_per_month} exames por mês do seu plano. Faça upgrade para processar mais exames.`
      };
    }

    return { allowed: true };
  };

  const incrementExamCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !subscription) return;

      await supabase
        .from('user_subscriptions')
        .update({ 
          exams_used_this_month: subscription.exams_used_this_month + 1 
        })
        .eq('user_id', user.id);

      // Recarregar dados
      await loadSubscription();
    } catch (error) {
      console.error('Error incrementing exam count:', error);
    }
  };

  const isModuleEnabled = (module: keyof SubscriptionData['modules_enabled']): boolean => {
    return subscription?.modules_enabled[module] ?? false;
  };

  useEffect(() => {
    loadSubscription();
  }, []);

  return {
    subscription,
    loading,
    checkExamLimit,
    incrementExamCount,
    isModuleEnabled,
    refreshSubscription: loadSubscription
  };
};
