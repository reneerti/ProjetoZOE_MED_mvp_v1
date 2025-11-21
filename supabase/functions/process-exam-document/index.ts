/**
 * Serviço Unificado de Processamento de Exames
 *
 * Nova arquitetura:
 * 1. OCR dedicado (OCR.space/Google Vision) - extração de texto
 * 2. Processamento de PDF (conversão para imagem)
 * 3. IA para estruturação de dados (após OCR)
 * 4. Cache inteligente com processamento incremental
 *
 * Fluxo:
 * Upload → Detectar tipo → OCR/PDF → Estruturar com IA → Cache → Banco
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
import { extractTextFromImage, validateOCRResult, type OCRResult } from '../_shared/ocrService.ts';
import { processPDF, isPDF, type PDFProcessingResult } from '../_shared/pdfProcessor.ts';
import { analyzeExamsWithAI, analyzeImageWithAI, type AIResponse } from '../_shared/aiProviders.ts';
import { createCacheService, generateCacheKey } from '../_shared/cacheService.ts';
import { ocrExtractionSchema, type OCRExtraction } from '../_shared/aiSchemas.ts';
import { extractJSON } from '../_shared/jsonParser.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';",
};

interface ProcessingResult {
  success: boolean;
  examId: string;
  extractedData?: OCRExtraction;
  ocrProvider?: string;
  aiProvider?: string;
  processingTime: number;
  cached?: boolean;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // ═══════════════════════════════════════
    // 1. AUTENTICAÇÃO
    // ═══════════════════════════════════════
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autenticação necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verificar usuário
    const authSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═══════════════════════════════════════
    // 2. VALIDAÇÃO DE INPUT
    // ═══════════════════════════════════════
    const { fileUrl, examImageId, forceReprocess } = await req.json();

    if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.startsWith('http')) {
      return new Response(
        JSON.stringify({ error: 'URL de arquivo inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!examImageId || typeof examImageId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'ID de exame inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═══════════════════════════════════════
    // 3. RATE LIMITING
    // ═══════════════════════════════════════
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: rateLimitResult } = await supabaseAdmin.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_endpoint: 'process-exam-document',
      p_max_requests: 15,
      p_window_seconds: 60
    });

    if (rateLimitResult && !rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Limite de processamentos excedido. Aguarde antes de processar mais documentos.',
          retry_after: rateLimitResult.retry_after,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retry_after || 60),
          },
        }
      );
    }

    // ═══════════════════════════════════════
    // 4. VERIFICAR PROPRIEDADE DO EXAME
    // ═══════════════════════════════════════
    const { data: examImage, error: fetchError } = await authSupabase
      .from('exam_images')
      .select('user_id, processing_status')
      .eq('id', examImageId)
      .single();

    if (fetchError || !examImage) {
      return new Response(
        JSON.stringify({ error: 'Exame não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (examImage.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Você não tem permissão para processar este exame' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═══════════════════════════════════════
    // 5. VERIFICAR CACHE
    // ═══════════════════════════════════════
    const cacheService = createCacheService();
    const cacheKey = generateCacheKey('process-exam', user.id, fileUrl);

    if (!forceReprocess) {
      const cachedResult = await cacheService.get<OCRExtraction>(cacheKey);
      if (cachedResult) {
        console.log('✅ Usando resultado do cache');
        return new Response(
          JSON.stringify({
            success: true,
            examId: examImageId,
            extractedData: cachedResult,
            cached: true,
            processingTime: Date.now() - startTime,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log("═══════════════════════════════════════");
    console.log("📄 PROCESS-EXAM-DOCUMENT INICIADO");
    console.log("═══════════════════════════════════════");
    console.log("📋 User ID:", user.id);
    console.log("📋 Exam ID:", examImageId);

    // Atualizar status para processando
    await supabaseAdmin
      .from('exam_images')
      .update({ processing_status: 'processing' })
      .eq('id', examImageId);

    // ═══════════════════════════════════════
    // 6. DOWNLOAD DO ARQUIVO
    // ═══════════════════════════════════════
    console.log("⬇️ [1/5] Baixando arquivo...");
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error("Falha ao baixar arquivo");
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);

    // Converter para base64
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < fileBytes.length; i += chunkSize) {
      const chunk = fileBytes.slice(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const fileBase64 = btoa(binary);

    console.log(`✅ [1/5] Arquivo baixado: ${(fileBuffer.byteLength / 1024).toFixed(2)} KB`);

    // ═══════════════════════════════════════
    // 7. DETECTAR TIPO E PROCESSAR
    // ═══════════════════════════════════════
    let extractedText = '';
    let ocrProvider = '';
    let aiProvider = '';

    const isPDFFile = isPDF(fileBase64) || fileUrl.toLowerCase().includes('.pdf');

    if (isPDFFile) {
      // PROCESSAR PDF
      console.log("📄 [2/5] Processando PDF...");

      const pdfResult: PDFProcessingResult = await processPDF(fileBase64, {
        maxPages: 5,
        dpi: 150,
      });

      if (!pdfResult.success || pdfResult.pages.length === 0) {
        await supabaseAdmin
          .from('exam_images')
          .update({ processing_status: 'failed' })
          .eq('id', examImageId);

        return new Response(
          JSON.stringify({ error: pdfResult.error || 'Falha ao processar PDF' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`✅ [2/5] PDF processado: ${pdfResult.pages.length} páginas`);

      // Extrair OCR de cada página
      const pageTexts: string[] = [];

      for (const page of pdfResult.pages) {
        if (page.text) {
          // Texto direto do PDF
          pageTexts.push(page.text);
        } else if (page.imageBase64) {
          // OCR da imagem
          const ocrResult = await extractTextFromImage(
            page.imageBase64,
            page.mimeType || 'image/png'
          );

          if (ocrResult.success) {
            pageTexts.push(ocrResult.text);
            ocrProvider = ocrResult.provider;
          }
        }
      }

      extractedText = pageTexts.join('\n\n--- Página ---\n\n');
    } else {
      // PROCESSAR IMAGEM
      console.log("🖼️ [2/5] Processando imagem com OCR...");

      // Determinar MIME type
      let mimeType = 'image/jpeg';
      if (fileUrl.toLowerCase().includes('.png')) {
        mimeType = 'image/png';
      } else if (fileUrl.toLowerCase().includes('.webp')) {
        mimeType = 'image/webp';
      }

      const ocrResult: OCRResult = await extractTextFromImage(fileBase64, mimeType);

      if (!ocrResult.success) {
        // Fallback: usar IA com visão para OCR
        console.log("⚠️ OCR tradicional falhou, usando IA com visão...");

        const visionResult = await analyzeImageWithAI(
          fileBase64,
          mimeType,
          `Extraia TODO o texto visível nesta imagem de exame médico.
           Mantenha a formatação original (colunas, tabelas).
           Inclua todos os valores numéricos, unidades e referências.`
        );

        if (visionResult.success) {
          extractedText = visionResult.content;
          ocrProvider = `ai_vision_${visionResult.provider}`;
          aiProvider = visionResult.provider;
        } else {
          await supabaseAdmin
            .from('exam_images')
            .update({ processing_status: 'failed' })
            .eq('id', examImageId);

          return new Response(
            JSON.stringify({ error: 'Não foi possível extrair texto da imagem' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        const validation = validateOCRResult(ocrResult);
        if (!validation.valid) {
          console.log(`⚠️ OCR inválido: ${validation.reason}`);
        }

        extractedText = ocrResult.text;
        ocrProvider = ocrResult.provider;
      }

      console.log(`✅ [2/5] OCR concluído via ${ocrProvider}: ${extractedText.length} caracteres`);
    }

    // ═══════════════════════════════════════
    // 8. ESTRUTURAR DADOS COM IA
    // ═══════════════════════════════════════
    console.log("🤖 [3/5] Estruturando dados com IA...");

    const structurePrompt = `Analise este texto extraído de um exame médico e extraia as informações de forma estruturada.

TEXTO DO EXAME:
${extractedText}

Retorne um JSON com a estrutura:
{
  "exam_name": "nome do exame ou tipo (ex: Hemograma Completo, Perfil Lipídico)",
  "exam_date": "data do exame no formato YYYY-MM-DD (ou null se não encontrar)",
  "lab_name": "nome do laboratório (ou null se não encontrar)",
  "category": "categoria macro do exame (Hemograma, Perfil Lipídico, Glicemia, Função Renal, Função Hepática, Tireoide, Vitaminas, Hormônios, ou Outro)",
  "parameters": [
    {
      "name": "nome do parâmetro",
      "value": "valor (apenas número, sem unidade)",
      "unit": "unidade de medida",
      "reference_range": "valores de referência",
      "status": "normal, alto, baixo, ou critico baseado nos valores de referência"
    }
  ]
}

REGRAS:
- Seja preciso na extração de valores numéricos
- Para status, compare o valor com a referência
- Se não conseguir identificar alguma informação, use null
- Extraia TODOS os parâmetros visíveis`;

    const aiResult: AIResponse = await analyzeExamsWithAI(structurePrompt);

    if (!aiResult.success) {
      await supabaseAdmin
        .from('exam_images')
        .update({ processing_status: 'failed' })
        .eq('id', examImageId);

      return new Response(
        JSON.stringify({ error: 'Falha ao estruturar dados do exame' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    aiProvider = aiResult.provider;
    console.log(`✅ [3/5] Dados estruturados via ${aiProvider}`);

    // ═══════════════════════════════════════
    // 9. VALIDAR E SALVAR DADOS
    // ═══════════════════════════════════════
    console.log("💾 [4/5] Validando e salvando dados...");

    let extractedData: OCRExtraction;
    try {
      extractedData = extractJSON<OCRExtraction>(aiResult.content, ocrExtractionSchema);
    } catch (parseError) {
      console.error('⚠️ Erro ao validar JSON:', parseError);
      // Tentar parse básico
      try {
        extractedData = JSON.parse(aiResult.content);
      } catch {
        extractedData = {
          exam_name: 'Exame não identificado',
          category: 'Outro',
          parameters: [],
        };
      }
    }

    // Buscar categoria do exame
    let categoryId = null;
    if (extractedData.category) {
      const { data: category } = await supabaseAdmin
        .from('exam_categories')
        .select('id')
        .ilike('name', `%${extractedData.category}%`)
        .single();

      if (category) {
        categoryId = category.id;
      }
    }

    // Atualizar exam_images
    const { error: updateError } = await supabaseAdmin
      .from('exam_images')
      .update({
        ocr_text: extractedText,
        processing_status: 'completed',
        exam_date: extractedData.exam_date || null,
        lab_name: extractedData.lab_name || null,
        exam_category_id: categoryId,
      })
      .eq('id', examImageId);

    if (updateError) {
      console.error('❌ Erro ao atualizar exame:', updateError);
      throw updateError;
    }

    // Salvar parâmetros extraídos
    if (extractedData.parameters && extractedData.parameters.length > 0) {
      // Limpar resultados anteriores
      await supabaseAdmin
        .from('exam_results')
        .delete()
        .eq('exam_image_id', examImageId);

      const resultsToInsert = extractedData.parameters.map(param => ({
        exam_image_id: examImageId,
        parameter_name: param.name,
        value: param.value ? parseFloat(String(param.value)) : null,
        value_text: String(param.value || ''),
        unit: param.unit || null,
        status: param.status || 'normal',
      }));

      const { error: resultsError } = await supabaseAdmin
        .from('exam_results')
        .insert(resultsToInsert);

      if (resultsError) {
        console.error('⚠️ Erro ao inserir resultados:', resultsError);
      } else {
        console.log(`✅ ${resultsToInsert.length} parâmetros salvos`);
      }
    }

    // ═══════════════════════════════════════
    // 10. SALVAR NO CACHE
    // ═══════════════════════════════════════
    console.log("📦 [5/5] Salvando no cache...");

    await cacheService.set(cacheKey, extractedData, {
      functionName: 'process-exam',
      provider: aiProvider,
      model: aiResult.model,
      tokensUsed: aiResult.tokensUsed,
      ttlHours: 168, // 1 semana
    });

    const totalTime = Date.now() - startTime;

    console.log("═══════════════════════════════════════");
    console.log(`✅ PROCESSAMENTO CONCLUÍDO EM ${totalTime}ms`);
    console.log(`   OCR: ${ocrProvider}`);
    console.log(`   IA: ${aiProvider}`);
    console.log(`   Parâmetros: ${extractedData.parameters?.length || 0}`);
    console.log("═══════════════════════════════════════");

    const result: ProcessingResult = {
      success: true,
      examId: examImageId,
      extractedData,
      ocrProvider,
      aiProvider,
      processingTime: totalTime,
      cached: false,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.error(`[${errorId}] Erro no processamento:`, error);

    return new Response(
      JSON.stringify({
        error: 'Erro ao processar documento. Tente novamente.',
        errorId,
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
