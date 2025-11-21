import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Rate limiting: 15 requests per minute for OCR preview (lighter than full processing)
    const { data: rateLimitResult } = await supabase.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_endpoint: 'preview-ocr',
      p_max_requests: 15,
      p_window_seconds: 60
    });

    if (rateLimitResult && !rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          retry_after: rateLimitResult.retry_after
        }), 
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { imageUrl } = await req.json();

    console.log('Preview OCR for image:', imageUrl);

    // Fetch image
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Call Lovable AI for quick OCR extraction
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
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
                text: `Extraia RAPIDAMENTE os dados visíveis desta bioimpedância:

Retorne JSON:
{
  "weight": número em kg,
  "body_fat_percentage": % gordura,
  "muscle_mass": massa muscular kg,
  "water_percentage": % água,
  "measurement_date": "YYYY-MM-DD",
  "additional_data": {
    "bmi": IMC,
    "visceral_fat": gordura visceral,
    "basal_metabolic_rate": TMB kcal,
    "metabolic_age": idade metabólica
  }
}

Apenas JSON, sem explicações.`
              }
            ]
          }
        ]
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'AI rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    console.log('Preview OCR result:', aiContent);

    // Parse JSON
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract data from image');
    }

    const extractedData = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({ 
        success: true,
        data: extractedData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Preview OCR error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Preview error',
        success: false
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
