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
                text: `Analise esta imagem de exame de BIOIMPEDÂNCIA e extraia TODOS os dados numéricos.

CRÍTICO: SEMPRE procure e extraia os seguintes valores principais:
- PESO (weight): Normalmente aparece como "Peso", "Weight", ou valores em kg
- GORDURA CORPORAL (body_fat_percentage): % de gordura, "Body Fat", "Gordura"
- MASSA MUSCULAR (muscle_mass): Massa magra em kg, "Muscle Mass", "Massa Muscular"
- ÁGUA (water_percentage): % de água corporal, "Water", "Hidratação"

Procure também outros dados como: IMC, massa óssea, gordura visceral, taxa metabólica basal, etc.

Retorne um JSON no seguinte formato:
{
  "weight": número em kg (OBRIGATÓRIO - procure com atenção!),
  "body_fat_percentage": porcentagem de gordura corporal,
  "muscle_mass": massa muscular em kg,
  "water_percentage": porcentagem de água,
  "measurement_date": data da medição no formato YYYY-MM-DD,
  "additional_data": {
    "bmi": IMC se encontrado,
    "visceral_fat": gordura visceral se encontrado,
    "basal_metabolic_rate": taxa metabólica basal se encontrado,
    ... outros dados encontrados
  }
}

IMPORTANTE: Se não conseguir encontrar o PESO, retorne uma mensagem de erro explicando que não encontrou.
Retorne APENAS o JSON, sem markdown.`
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

    // Analyze with AI to identify critical values
    const analysisPrompt = `Analise os seguintes dados de bioimpedância e identifique pontos importantes e valores críticos:

Peso: ${extractedData.weight}kg
${extractedData.body_fat_percentage ? `Gordura Corporal: ${extractedData.body_fat_percentage}%` : ''}
${extractedData.muscle_mass ? `Massa Muscular: ${extractedData.muscle_mass}kg` : ''}
${extractedData.water_percentage ? `Água Corporal: ${extractedData.water_percentage}%` : ''}
${extractedData.additional_data ? `Dados Adicionais: ${JSON.stringify(extractedData.additional_data)}` : ''}

Retorne uma análise em português brasileiro no seguinte formato JSON:
{
  "summary": "Resumo geral em 2-3 linhas com **negritos** nos valores e emojis (🔥💪⚠️✅❤️)",
  "critical_points": [
    "**Ponto crítico 1** com emoji e explicação"
  ],
  "positive_points": [
    "**Ponto positivo 1** com emoji"
  ],
  "recommendations": [
    "Recomendação 1 com emoji"
  ]
}

IMPORTANTE: Use **negrito** em valores numéricos e termos técnicos. Use emojis relevantes.`;

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
