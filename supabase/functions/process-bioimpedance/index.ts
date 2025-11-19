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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

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

    // Rate limiting: 10 requests per minute for AI-powered bioimpedance processing
    const { data: rateLimitResult } = await supabase.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_endpoint: 'process-bioimpedance',
      p_max_requests: 10,
      p_window_seconds: 60
    });

    if (rateLimitResult && !rateLimitResult.allowed) {
      console.log('Rate limit exceeded for user:', user.id);
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please wait before processing more images.',
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

    const { imageUrl } = await req.json();

    console.log('Processing bioimpedance image:', imageUrl);

    // Fetch image from URL
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Call Lovable AI Gateway for OCR and analysis
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              },
              {
                type: 'text',
                text: `Analise esta imagem de exame de BIOIMPEDÂNCIA e extraia TODOS os dados numéricos visíveis.

🎯 DADOS OBRIGATÓRIOS (procure com atenção máxima):
- PESO (weight): Valores em kg - pode estar como "Peso", "Weight", "Körpergewicht"
- GORDURA CORPORAL (body_fat_percentage): % de gordura - "Body Fat", "Gordura Corporal", "BF%"
- MASSA MUSCULAR (muscle_mass): Massa magra em kg - "Muscle Mass", "Massa Muscular", "MM"
- ÁGUA (water_percentage): % de água - "Water", "Hidratação", "TBW"

📊 DADOS COMPLEMENTARES (extraia se disponível):
- IMC (bmi): Índice de Massa Corporal
- GORDURA VISCERAL (visceral_fat): Nível de gordura visceral (geralmente 1-30)
- TAXA METABÓLICA BASAL (bmr): Calorias em repouso
- TAXA MUSCULAR (muscle_percentage): Porcentagem de músculo
- MASSA ÓSSEA (bone_mass): Massa óssea em kg
- IDADE METABÓLICA (metabolic_age): Idade metabólica em anos
- PROTEÍNA (protein_percentage): Porcentagem de proteína

Retorne um JSON completo:
{
  "weight": número em kg (OBRIGATÓRIO),
  "body_fat_percentage": porcentagem de gordura,
  "muscle_mass": massa muscular em kg,
  "water_percentage": porcentagem de água,
  "measurement_date": data da medição no formato YYYY-MM-DD (ou data atual se não encontrar),
  "additional_data": {
    "bmi": IMC,
    "visceral_fat": gordura visceral (número),
    "basal_metabolic_rate": TMB em kcal,
    "muscle_percentage": porcentagem muscular,
    "bone_mass": massa óssea em kg,
    "metabolic_age": idade metabólica,
    "protein_percentage": porcentagem de proteína,
    "device_brand": marca do equipamento se visível,
    "notes": qualquer observação relevante
  }
}

⚠️ IMPORTANTE: 
- Se NÃO encontrar o PESO, retorne um erro explicando que não conseguiu ler
- Seja preciso com os valores decimais (use ponto como separador)
- Se um dado não estiver visível, use null
- Retorne APENAS o JSON, sem markdown ou explicações`
              }
            ]
          }
        ]
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    console.log('AI Response:', aiContent);

    // Parse JSON from AI response
    let extractedData;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      throw new Error('Failed to parse AI response');
    }

    // Validate critical data
    if (!extractedData.weight || extractedData.weight === null) {
      console.error('Weight not found in AI response:', extractedData);
      return new Response(
        JSON.stringify({ 
          error: 'Não foi possível extrair o peso da imagem. Por favor, certifique-se de que a imagem mostra claramente os dados de bioimpedância, especialmente o peso corporal.',
          details: 'Weight data is required but was not found in the image'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate comprehensive AI analysis
    const analysisPrompt = `Você é um especialista em composição corporal e análise de bioimpedância. Analise os seguintes dados:

📊 DADOS MEDIDOS:
- Peso: **${extractedData.weight}kg**
${extractedData.body_fat_percentage ? `- Gordura Corporal: **${extractedData.body_fat_percentage}%**` : ''}
${extractedData.muscle_mass ? `- Massa Muscular: **${extractedData.muscle_mass}kg**` : ''}
${extractedData.water_percentage ? `- Água Corporal: **${extractedData.water_percentage}%**` : ''}
${extractedData.additional_data?.bmi ? `- IMC: **${extractedData.additional_data.bmi}**` : ''}
${extractedData.additional_data?.visceral_fat ? `- Gordura Visceral: **${extractedData.additional_data.visceral_fat}**` : ''}
${extractedData.additional_data?.basal_metabolic_rate ? `- Taxa Metabólica Basal: **${extractedData.additional_data.basal_metabolic_rate} kcal**` : ''}
${extractedData.additional_data?.muscle_percentage ? `- Taxa Muscular: **${extractedData.additional_data.muscle_percentage}%**` : ''}

Retorne uma análise completa e profissional em português brasileiro no seguinte formato JSON:
{
  "summary": "Resumo executivo em 2-3 frases destacando os principais indicadores. Use **negrito** nos valores e emojis relevantes (🎯📊💪⚡🔥✨)",
  "critical_points": [
    "Ponto de atenção 1 com **valores** em negrito e emoji apropriado",
    "Ponto de atenção 2 com contexto e explicação clara"
  ],
  "positive_points": [
    "Aspecto positivo 1 com **dados** específicos e emoji motivacional",
    "Aspecto positivo 2 destacando conquistas"
  ],
  "recommendations": [
    "💡 Recomendação 1 específica e acionável",
    "💡 Recomendação 2 baseada nos dados",
    "💡 Recomendação 3 para melhorar composição corporal"
  ],
  "health_insights": {
    "body_composition": "Análise da composição corporal geral",
    "hydration_status": "Status de hidratação",
    "metabolic_health": "Saúde metabólica baseada nos indicadores",
    "risk_factors": "Fatores de risco identificados (se houver)"
  }
}

🎯 DIRETRIZES:
- Seja técnico mas compreensível
- Use **negrito** em todos os valores numéricos e termos importantes
- Adicione emojis relevantes para cada categoria
- Seja específico e baseie-se nos dados fornecidos
- Identifique padrões e tendências quando possível
- Forneça recomendações práticas e acionáveis`;

    const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: analysisPrompt }
        ]
      }),
    });

    let analysis = null;
    if (analysisResponse.ok) {
      const analysisData = await analysisResponse.json();
      const analysisContent = analysisData.choices[0].message.content;
      
      try {
        const jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('Error parsing analysis:', e);
      }
    }

    // Insert measurement into database
    const { data: measurement, error: insertError } = await supabase
      .from('bioimpedance_measurements')
      .insert({
        user_id: user.id,
        weight: extractedData.weight,
        body_fat_percentage: extractedData.body_fat_percentage,
        muscle_mass: extractedData.muscle_mass,
        water_percentage: extractedData.water_percentage,
        measurement_date: extractedData.measurement_date || new Date().toISOString().split('T')[0],
        notes: extractedData.additional_data ? JSON.stringify(extractedData.additional_data) : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    console.log('Measurement saved:', measurement);

    // Update goal progress
    try {
      await supabase.functions.invoke('update-goal-progress', {
        body: { measurementId: measurement.id }
      });
    } catch (goalError) {
      console.error('Error updating goal progress:', goalError);
      // Don't fail the request if goal update fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        measurement,
        extractedData,
        analysis
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in process-bioimpedance:', error);
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
