import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIWithRetry } from '../_shared/aiRetry.ts';
import { extractJSON } from '../_shared/jsonParser.ts';
import { analysisSchema, type AnalysisResult } from '../_shared/aiSchemas.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';",
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

    // Rate limiting
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

    console.log("═══════════════════════════════════════");
    console.log("🧬 ANALYZE-EXAMS-INTEGRATED INICIADO");
    console.log("═══════════════════════════════════════");
    console.log("📋 User ID:", user.id);
    const startTime = Date.now();

    // Buscar exames processados
    console.log("🔍 [1/6] Buscando exames processados...");
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

    console.log(`✅ [1/6] ${examImages.length} exames encontrados`);

    // Buscar parâmetros de referência clínica
    console.log("🔍 [2/6] Buscando parâmetros de referência clínica...");
    const { data: clinicalParams, error: paramsError } = await supabase
      .from('clinical_reference_parameters')
      .select('*');
    
    if (paramsError) {
      console.error('⚠️ Erro ao buscar parâmetros clínicos:', paramsError);
    }
    console.log(`✅ [2/6] ${clinicalParams?.length || 0} parâmetros clínicos carregados`);

    // Buscar resultados de exames
    console.log("🔍 [3/6] Buscando resultados dos exames...");
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

    // Preparar dados enriquecidos com parâmetros clínicos
    const examsSummary = examImages.map(exam => {
      const results = (examResults || [])
        .filter(r => r.exam_image_id === exam.id)
        .map(r => {
          const clinicalParam = clinicalParams?.find(p => 
            p.parameter_name.toLowerCase() === r.parameter_name.toLowerCase()
          );
          
          return {
            name: r.parameter_name,
            value: r.value || r.value_text,
            unit: r.unit,
            status: r.status,
            reference_min: clinicalParam?.reference_min,
            reference_max: clinicalParam?.reference_max,
            critical_min: clinicalParam?.critical_min,
            critical_max: clinicalParam?.critical_max,
            category: clinicalParam?.parameter_category,
            related_conditions: clinicalParam?.related_conditions || []
          };
        });

      return {
        id: exam.id,
        category: (exam.exam_categories as any)?.name || 'Não categorizado',
        type: (exam.exam_types as any)?.name || 'Não especificado',
        date: exam.exam_date,
        lab: exam.lab_name,
        results
      };
    }).filter(exam => exam.results.length > 0);

    console.log(`✅ [3/6] ${examResults?.length || 0} resultados de parâmetros carregados`);

    if (examsSummary.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Nenhum resultado de exame encontrado para análise.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Chamar AI para análise integrada com pré-diagnósticos
    console.log("🤖 [4/6] Chamando AI para análise integrada com pré-diagnósticos...");
    const aiStartTime = Date.now();

    const prompt = `Você é um assistente médico especializado em análise de exames laboratoriais.

Analise os seguintes exames do paciente e forneça uma análise INTEGRADA E AGRUPADA:

DADOS DOS EXAMES:
${JSON.stringify(examsSummary, null, 2)}

PARÂMETROS DE REFERÊNCIA CLÍNICA DISPONÍVEIS:
${JSON.stringify(clinicalParams, null, 2)}

INSTRUÇÕES IMPORTANTES:

1. **PRÉ-DIAGNÓSTICOS**: Agrupe parâmetros alterados que juntos possam indicar condições clínicas específicas:
   - Síndrome Metabólica (HOMA-IR elevado, dislipidemia, HDL baixo)
   - Esteatose Hepática (TGO/TGP/GGT elevados em ultrassom)
   - Desbalanço Vitamínico (B12, Folato, Vitamina C, Vitamina D baixos)
   - Anemia/Microcitose (Ferro, Ferritina, VCM, HCM baixos)
   - Risco Cardiovascular (colesterol, triglicerídeos, LDL elevados)

2. **AGRUPAMENTO POR CATEGORIA**: Organize resultados por categorias clínicas:
   - Glicemia e Insulina
   - Lipidograma
   - Função Hepática
   - Vitaminas
   - Hemograma/Ferro

3. **COMPARAÇÃO COM REFERÊNCIAS**: Para cada parâmetro:
   - Compare com os valores de referência fornecidos
   - Identifique se está normal, elevado, baixo ou crítico
   - Calcule a faixa de referência (reference_min - reference_max)

4. **DISCLAIMER MÉDICO**: Esta análise é educacional e NÃO substitui consulta médica profissional.

Retorne APENAS um JSON válido com a estrutura:
{
  "health_score": <número 0-10>,
  "summary": "<resumo geral>",
  "pre_diagnostics": [
    {
      "name": "<nome do possível pré-diagnóstico>",
      "severity": "high|medium|low",
      "related_parameters": [
        {
          "name": "<nome do parâmetro>",
          "value": <valor>,
          "unit": "<unidade>",
          "status": "normal|alto|baixo|critico"
        }
      ],
      "explanation": "<explicação simples do que está acontecendo>",
      "recommendations": ["<recomendação 1>", "<recomendação 2>"]
    }
  ],
  "grouped_results": [
    {
      "category_name": "<nome da categoria ex: Glicemia e Insulina>",
      "category_icon": "<ícone sugerido: heart, droplet, activity, pill, etc>",
      "parameters": [
        {
          "name": "<nome do parâmetro>",
          "value": <valor>,
          "unit": "<unidade>",
          "status": "normal|alto|baixo|critico",
          "reference_range": "<min - max valores de referência>"
        }
      ]
    }
  ],
  "attention_points": [
    {
      "category": "<categoria>",
      "parameter": "<parâmetro>",
      "value": <valor>,
      "severity": "high|medium|low",
      "recommendation": "<recomendação>"
    }
  ],
  "specialists": [
    {
      "specialty": "<especialidade médica>",
      "reason": "<motivo da recomendação>",
      "priority": "urgent|high|medium|low"
    }
  ]
}`;

    let analysis: AnalysisResult;
    
    try {
      const aiResponse = await callAIWithRetry({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'user', content: prompt }
        ]
      }, user.id, 'analyze-exams-integrated', {
        maxRetries: 3,
        supabase,
        onRetry: (attempt, error) => {
          console.log(`⚠️ Tentativa ${attempt}/3 - Erro: ${error.message}`);
          console.log(`🔄 Refazendo análise com IA...`);
        }
      });

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
      
      // Extrair e validar JSON com schema Zod
      analysis = extractJSON<AnalysisResult>(analysisText, analysisSchema);
      
      console.log('✅ Análise validada com sucesso pelo schema Zod');
      console.log(`📊 Pré-diagnósticos identificados: ${analysis.pre_diagnostics?.length || 0}`);
      console.log(`📋 Categorias agrupadas: ${analysis.grouped_results?.length || 0}`);
      
    } catch (retryError) {
      console.error('❌ Erro após todas as tentativas:', retryError);
      
      return new Response(
        JSON.stringify({ 
          error: 'Falha ao processar análise após múltiplas tentativas. Por favor, tente novamente.',
          details: retryError instanceof Error ? retryError.message : 'Erro desconhecido'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiEndTime = Date.now();
    console.log(`✅ [4/6] Análise IA concluída em ${aiEndTime - aiStartTime}ms`);
    console.log(`📊 Health Score calculado: ${analysis.health_score}/10`);

    // Criar alertas para valores críticos
    console.log("🔍 [5/6] Verificando valores críticos e criando alertas...");
    const { data: examParameters } = await supabase
      .from('exam_parameters')
      .select('*');

    const criticalAlerts = [];
    for (const exam of examsSummary) {
      for (const result of exam.results) {
        if (result.value) {
          const parameter = examParameters?.find(
            p => p.parameter_name.toLowerCase() === result.name.toLowerCase()
          );

          if (parameter) {
            let shouldAlert = false;
            let thresholdType: 'high' | 'low' = 'high';
            let criticalThreshold = 0;
            let severity: 'warning' | 'critical' = 'warning';

            if (parameter.critical_high && result.value > parameter.critical_high) {
              shouldAlert = true;
              thresholdType = 'high';
              criticalThreshold = parameter.critical_high;
              severity = 'critical';
            }
            else if (parameter.critical_low && result.value < parameter.critical_low) {
              shouldAlert = true;
              thresholdType = 'low';
              criticalThreshold = parameter.critical_low;
              severity = 'critical';
            }
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
                parameter_name: result.name,
                value: result.value,
                critical_threshold: criticalThreshold,
                threshold_type: thresholdType,
                severity
              });
            }
          }
        }
      }
    }

    if (criticalAlerts.length > 0) {
      console.log(`⚠️ ${criticalAlerts.length} alertas críticos identificados. Criando alertas...`);
      const { error: alertError } = await supabase
        .from('health_alerts')
        .insert(criticalAlerts);

      if (alertError) {
        console.error('Erro ao criar alertas:', alertError);
      } else {
        console.log(`✅ ${criticalAlerts.length} alertas criados com sucesso`);
      }
    }

    console.log(`✅ [5/6] Alertas processados`);

    // Salvar análise no banco
    console.log("💾 [6/6] Salvando análise no banco de dados...");
    const { error: saveError } = await supabase
      .from('health_analysis')
      .upsert({
        user_id: user.id,
        health_score: analysis.health_score,
        analysis_summary: {
          summary: analysis.summary,
          evolution: analysis.evolution,
          patient_view: analysis.patient_view,
          pre_diagnostics: analysis.pre_diagnostics,
          grouped_results: analysis.grouped_results
        },
        attention_points: analysis.attention_points,
        specialist_recommendations: analysis.specialists,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (saveError) {
      console.error('Erro ao salvar análise:', saveError);
    } else {
      console.log('✅ Análise salva com sucesso');
    }

    const totalTime = Date.now() - startTime;
    console.log("═══════════════════════════════════════");
    console.log(`✅ ANÁLISE INTEGRADA CONCLUÍDA EM ${totalTime}ms`);
    console.log("═══════════════════════════════════════");

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis,
        processing_time_ms: totalTime,
        alerts_created: criticalAlerts.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Erro geral:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao processar análise'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});