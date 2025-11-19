import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { measurementId } = await req.json();

    console.log('Updating goal progress for user:', user.id);

    // Get the measurement - SECURITY: Verify ownership
    const { data: measurement, error: measurementError } = await supabase
      .from('bioimpedance_measurements')
      .select('*')
      .eq('id', measurementId)
      .eq('user_id', user.id)
      .single();

    if (measurementError || !measurement) {
      console.error('Measurement not found or unauthorized:', measurementError);
      return new Response(
        JSON.stringify({ error: 'Measurement not found or unauthorized' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active goals
    const { data: goals, error: goalsError } = await supabase
      .from('body_composition_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (goalsError) throw goalsError;

    const notifications = [];

    for (const goal of goals || []) {
      let currentValue = null;
      
      switch (goal.goal_type) {
        case 'weight':
          currentValue = Number(measurement.weight);
          break;
        case 'body_fat':
          currentValue = measurement.body_fat_percentage ? Number(measurement.body_fat_percentage) : null;
          break;
        case 'muscle_mass':
          currentValue = measurement.muscle_mass ? Number(measurement.muscle_mass) : null;
          break;
        case 'water':
          currentValue = measurement.water_percentage ? Number(measurement.water_percentage) : null;
          break;
      }

      if (currentValue === null) continue;

      // Update goal current value
      const { error: updateError } = await supabase
        .from('body_composition_goals')
        .update({ current_value: currentValue })
        .eq('id', goal.id);

      if (updateError) {
        console.error('Error updating goal:', updateError);
        continue;
      }

      // Calculate progress
      const total = Math.abs(goal.target_value - goal.start_value);
      const current = Math.abs(currentValue - goal.start_value);
      const progress = Math.min((current / total) * 100, 100);
      const previousProgress = goal.current_value ? Math.min((Math.abs(goal.current_value - goal.start_value) / total) * 100, 100) : 0;

      // Check if goal is completed
      const isCompleted = goal.goal_type === 'weight' || goal.goal_type === 'body_fat' 
        ? currentValue <= goal.target_value
        : currentValue >= goal.target_value;

      if (isCompleted && goal.status === 'active') {
        await supabase
          .from('body_composition_goals')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', goal.id);

        notifications.push({
          user_id: user.id,
          goal_id: goal.id,
          notification_type: 'completed',
          title: '🎉 Meta Alcançada!',
          message: `Parabéns! Você atingiu sua meta de ${getGoalTypeLabel(goal.goal_type)}: ${goal.target_value}${getGoalTypeUnit(goal.goal_type)}`,
          progress_percentage: 100
        });
      } else if (progress >= 25 && previousProgress < 25) {
        notifications.push({
          user_id: user.id,
          goal_id: goal.id,
          notification_type: 'milestone',
          title: '💪 25% Concluído',
          message: `Você completou 25% da sua meta de ${getGoalTypeLabel(goal.goal_type)}. Continue assim!`,
          progress_percentage: progress
        });
      } else if (progress >= 50 && previousProgress < 50) {
        notifications.push({
          user_id: user.id,
          goal_id: goal.id,
          notification_type: 'milestone',
          title: '🔥 Metade do Caminho!',
          message: `Incrível! Você está na metade da sua meta de ${getGoalTypeLabel(goal.goal_type)}.`,
          progress_percentage: progress
        });
      } else if (progress >= 75 && previousProgress < 75) {
        notifications.push({
          user_id: user.id,
          goal_id: goal.id,
          notification_type: 'milestone',
          title: '🚀 75% Concluído',
          message: `Quase lá! Faltam apenas 25% para atingir sua meta de ${getGoalTypeLabel(goal.goal_type)}.`,
          progress_percentage: progress
        });
      } else if (Math.abs(progress - previousProgress) >= 5) {
        const improving = progress > previousProgress;
        notifications.push({
          user_id: user.id,
          goal_id: goal.id,
          notification_type: 'progress',
          title: improving ? '📈 Progresso Detectado' : '📉 Atenção ao Progresso',
          message: improving 
            ? `Você está progredindo em sua meta de ${getGoalTypeLabel(goal.goal_type)}. Atual: ${currentValue}${getGoalTypeUnit(goal.goal_type)}`
            : `Seu progresso em ${getGoalTypeLabel(goal.goal_type)} está desacelerando. Continue focado!`,
          progress_percentage: progress
        });
      }
    }

    // Insert notifications
    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from('goal_notifications')
        .insert(notifications);

      if (notifError) {
        console.error('Error creating notifications:', notifError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        notifications: notifications.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in update-goal-progress:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function getGoalTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    weight: 'Peso',
    body_fat: 'Gordura Corporal',
    muscle_mass: 'Massa Muscular',
    water: 'Hidratação'
  };
  return labels[type] || type;
}

function getGoalTypeUnit(type: string): string {
  const units: Record<string, string> = {
    weight: 'kg',
    body_fat: '%',
    muscle_mass: 'kg',
    water: '%'
  };
  return units[type] || '';
}
