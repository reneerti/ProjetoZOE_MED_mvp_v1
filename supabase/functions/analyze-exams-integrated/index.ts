import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIWithFallback } from '../_shared/aiFallback.ts';
import { extractJSON } from '../_shared/jsonParser.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Rate limiting: 5 requests per minute for comprehensive integrated analysis (most expensive)
    const { data: rateLimitResult } = await supabase.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_endpoint: 'analyze-exams-integrated',
      p_max_requests: 5,
      p_window_seconds: 60
    });

    if (rateLimitResult && !rateLimitResult.allowed) {
      console.log('Rate limit exceeded for user:', user.id);
      return new Response(
        JSON.stringify({ 
          error: 'Limite de análises excedido. Esta é uma operação intensiva. Por favor, aguarde antes de solicitar nova análise.',
          retry_after: rateLimitResult.retry_after,
          reset_at: rateLimitResult.reset_at
        }), 
        {
          status: 429,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retry_after || 60),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.reset_at
          },
        }
      );
    }

    // LOG 1: Início da análise integrada
    console.log("═══════════════════════════════════════");
    console.log("🧬 ANALYZE-EXAMS-INTEGRATED INICIADO");
    console.log("═══════════════════════════════════════");
    console.log("📋 User ID:", user.id);
    const startTime = Date.now();

    // Buscar todos os exames do usuário com resultados
    console.log("🔍 [1/5] Buscando exames processados...");
    const { data: examImages, error: examError } = await supabase
      .from('exam_images')
      .select(`
        id,
        image_url,
        exam_date,
        lab_name,
        processing_status,
        ocr_text,
        exam_category_id,
        exam_type_id,
        exam_categories (name, icon),
        exam_types (name)
      `)
      .eq('user_id', user.id)
      .eq('processing_status', 'completed')
      .order('exam_date', { ascending: false });

    if (examError) {
      console.error('❌ Erro ao buscar exames:', examError);
      throw examError;
    }

    if (!examImages || examImages.length === 0) {
      console.log("⚠️ Nenhum exame processado encontrado");
      return new Response(
        JSON.stringify({ 
          error: 'Nenhum exame processado encontrado. Faça upload de exames primeiro.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ [1/5] ${examImages.length} exames encontrados`);

    // Buscar resultados de exames
    console.log("🔍 [2/5] Buscando resultados dos exames...");
    const { data: examResults, error: resultsError } = await supabase
      .from('exam_results')
      .select(`
        id,
        exam_image_id,
        parameter_name,
        value,
        value_text,
        unit,
        status
      `)
      .in('exam_image_id', examImages.map(e => e.id));

    if (resultsError) {
      console.error('Error fetching results:', resultsError);
    }

    // Preparar dados para análise
    const examsSummary = examImages.map(exam => ({
      id: exam.id,
      category: (exam.exam_categories as any)?.name || 'Não categorizado',
      type: (exam.exam_types as any)?.name || 'Não especificado',
      date: exam.exam_date,
      lab: exam.lab_name,
      results: examResults?.filter(r => r.exam_image_id === exam.id) || []
    }));

    console.log(`✅ [2/5] ${examResults?.length || 0} resultados de parâmetros carregados`);

    // Chamar Gemini AI para análise integrada
    console.log("🤖 [3/5] Chamando AI com fallback automático (Lovable AI → Gemini) para análise integrada...");
    const aiStartTime = Date.now();

    const prompt = `Você é um assistente médico especializado em análise de exames laboratoriais.

Analise os seguintes exames do paciente e forneça:
...
    ]
  }
}`;

    const aiResponse = await callAIWithFallback({
      model: 'google/gemini-2.5-pro',
      messages: [
        { role: 'user', content: prompt }
      ]
    }, user.id, 'analyze-exams-integrated');

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI error:', aiResponse.status, errorText);
      
      let errorMessage = 'Erro ao processar análise com IA';
      if (aiResponse.status === 429) {
        errorMessage = 'Limite de requisições excedido. Tente novamente mais tarde.';
      } else if (aiResponse.status === 402) {
        errorMessage = 'Créditos insuficientes. Adicione créditos ao seu workspace Lovable AI.';
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: aiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices[0].message.content;
    const analysis = extractJSON(analysisText);

    // LOG 4: Análise concluída
    const aiEndTime = Date.now();
    console.log(`✅ [3/5] Análise IA concluída em ${aiEndTime - aiStartTime}ms`);
    console.log(`📊 Health Score calculado: ${analysis.health_score}/10`);
    console.log(`📌 Pontos de atenção: ${analysis.attention_points?.length || 0}`);
    console.log(`👨‍⚕️ Especialistas recomendados: ${analysis.specialists?.length || 0}`);

    // Buscar parâmetros de referência para detectar valores críticos
    console.log("🔍 [4/5] Verificando valores críticos e criando alertas...");
    const { data: examParameters } = await supabase
      .from('exam_parameters')
      .select('*');

    // Criar alertas para valores críticos
    const criticalAlerts = [];
    for (const exam of examsSummary) {
      for (const result of exam.results) {
        if (result.value) {
          const parameter = examParameters?.find(
            p => p.parameter_name.toLowerCase() === result.parameter_name.toLowerCase()
          );

          if (parameter) {
            let shouldAlert = false;
            let thresholdType: 'high' | 'low' = 'high';
            let criticalThreshold = 0;
            let severity: 'warning' | 'critical' = 'warning';

            // Verificar se ultrapassou limite crítico alto
            if (parameter.critical_high && result.value > parameter.critical_high) {
              shouldAlert = true;
              thresholdType = 'high';
              criticalThreshold = parameter.critical_high;
              severity = 'critical';
            }
            // Verificar se ultrapassou limite crítico baixo
            else if (parameter.critical_low && result.value < parameter.critical_low) {
              shouldAlert = true;
              thresholdType = 'low';
              criticalThreshold = parameter.critical_low;
              severity = 'critical';
            }
            // Verificar se está fora da referência normal (warning)
            else if (parameter.reference_max && result.value > parameter.reference_max) {
              shouldAlert = true;
              thresholdType = 'high';
              criticalThreshold = parameter.reference_max;
              severity = 'warning';
            }
            else if (parameter.reference_min && result.value < parameter.reference_min) {
              shouldAlert = true;
              thresholdType = 'low';
              criticalThreshold = parameter.reference_min;
              severity = 'warning';
            }

            if (shouldAlert) {
              criticalAlerts.push({
                user_id: user.id,
                exam_image_id: exam.id,
                parameter_name: result.parameter_name,
                value: result.value,
                critical_threshold: criticalThreshold,
                threshold_type: thresholdType,
                severity: severity
              });
            }
          }
        }
      }
    }

    // Inserir alertas no banco de dados
    if (criticalAlerts.length > 0) {
      const { error: alertsError } = await supabase
        .from('health_alerts')
        .insert(criticalAlerts);

      if (alertsError) {
        console.error('❌ Erro ao criar alertas:', alertsError);
      } else {
        console.log(`✅ ${criticalAlerts.length} alertas críticos criados`);
      }
    } else {
      console.log('✅ Nenhum alerta crítico detectado');
    }

    // Salvar análise no banco de dados
    console.log("💾 [5/5] Salvando análise no banco de dados...");
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('health_analysis')
      .upsert({
        user_id: user.id,
        health_score: analysis.health_score,
        analysis_summary: {
          summary: analysis.summary,
          evolution: analysis.evolution || [],
          patient_view: analysis.patient_view || null
        },
        attention_points: analysis.attention_points || [],
        specialist_recommendations: analysis.specialists || [],
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ Erro ao salvar análise:', saveError);
      throw saveError;
    }

    // LOG 5: Processo concluído
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    console.log("═══════════════════════════════════════");
    console.log("✅ [5/5] ANALYZE-EXAMS-INTEGRATED CONCLUÍDO");
    console.log(`⏱️  Tempo total: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
    console.log(`📊 Resumo:`);
    console.log(`   - Exames analisados: ${examImages.length}`);
    console.log(`   - Parâmetros processados: ${examResults?.length || 0}`);
    console.log(`   - Health Score: ${analysis.health_score}/10`);
    console.log(`   - Alertas criados: ${criticalAlerts.length}`);
    console.log(`   - Tempo AI: ${aiEndTime - aiStartTime}ms`);
    console.log("═══════════════════════════════════════");

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis: savedAnalysis || analysis
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.error(`[${errorId}] Error in analyze-exams-integrated:`, {
      error,
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao analisar exames. Por favor, tente novamente.',
        errorId,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});