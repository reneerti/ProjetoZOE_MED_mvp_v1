import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Analisar dados de wearables com IA e atualizar health score
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    console.log('Analyzing wearable data for user:', user.id);

    // Buscar dados de wearables dos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: wearableData, error: wearableError } = await supabaseClient
      .from('wearable_data')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (wearableError) throw wearableError;

    if (!wearableData || wearableData.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'Sem dados de wearables para analisar',
          analysis: null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calcular médias e estatísticas
    const stats = calculateWearableStats(wearableData);

    // Usar Lovable AI para análise avançada
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return simpleAnalysis(supabaseClient, user.id, stats, wearableData);
    }

    const aiPrompt = `
Analise os seguintes dados de atividade física dos últimos 30 dias:

Estatísticas:
- Passos médios por dia: ${stats.avgSteps.toFixed(0)}
- Frequência cardíaca média: ${stats.avgHeartRate?.toFixed(0) || 'N/A'} bpm
- Horas de sono médias: ${stats.avgSleep?.toFixed(1) || 'N/A'} horas
- Calorias médias: ${stats.avgCalories?.toFixed(0) || 'N/A'} kcal
- Dias com dados: ${stats.daysWithData} de 30

Tendências:
- Passos: ${stats.stepsPattern}
- Sono: ${stats.sleepPattern}

Com base nesses dados:
1. Avalie a saúde cardiovascular (0-100)
2. Avalie a qualidade do sono (0-100)
3. Avalie o nível de atividade física (0-100)
4. Calcule um score geral de saúde de wearables (0-100)
5. Forneça 3 recomendações personalizadas

Responda APENAS em JSON válido no formato:
{
  "cardiovascularScore": number,
  "sleepScore": number,
  "activityScore": number,
  "overallWearableScore": number,
  "recommendations": ["recomendação 1", "recomendação 2", "recomendação 3"],
  "summary": "resumo em português"
}`;

    const aiResponse = await fetch('https://api.lovable.app/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em saúde e análise de dados de wearables. Responda sempre em JSON válido.'
          },
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI API error:', await aiResponse.text());
      return simpleAnalysis(supabaseClient, user.id, stats, wearableData);
    }

    const aiResult = await aiResponse.json();
    const aiContent = aiResult.choices[0]?.message?.content || '{}';
    
    let analysis;
    try {
      analysis = JSON.parse(aiContent);
    } catch {
      console.error('Failed to parse AI response, using simple analysis');
      return simpleAnalysis(supabaseClient, user.id, stats, wearableData);
    }

    // Atualizar health_analysis com dados de wearables
    const { data: existingAnalysis } = await supabaseClient
      .from('health_analysis')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const wearableAnalysis = {
      wearable_score: analysis.overallWearableScore,
      cardiovascular_score: analysis.cardiovascularScore,
      sleep_score: analysis.sleepScore,
      activity_score: analysis.activityScore,
      recommendations: analysis.recommendations,
      summary: analysis.summary,
      stats: stats,
      analyzed_at: new Date().toISOString()
    };

    if (existingAnalysis) {
      // Atualizar análise existente, mantendo dados de exames
      const updatedAnalysis = {
        ...existingAnalysis.analysis_summary || {},
        wearables: wearableAnalysis
      };

      // Recalcular health_score considerando wearables (30% do peso)
      const examScore = existingAnalysis.health_score || 70;
      const wearableScore = analysis.overallWearableScore;
      const newHealthScore = Math.round((examScore * 0.7) + (wearableScore * 0.3));

      await supabaseClient
        .from('health_analysis')
        .update({
          analysis_summary: updatedAnalysis,
          health_score: newHealthScore,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      console.log('Updated health score with wearables:', newHealthScore);
    } else {
      // Criar nova análise
      await supabaseClient
        .from('health_analysis')
        .insert({
          user_id: user.id,
          health_score: analysis.overallWearableScore,
          analysis_summary: { wearables: wearableAnalysis }
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: wearableAnalysis,
        message: 'Análise de wearables concluída e integrada ao índice de saúde'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing wearable data:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateWearableStats(data: any[]) {
  const withSteps = data.filter(d => d.steps != null);
  const withHR = data.filter(d => d.heart_rate != null);
  const withSleep = data.filter(d => d.sleep_hours != null);
  const withCalories = data.filter(d => d.calories != null);

  const avgSteps = withSteps.reduce((sum, d) => sum + d.steps, 0) / (withSteps.length || 1);
  const avgHeartRate = withHR.length > 0 
    ? withHR.reduce((sum, d) => sum + d.heart_rate, 0) / withHR.length 
    : null;
  const avgSleep = withSleep.length > 0
    ? withSleep.reduce((sum, d) => sum + d.sleep_hours, 0) / withSleep.length
    : null;
  const avgCalories = withCalories.length > 0
    ? withCalories.reduce((sum, d) => sum + d.calories, 0) / withCalories.length
    : null;

  // Analisar padrões
  const recentSteps = withSteps.slice(0, 7);
  const olderSteps = withSteps.slice(7, 14);
  const stepsPattern = recentSteps.length > 0 && olderSteps.length > 0
    ? (recentSteps.reduce((s, d) => s + d.steps, 0) / recentSteps.length) >
      (olderSteps.reduce((s, d) => s + d.steps, 0) / olderSteps.length)
      ? 'crescente'
      : 'decrescente'
    : 'estável';

  const recentSleep = withSleep.slice(0, 7);
  const olderSleep = withSleep.slice(7, 14);
  const sleepPattern = recentSleep.length > 0 && olderSleep.length > 0
    ? (recentSleep.reduce((s, d) => s + d.sleep_hours, 0) / recentSleep.length) >
      (olderSleep.reduce((s, d) => s + d.sleep_hours, 0) / olderSleep.length)
      ? 'melhorando'
      : 'piorando'
    : 'estável';

  return {
    avgSteps,
    avgHeartRate,
    avgSleep,
    avgCalories,
    daysWithData: data.length,
    stepsPattern,
    sleepPattern
  };
}

async function simpleAnalysis(supabaseClient: any, userId: string, stats: any, data: any[]) {
  // Análise simples sem IA
  const activityScore = Math.min(100, (stats.avgSteps / 100));
  const sleepScore = stats.avgSleep ? Math.min(100, (stats.avgSleep / 8) * 100) : 70;
  const cardiovascularScore = stats.avgHeartRate ? 
    (stats.avgHeartRate >= 60 && stats.avgHeartRate <= 100 ? 90 : 70) : 70;
  
  const overallScore = Math.round((activityScore + sleepScore + cardiovascularScore) / 3);

  const analysis = {
    wearable_score: overallScore,
    cardiovascular_score: cardiovascularScore,
    sleep_score: sleepScore,
    activity_score: activityScore,
    recommendations: [
      'Mantenha uma rotina regular de exercícios',
      'Procure dormir 7-9 horas por noite',
      'Monitore sua frequência cardíaca durante atividades'
    ],
    summary: `Análise baseada em ${stats.daysWithData} dias de dados`,
    stats: stats,
    analyzed_at: new Date().toISOString()
  };

  await supabaseClient
    .from('health_analysis')
    .upsert({
      user_id: userId,
      health_score: overallScore,
      analysis_summary: { wearables: analysis },
      updated_at: new Date().toISOString()
    });

  return new Response(
    JSON.stringify({
      success: true,
      analysis,
      message: 'Análise simples concluída'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
