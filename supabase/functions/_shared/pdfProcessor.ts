/**
 * Processador de PDF para Exames Médicos
 *
 * Este módulo converte PDFs em imagens para processamento de OCR,
 * suportando tanto PDFs de texto quanto PDFs escaneados.
 *
 * Estratégias:
 * 1. Extração direta de texto (pdf-lib)
 * 2. Conversão para imagem + OCR (pdf2pic via API)
 * 3. API externa de conversão PDF (ConvertAPI, PDF.co)
 */

export interface PDFProcessingResult {
  success: boolean;
  pages: PDFPage[];
  totalPages: number;
  processingTime: number;
  error?: string;
}

export interface PDFPage {
  pageNumber: number;
  text?: string;
  imageBase64?: string;
  mimeType?: string;
}

export interface PDFOptions {
  extractText?: boolean;
  convertToImages?: boolean;
  maxPages?: number;
  dpi?: number;
}

/**
 * Extrai texto diretamente do PDF usando pdf-lib
 * Funciona bem para PDFs digitais (não escaneados)
 */
async function extractTextFromPDF(pdfBytes: Uint8Array): Promise<string[]> {
  try {
    // Usando biblioteca nativa do Deno para parsing básico de PDF
    // Para extração completa, usamos uma API externa

    // Verificar se o PDF tem texto embutido
    const decoder = new TextDecoder('latin1');
    const rawContent = decoder.decode(pdfBytes);

    // Procurar por streams de texto no PDF
    const textMatches: string[] = [];
    const streamRegex = /stream\s+([\s\S]*?)\s+endstream/g;
    let match;

    while ((match = streamRegex.exec(rawContent)) !== null) {
      const streamContent = match[1];
      // Tentar extrair texto legível
      const textContent = streamContent
        .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (textContent.length > 20) {
        textMatches.push(textContent);
      }
    }

    // Se encontramos texto significativo, retornar
    if (textMatches.join(' ').length > 100) {
      return textMatches;
    }

    return [];
  } catch (error) {
    console.error('Erro na extração direta de texto:', error);
    return [];
  }
}

/**
 * Converte PDF para imagens usando API externa (PDF.co - gratuito até 500 créditos/mês)
 */
async function convertPDFToImagesViaPDFco(
  pdfBase64: string,
  apiKey: string,
  options: PDFOptions = {}
): Promise<PDFPage[]> {
  try {
    const response = await fetch('https://api.pdf.co/v1/pdf/convert/to/png', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        file: `data:application/pdf;base64,${pdfBase64}`,
        pages: options.maxPages ? `1-${options.maxPages}` : '1-5',
        resolution: options.dpi || 150,
      }),
    });

    if (!response.ok) {
      throw new Error(`PDF.co error: ${response.status}`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(result.message || 'PDF.co conversion failed');
    }

    // Baixar as imagens geradas
    const pages: PDFPage[] = [];

    for (let i = 0; i < result.urls.length; i++) {
      const imageResponse = await fetch(result.urls[i]);
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

      pages.push({
        pageNumber: i + 1,
        imageBase64,
        mimeType: 'image/png',
      });
    }

    return pages;
  } catch (error) {
    console.error('PDF.co conversion failed:', error);
    return [];
  }
}

/**
 * Converte PDF para imagens usando ConvertAPI (gratuito até 250 conversões/mês)
 */
async function convertPDFToImagesViaConvertAPI(
  pdfBase64: string,
  apiKey: string,
  options: PDFOptions = {}
): Promise<PDFPage[]> {
  try {
    const response = await fetch('https://v2.convertapi.com/convert/pdf/to/png', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        Parameters: [
          {
            Name: 'File',
            FileValue: {
              Name: 'document.pdf',
              Data: pdfBase64,
            },
          },
          {
            Name: 'PageRange',
            Value: options.maxPages ? `1-${options.maxPages}` : '1-5',
          },
          {
            Name: 'Resolution',
            Value: options.dpi || 150,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`ConvertAPI error: ${response.status}`);
    }

    const result = await response.json();

    if (!result.Files || result.Files.length === 0) {
      throw new Error('ConvertAPI returned no files');
    }

    return result.Files.map((file: any, index: number) => ({
      pageNumber: index + 1,
      imageBase64: file.FileData,
      mimeType: 'image/png',
    }));
  } catch (error) {
    console.error('ConvertAPI conversion failed:', error);
    return [];
  }
}

/**
 * Converte PDF para imagens usando CloudConvert (gratuito 25 min/dia)
 */
async function convertPDFToImagesViaCloudConvert(
  pdfBase64: string,
  apiKey: string,
  options: PDFOptions = {}
): Promise<PDFPage[]> {
  try {
    // 1. Criar job
    const createResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        tasks: {
          'import-pdf': {
            operation: 'import/base64',
            file: pdfBase64,
            filename: 'document.pdf',
          },
          'convert-to-png': {
            operation: 'convert',
            input: ['import-pdf'],
            output_format: 'png',
            pages: options.maxPages ? `1-${options.maxPages}` : '1-5',
            pixel_density: options.dpi || 150,
          },
          'export-result': {
            operation: 'export/url',
            input: ['convert-to-png'],
          },
        },
      }),
    });

    if (!createResponse.ok) {
      throw new Error(`CloudConvert error: ${createResponse.status}`);
    }

    const job = await createResponse.json();

    // 2. Poll até completar
    let attempts = 0;
    const maxAttempts = 30;
    let completedJob;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const statusResponse = await fetch(
        `https://api.cloudconvert.com/v2/jobs/${job.data.id}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        }
      );

      completedJob = await statusResponse.json();

      if (completedJob.data.status === 'finished') {
        break;
      } else if (completedJob.data.status === 'error') {
        throw new Error('CloudConvert job failed');
      }

      attempts++;
    }

    if (!completedJob || completedJob.data.status !== 'finished') {
      throw new Error('CloudConvert timeout');
    }

    // 3. Baixar imagens
    const exportTask = completedJob.data.tasks.find((t: any) => t.name === 'export-result');
    const pages: PDFPage[] = [];

    for (let i = 0; i < exportTask.result.files.length; i++) {
      const file = exportTask.result.files[i];
      const imageResponse = await fetch(file.url);
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

      pages.push({
        pageNumber: i + 1,
        imageBase64,
        mimeType: 'image/png',
      });
    }

    return pages;
  } catch (error) {
    console.error('CloudConvert conversion failed:', error);
    return [];
  }
}

/**
 * Função principal para processar PDF
 */
export async function processPDF(
  pdfBase64: string,
  options: PDFOptions = {}
): Promise<PDFProcessingResult> {
  const startTime = Date.now();

  console.log('📄 Iniciando processamento de PDF...');

  // Decodificar PDF
  const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));

  // 1. Tentar extração direta de texto primeiro
  if (options.extractText !== false) {
    console.log('📝 Tentando extração direta de texto...');
    const textPages = await extractTextFromPDF(pdfBytes);

    if (textPages.length > 0 && textPages.join(' ').length > 200) {
      console.log(`✅ Texto extraído diretamente: ${textPages.length} blocos`);
      return {
        success: true,
        pages: textPages.map((text, index) => ({
          pageNumber: index + 1,
          text,
        })),
        totalPages: textPages.length,
        processingTime: Date.now() - startTime,
      };
    }
    console.log('⚠️ PDF parece ser escaneado, convertendo para imagem...');
  }

  // 2. Converter para imagens
  const PDF_CO_API_KEY = Deno.env.get('PDF_CO_API_KEY');
  const CONVERT_API_KEY = Deno.env.get('CONVERT_API_KEY');
  const CLOUDCONVERT_API_KEY = Deno.env.get('CLOUDCONVERT_API_KEY');

  let pages: PDFPage[] = [];

  // Tentar PDF.co
  if (PDF_CO_API_KEY && pages.length === 0) {
    console.log('📄 Tentando PDF.co...');
    pages = await convertPDFToImagesViaPDFco(pdfBase64, PDF_CO_API_KEY, options);
    if (pages.length > 0) {
      console.log(`✅ PDF.co sucesso: ${pages.length} páginas`);
    }
  }

  // Fallback: ConvertAPI
  if (CONVERT_API_KEY && pages.length === 0) {
    console.log('📄 Tentando ConvertAPI...');
    pages = await convertPDFToImagesViaConvertAPI(pdfBase64, CONVERT_API_KEY, options);
    if (pages.length > 0) {
      console.log(`✅ ConvertAPI sucesso: ${pages.length} páginas`);
    }
  }

  // Fallback: CloudConvert
  if (CLOUDCONVERT_API_KEY && pages.length === 0) {
    console.log('📄 Tentando CloudConvert...');
    pages = await convertPDFToImagesViaCloudConvert(pdfBase64, CLOUDCONVERT_API_KEY, options);
    if (pages.length > 0) {
      console.log(`✅ CloudConvert sucesso: ${pages.length} páginas`);
    }
  }

  if (pages.length === 0) {
    return {
      success: false,
      pages: [],
      totalPages: 0,
      processingTime: Date.now() - startTime,
      error: 'Não foi possível processar o PDF. Configure PDF_CO_API_KEY, CONVERT_API_KEY ou CLOUDCONVERT_API_KEY.',
    };
  }

  return {
    success: true,
    pages,
    totalPages: pages.length,
    processingTime: Date.now() - startTime,
  };
}

/**
 * Verifica se um arquivo é PDF baseado no magic number
 */
export function isPDF(base64OrBuffer: string | Uint8Array): boolean {
  let bytes: Uint8Array;

  if (typeof base64OrBuffer === 'string') {
    bytes = Uint8Array.from(atob(base64OrBuffer.slice(0, 20)), c => c.charCodeAt(0));
  } else {
    bytes = base64OrBuffer.slice(0, 5);
  }

  // PDF magic number: %PDF-
  return bytes[0] === 0x25 && // %
         bytes[1] === 0x50 && // P
         bytes[2] === 0x44 && // D
         bytes[3] === 0x46 && // F
         bytes[4] === 0x2D;   // -
}
