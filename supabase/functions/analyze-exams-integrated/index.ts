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

    // Buscar todos os exames do usuário com resultados
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
      console.error('Error fetching exams:', examError);
      throw examError;
    }

    if (!examImages || examImages.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Nenhum exame processado encontrado. Faça upload de exames primeiro.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar resultados de exames
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

    // Chamar Claude AI para análise integrada
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const prompt = `Você é um assistente médico especializado em análise de exames laboratoriais.

Analise os seguintes exames do paciente e forneça:

1. **Score de Saúde (0-10)**: Uma pontuação geral baseada em todos os exames
2. **Análise Integrada**: Insights sobre o estado geral de saúde, considerando todos os exames juntos
3. **Pontos de Atenção**: Lista de parâmetros alterados que merecem atenção, agrupados por categoria
4. **Evolução**: Se houver exames da mesma categoria em datas diferentes, analise a evolução
5. **Recomendações de Especialistas**: Sugira especialistas médicos que o paciente deve consultar com base nos resultados
6. **Análise para o Paciente**: Versão simplificada em linguagem clara, sem termos médicos complexos

Exames do paciente:
${JSON.stringify(examsSummary, null, 2)}

IMPORTANTE: 
- Seja claro e objetivo
- Use linguagem acessível mas técnica quando necessário
- Identifique padrões entre diferentes exames
- Destaque qualquer tendência preocupante ou melhora
- Seja conservador nas recomendações - sempre sugira consultar médico quando houver dúvidas

Responda em formato JSON com a seguinte estrutura:
{
  "health_score": número de 0 a 10,
  "summary": "texto de resumo geral",
  "attention_points": [
    {
      "category": "nome da categoria",
      "parameter": "nome do parâmetro",
      "value": "valor encontrado",
      "status": "alto/baixo/crítico",
      "recommendation": "o que fazer"
    }
  ],
  "evolution": [
    {
      "category": "nome da categoria",
      "trend": "melhorando/piorando/estável",
      "details": "detalhes da evolução"
    }
  ],
  "specialists": [
    {
      "specialty": "nome da especialidade",
      "reason": "motivo da recomendação",
      "priority": "alta/média/baixa"
    }
  ],
  "patient_view": {
    "summary": {
      "normal_count": número de exames normais,
      "attention_count": número de exames que precisam atenção,
      "critical_count": número de exames críticos,
      "message": "mensagem encorajadora para o paciente"
    },
    "grouped_results": [
      {
        "group_name": "nome simples da categoria (ex: Açúcar no Sangue, Gorduras, Fígado)",
        "icon": "emoji apropriado",
        "status": "normal|warning|critical",
        "simple_explanation": "explicação em linguagem MUITO simples (máximo 2 frases)",
        "key_values": [
          {
            "name": "nome do parâmetro",
            "value": "valor com unidade",
            "status": "normal|warning|critical",
            "simple_meaning": "o que significa em termos simples"
          }
        ]
      }
    ],
    "key_insights": [
      {
        "title": "título curto e claro",
        "description": "explicação simples do achado importante",
        "color": "green|yellow|red|blue",
        "action": "o que fazer sobre isso (linguagem simples)"
      }
    ]
  }
}`;

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        messages: [
          { role: 'user', content: prompt }
        ]
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente mais tarde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos ao seu workspace Lovable AI.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error('Erro ao processar análise com IA');
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.content[0].text;
    const analysis = JSON.parse(analysisText);

    // Buscar parâmetros de referência para detectar valores críticos
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
        console.error('Error creating alerts:', alertsError);
      } else {
        console.log(`Created ${criticalAlerts.length} health alerts`);
      }
    }

    // Salvar análise no banco de dados
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
      console.error('Error saving analysis:', saveError);
    }

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
    console.error('Error in analyze-exams-integrated:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao processar análise';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});