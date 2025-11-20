import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
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

    // Rate limiting: 10 requests per minute for OCR processing
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { data: rateLimitResult } = await supabaseAdmin.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_endpoint: 'process-ocr',
      p_max_requests: 10,
      p_window_seconds: 60
    });

    if (rateLimitResult && !rateLimitResult.allowed) {
      console.log('Rate limit exceeded for user:', user.id);
      return new Response(
        JSON.stringify({ 
          error: 'Limite de processamentos OCR excedido. Por favor, aguarde antes de processar mais imagens.',
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

    // LOG 1: Início do processamento OCR
    console.log("═══════════════════════════════════════");
    console.log("🚀 PROCESS-OCR INICIADO");
    console.log("═══════════════════════════════════════");
    console.log("📋 User ID:", user.id);
    console.log("📋 Exam Image ID:", examImageId);
    console.log("📋 Image URL:", imageUrl.substring(0, 80) + "...");
    const startTime = Date.now();

    // Update status to processing
    await supabase
      .from('exam_images')
      .update({ processing_status: 'processing' })
      .eq('id', examImageId);
    
    console.log("✅ [1/6] Status atualizado para 'processing'");

    // Download the image/PDF to get base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error("Failed to download image:", imageResponse.status);
      throw new Error("Falha ao baixar imagem");
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    
    // LOG 2: Download concluído
    const downloadTime = Date.now();
    console.log(`✅ [2/6] Imagem baixada: ${(imageBuffer.byteLength / 1024).toFixed(2)} KB em ${downloadTime - startTime}ms`);
    
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

    // LOG 3: Base64 convertido
    const base64Time = Date.now();
    // LOG 4: Iniciando chamada para Lovable AI
    const aiStartTime = Date.now();
    console.log("🤖 [4/6] Chamando Lovable AI (Gemini 2.5 Flash) para OCR...");

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

    // LOG 5: OCR concluído
    const ocrTime = Date.now();
    console.log(`✅ [5/6] OCR concluído em ${ocrTime - aiStartTime}ms`);
    console.log(`📊 Texto extraído: ${extractedText.substring(0, 200)}...`);

    let extractedData;
    try {
      extractedData = extractJSON(extractedText);
      console.log(`✅ JSON parseado com sucesso:`, {
        exam_name: extractedData.exam_name,
        category: extractedData.category,
        parameters: extractedData.parameters?.length || 0
      });
    } catch (parseError) {
      console.error('⚠️ Erro ao parsear JSON, usando texto bruto');
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
          console.error('❌ Erro ao inserir resultados:', resultsError);
        } else {
          console.log(`✅ ${resultsToInsert.length} parâmetros inseridos na tabela exam_results`);
        }
      }
    }

    // LOG 6: Processo concluído
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    console.log("═══════════════════════════════════════");
    console.log(`✅ [6/6] PROCESS-OCR CONCLUÍDO COM SUCESSO`);
    console.log(`⏱️  Tempo total: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
    console.log(`📊 Breakdown:`);
    console.log(`   - Download: ${downloadTime - startTime}ms`);
    console.log(`   - Base64: ${base64Time - downloadTime}ms`);
    console.log(`   - AI OCR: ${ocrTime - aiStartTime}ms`);
    console.log(`   - DB Save: ${endTime - ocrTime}ms`);
    console.log("═══════════════════════════════════════");

    return new Response(
      JSON.stringify({ 
        success: true,
        examId: examImageId,
        extractedData
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.error(`[${errorId}] Error in process-ocr:`, {
      error,
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao processar OCR. Por favor, tente novamente.',
        errorId,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
