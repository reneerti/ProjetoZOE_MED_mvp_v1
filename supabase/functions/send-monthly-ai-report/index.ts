import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import React from 'npm:react@18.3.1';
import { Resend } from 'npm:resend@4.0.0';
import { render } from 'npm:@react-email/render@1.0.1';
import { MonthlyReportEmail } from './_templates/monthly-report.tsx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    // Get current month and year
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = lastMonth.toLocaleString('pt-BR', { month: 'long' });
    const year = lastMonth.getFullYear().toString();

    // Get AI usage stats for last month
    const firstDay = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const lastDay = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

    const { data: usageLogs } = await supabaseClient
      .from('ai_usage_logs')
      .select('*')
      .gte('created_at', firstDay.toISOString())
      .lte('created_at', lastDay.toISOString());

    const totalRequests = usageLogs?.length || 0;
    const totalCost = usageLogs?.reduce((sum, log) => sum + (log.estimated_cost_usd || 0), 0) || 0;
    const avgResponseTime = Math.round(
      usageLogs?.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / (totalRequests || 1)
    );
    const successRate = totalRequests > 0
      ? Math.round((usageLogs?.filter(log => log.success).length / totalRequests) * 100)
      : 0;

    // Get applied recommendations and cost savings
    const { data: appliedRecs } = await supabaseClient
      .from('ai_optimization_recommendations')
      .select('estimated_cost_savings')
      .eq('status', 'applied')
      .gte('applied_at', firstDay.toISOString())
      .lte('applied_at', lastDay.toISOString());

    const costSavings = appliedRecs?.reduce((sum, rec) => sum + (rec.estimated_cost_savings || 0), 0) || 0;

    // Get pending recommendations
    const { data: pendingRecs } = await supabaseClient
      .from('ai_optimization_recommendations')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .limit(3);

    const pendingCount = pendingRecs?.length || 0;

    // Get cost trends
    const { data: trendData } = await supabaseClient
      .rpc('calculate_cost_trend', { _days: 30 });

    const costTrend = trendData?.[0]?.trend_direction === 'increasing' 
      ? '📈 Crescente (considere otimizações)' 
      : trendData?.[0]?.trend_direction === 'decreasing'
      ? '📉 Decrescente (ótimo progresso!)'
      : '➡️ Estável';

    const performanceTrend = avgResponseTime < 5000 
      ? '✅ Excelente (< 5s)' 
      : avgResponseTime < 10000
      ? '⚠️ Aceitável (5-10s)'
      : '🔴 Necessita atenção (> 10s)';

    // Render email template
    const html = render(
      React.createElement(MonthlyReportEmail, {
        month,
        year,
        totalRequests,
        totalCost,
        avgResponseTime,
        successRate,
        costSavings,
        pendingRecommendations: pendingCount,
        trends: {
          costTrend,
          performanceTrend,
        },
        topRecommendations: (pendingRecs || []).map(rec => ({
          function_name: rec.function_name,
          recommendation_type: rec.recommendation_type,
          estimated_cost_savings: rec.estimated_cost_savings,
        })),
      })
    );

    // Get admin emails
    const { data: adminUsers } = await supabaseClient
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (!adminUsers || adminUsers.length === 0) {
      console.log('No admin users found');
      return new Response(
        JSON.stringify({ message: 'No admin users to send report to' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const adminEmails: string[] = [];
    for (const admin of adminUsers) {
      const { data: authUser } = await supabaseClient.auth.admin.getUserById(admin.user_id);
      if (authUser?.user?.email) {
        adminEmails.push(authUser.user.email);
      }
    }

    if (adminEmails.length === 0) {
      console.log('No admin emails found');
      return new Response(
        JSON.stringify({ message: 'No admin emails found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Send email to all admins
    const { error } = await resend.emails.send({
      from: 'ZoeMed AI <onboarding@resend.dev>',
      to: adminEmails,
      subject: `📊 Relatório Mensal de IA - ${month}/${year}`,
      html,
    });

    if (error) {
      console.error('Error sending email:', error);
      throw error;
    }

    console.log(`Monthly report sent to ${adminEmails.length} admins`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        recipients: adminEmails.length,
        month,
        year 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in send-monthly-ai-report:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
