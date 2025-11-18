import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autenticação necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageUrl, examImageId } = await req.json();
    
    // Validate input
    if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
      return new Response(
        JSON.stringify({ error: 'URL de imagem inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!examImageId || typeof examImageId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'ID de exame inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Verify user authentication and ownership
    const authSupabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify ownership of the exam image
    const { data: examImage, error: fetchError } = await authSupabase
      .from('exam_images')
      .select('user_id')
      .eq('id', examImageId)
      .single();

    if (fetchError || !examImage) {
      return new Response(
        JSON.stringify({ error: 'Imagem de exame não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (examImage.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Você não tem permissão para processar esta imagem' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for database updates
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Check if file is PDF - not supported
    if (imageUrl.toLowerCase().includes('.pdf')) {
      await supabase
        .from('exam_images')
        .update({ processing_status: 'failed' })
        .eq('id', examImageId);
      
      return new Response(
        JSON.stringify({ error: 'PDFs não são suportados. Por favor, envie imagens nos formatos JPG, PNG ou WEBP.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Processing OCR for authenticated user, exam image ID:", examImageId);
    console.log("Image URL:", imageUrl);

    // Update status to processing
    await supabase
      .from('exam_images')
      .update({ processing_status: 'processing' })
      .eq('id', examImageId);

    // Download the image/PDF to get base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error("Failed to download image:", imageResponse.status);
      throw new Error("Falha ao baixar imagem");
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    
    // Convert ArrayBuffer to base64 in chunks to avoid call stack overflow
    const bytes = new Uint8Array(imageBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64Image = btoa(binary);
    
    // Determine mime type based on URL extension
    let mimeType = 'image/jpeg';
    if (imageUrl.toLowerCase().includes('.png')) {
      mimeType = 'image/png';
    } else if (imageUrl.toLowerCase().includes('.webp')) {
      mimeType = 'image/webp';
    }
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    console.log("Image downloaded, size:", imageBuffer.byteLength, "bytes, type:", mimeType);

    // Use Lovable AI with vision to extract structured data from the image
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analise esta imagem de exame médico e extraia as informações de forma estruturada.
    
Retorne um JSON com a seguinte estrutura:
{
  "exam_name": "nome do exame ou tipo (ex: Hemograma Completo, Perfil Lipídico)",
  "exam_date": "data do exame no formato YYYY-MM-DD",
  "lab_name": "nome do laboratório",
  "category": "categoria macro do exame (Hemograma, Perfil Lipídico, Glicemia, Função Renal, Função Hepática, Tireoide, Vitaminas, Hormônios, ou Outro)",
  "parameters": [
    {
      "name": "nome do parâmetro",
      "value": "valor numérico (apenas número, sem unidade)",
      "unit": "unidade de medida",
      "reference": "valores de referência quando disponíveis",
      "status": "normal, alto, baixo, ou crítico baseado nos valores de referência"
    }
  ],
  "full_text": "texto completo extraído do exame de forma organizada"
}

Seja preciso na extração. Se não conseguir identificar alguma informação, use null.`
              },
              {
                type: "image_url",
                image_url: {
                  url: dataUrl
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("AI gateway error:", response.status, errorBody);
      
      await supabase
        .from('exam_images')
        .update({ processing_status: 'failed' })
        .eq('id', examImageId);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Erro ao processar imagem: ${errorBody}`);
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content;

    if (!extractedText) {
      throw new Error("Nenhum texto extraído da imagem");
    }

    let extractedData;
    try {
      extractedData = JSON.parse(extractedText);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      extractedData = { full_text: extractedText };
    }

    // Buscar categoria do exame
    let categoryId = null;
    if (extractedData.category) {
      const { data: category } = await supabase
        .from('exam_categories')
        .select('id')
        .ilike('name', `%${extractedData.category}%`)
        .single();
      
      if (category) {
        categoryId = category.id;
      }
    }

    // Atualizar o registro com o texto extraído e informações estruturadas
    const { error: updateError } = await supabase
      .from('exam_images')
      .update({
        ocr_text: extractedData.full_text || extractedText,
        processing_status: 'completed',
        exam_date: extractedData.exam_date || null,
        lab_name: extractedData.lab_name || null,
        exam_category_id: categoryId
      })
      .eq('id', examImageId);

    if (updateError) {
      console.error('Error updating exam with OCR text:', updateError);
      throw updateError;
    }

    // Salvar parâmetros extraídos se houver
    if (extractedData.parameters && Array.isArray(extractedData.parameters)) {
      const resultsToInsert = extractedData.parameters.map((param: any) => ({
        exam_image_id: examImageId,
        parameter_name: param.name,
        value: param.value ? parseFloat(param.value) : null,
        value_text: param.value?.toString() || null,
        unit: param.unit || null,
        status: param.status || 'normal'
      }));

      if (resultsToInsert.length > 0) {
        const { error: resultsError } = await supabase
          .from('exam_results')
          .insert(resultsToInsert);

        if (resultsError) {
          console.error('Error inserting exam results:', resultsError);
        }
      }
    }

    console.log("OCR processing completed successfully for exam:", examImageId);

    return new Response(
      JSON.stringify({ 
        success: true,
        examId: examImageId,
        extractedData
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-ocr function:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao processar OCR";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
