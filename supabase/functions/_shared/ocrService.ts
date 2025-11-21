/**
 * Serviço de OCR Dedicado - Separado da IA
 *
 * Este serviço usa APIs de OCR especializadas para extração de texto,
 * separando a responsabilidade de OCR do processamento de IA.
 *
 * Provedores suportados:
 * 1. OCR.space - API gratuita (25.000 req/mês)
 * 2. Tesseract.js via Worker - Fallback local
 * 3. Google Cloud Vision - Para produção (pago)
 */

export interface OCRResult {
  success: boolean;
  text: string;
  confidence: number;
  provider: 'ocr_space' | 'google_vision' | 'tesseract' | 'azure_vision';
  processingTime: number;
  error?: string;
  rawData?: any;
}

export interface OCROptions {
  language?: string;
  detectOrientation?: boolean;
  scale?: boolean;
  isTable?: boolean;
  ocrEngine?: 1 | 2 | 3; // OCR.space engines
}

/**
 * OCR.space - API Gratuita (25.000 requisições/mês)
 * Ideal para MVP
 */
async function ocrSpaceExtract(
  imageBase64: string,
  mimeType: string,
  apiKey: string,
  options: OCROptions = {}
): Promise<OCRResult> {
  const startTime = Date.now();

  try {
    const formData = new FormData();
    formData.append('base64Image', `data:${mimeType};base64,${imageBase64}`);
    formData.append('language', options.language || 'por'); // Português
    formData.append('detectOrientation', String(options.detectOrientation ?? true));
    formData.append('scale', String(options.scale ?? true));
    formData.append('isTable', String(options.isTable ?? true));
    formData.append('OCREngine', String(options.ocrEngine || 2)); // Engine 2 é melhor para documentos

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`OCR.space error: ${response.status}`);
    }

    const result = await response.json();

    if (result.IsErroredOnProcessing) {
      throw new Error(result.ErrorMessage?.[0] || 'OCR processing failed');
    }

    const parsedText = result.ParsedResults?.[0]?.ParsedText || '';
    const confidence = result.ParsedResults?.[0]?.TextOverlay?.Lines?.reduce(
      (acc: number, line: any) => acc + (line.MaxHeight || 0), 0
    ) / (result.ParsedResults?.[0]?.TextOverlay?.Lines?.length || 1) || 85;

    return {
      success: true,
      text: parsedText,
      confidence: Math.min(confidence, 100),
      provider: 'ocr_space',
      processingTime: Date.now() - startTime,
      rawData: result,
    };
  } catch (error) {
    return {
      success: false,
      text: '',
      confidence: 0,
      provider: 'ocr_space',
      processingTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'OCR.space failed',
    };
  }
}

/**
 * Google Cloud Vision OCR - Para produção
 */
async function googleVisionExtract(
  imageBase64: string,
  apiKey: string
): Promise<OCRResult> {
  const startTime = Date.now();

  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            image: { content: imageBase64 },
            features: [
              { type: 'DOCUMENT_TEXT_DETECTION' },
              { type: 'TEXT_DETECTION' }
            ],
            imageContext: {
              languageHints: ['pt', 'en']
            }
          }]
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Google Vision error: ${response.status}`);
    }

    const result = await response.json();
    const fullTextAnnotation = result.responses?.[0]?.fullTextAnnotation;
    const textAnnotations = result.responses?.[0]?.textAnnotations;

    if (!fullTextAnnotation && !textAnnotations?.length) {
      return {
        success: false,
        text: '',
        confidence: 0,
        provider: 'google_vision',
        processingTime: Date.now() - startTime,
        error: 'No text detected in image',
      };
    }

    // Calcular confiança média das palavras detectadas
    const pages = fullTextAnnotation?.pages || [];
    let totalConfidence = 0;
    let wordCount = 0;

    pages.forEach((page: any) => {
      page.blocks?.forEach((block: any) => {
        block.paragraphs?.forEach((para: any) => {
          para.words?.forEach((word: any) => {
            if (word.confidence) {
              totalConfidence += word.confidence;
              wordCount++;
            }
          });
        });
      });
    });

    const avgConfidence = wordCount > 0 ? (totalConfidence / wordCount) * 100 : 85;

    return {
      success: true,
      text: fullTextAnnotation?.text || textAnnotations?.[0]?.description || '',
      confidence: avgConfidence,
      provider: 'google_vision',
      processingTime: Date.now() - startTime,
      rawData: result,
    };
  } catch (error) {
    return {
      success: false,
      text: '',
      confidence: 0,
      provider: 'google_vision',
      processingTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Google Vision failed',
    };
  }
}

/**
 * Azure Computer Vision OCR - Alternativa enterprise
 */
async function azureVisionExtract(
  imageBase64: string,
  endpoint: string,
  apiKey: string
): Promise<OCRResult> {
  const startTime = Date.now();

  try {
    // Converter base64 para blob
    const imageBytes = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));

    const response = await fetch(
      `${endpoint}/vision/v3.2/read/analyze`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Ocp-Apim-Subscription-Key': apiKey,
        },
        body: imageBytes,
      }
    );

    if (!response.ok) {
      throw new Error(`Azure Vision error: ${response.status}`);
    }

    // Azure usa processamento assíncrono
    const operationLocation = response.headers.get('Operation-Location');
    if (!operationLocation) {
      throw new Error('No operation location returned');
    }

    // Poll para resultado
    let result;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusResponse = await fetch(operationLocation, {
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
        },
      });

      result = await statusResponse.json();

      if (result.status === 'succeeded') {
        break;
      } else if (result.status === 'failed') {
        throw new Error('Azure OCR processing failed');
      }

      attempts++;
    }

    if (!result || result.status !== 'succeeded') {
      throw new Error('Azure OCR timeout');
    }

    // Extrair texto de todas as linhas
    const lines: string[] = [];
    result.analyzeResult?.readResults?.forEach((page: any) => {
      page.lines?.forEach((line: any) => {
        lines.push(line.text);
      });
    });

    return {
      success: true,
      text: lines.join('\n'),
      confidence: 90, // Azure não retorna confiança diretamente
      provider: 'azure_vision',
      processingTime: Date.now() - startTime,
      rawData: result,
    };
  } catch (error) {
    return {
      success: false,
      text: '',
      confidence: 0,
      provider: 'azure_vision',
      processingTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Azure Vision failed',
    };
  }
}

/**
 * Serviço principal de OCR com fallback
 */
export async function extractTextFromImage(
  imageBase64: string,
  mimeType: string,
  options: OCROptions = {}
): Promise<OCRResult> {
  const OCR_SPACE_API_KEY = Deno.env.get('OCR_SPACE_API_KEY');
  const GOOGLE_VISION_API_KEY = Deno.env.get('GOOGLE_VISION_API_KEY');
  const AZURE_VISION_ENDPOINT = Deno.env.get('AZURE_VISION_ENDPOINT');
  const AZURE_VISION_API_KEY = Deno.env.get('AZURE_VISION_API_KEY');

  console.log('🔍 Iniciando extração OCR...');

  // 1. Tentar OCR.space primeiro (gratuito)
  if (OCR_SPACE_API_KEY) {
    console.log('📄 Tentando OCR.space...');
    const result = await ocrSpaceExtract(imageBase64, mimeType, OCR_SPACE_API_KEY, options);

    if (result.success && result.text.length > 50) {
      console.log(`✅ OCR.space sucesso: ${result.text.length} caracteres em ${result.processingTime}ms`);
      return result;
    }
    console.log(`⚠️ OCR.space falhou ou texto insuficiente: ${result.error || 'texto muito curto'}`);
  }

  // 2. Fallback para Google Vision
  if (GOOGLE_VISION_API_KEY) {
    console.log('📄 Tentando Google Vision...');
    const result = await googleVisionExtract(imageBase64, GOOGLE_VISION_API_KEY);

    if (result.success && result.text.length > 50) {
      console.log(`✅ Google Vision sucesso: ${result.text.length} caracteres em ${result.processingTime}ms`);
      return result;
    }
    console.log(`⚠️ Google Vision falhou: ${result.error || 'texto muito curto'}`);
  }

  // 3. Fallback para Azure Vision
  if (AZURE_VISION_ENDPOINT && AZURE_VISION_API_KEY) {
    console.log('📄 Tentando Azure Vision...');
    const result = await azureVisionExtract(imageBase64, AZURE_VISION_ENDPOINT, AZURE_VISION_API_KEY);

    if (result.success && result.text.length > 50) {
      console.log(`✅ Azure Vision sucesso: ${result.text.length} caracteres em ${result.processingTime}ms`);
      return result;
    }
    console.log(`⚠️ Azure Vision falhou: ${result.error || 'texto muito curto'}`);
  }

  // Nenhum provedor disponível
  return {
    success: false,
    text: '',
    confidence: 0,
    provider: 'ocr_space',
    processingTime: 0,
    error: 'Nenhum serviço de OCR configurado. Configure OCR_SPACE_API_KEY, GOOGLE_VISION_API_KEY ou AZURE_VISION_*',
  };
}

/**
 * Valida se o resultado do OCR é adequado para processamento
 */
export function validateOCRResult(result: OCRResult): { valid: boolean; reason?: string } {
  if (!result.success) {
    return { valid: false, reason: result.error || 'OCR falhou' };
  }

  if (result.text.length < 20) {
    return { valid: false, reason: 'Texto extraído muito curto' };
  }

  if (result.confidence < 50) {
    return { valid: false, reason: 'Confiança do OCR muito baixa' };
  }

  // Verificar se contém caracteres típicos de exames médicos
  const medicalKeywords = [
    'resultado', 'referência', 'valor', 'exame', 'laboratório',
    'data', 'paciente', 'hemograma', 'colesterol', 'glicose',
    'mg/dl', 'ml', 'g/dl', 'mm³', 'u/l', 'normal'
  ];

  const textLower = result.text.toLowerCase();
  const hasKeywords = medicalKeywords.some(kw => textLower.includes(kw));

  if (!hasKeywords && result.confidence < 80) {
    return { valid: false, reason: 'Documento não parece ser um exame médico' };
  }

  return { valid: true };
}
