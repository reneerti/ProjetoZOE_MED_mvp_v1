import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

/**
 * Extrai e parseia JSON de texto que pode conter markdown ou texto adicional
 * Útil para processar respostas de IA que podem retornar JSON em diferentes formatos
 * 
 * @param text Texto contendo JSON
 * @param schema Schema Zod opcional para validação
 * @returns Objeto JSON parseado e validado
 */
export function extractJSON<T = any>(text: string, schema?: z.ZodSchema<T>): T {
  if (!text || typeof text !== 'string') {
    throw new Error('Texto inválido para extração de JSON');
  }

  let cleanText = text.trim();
  
  // 1. Tentar extrair JSON de blocos markdown ```json...```
  const jsonBlockMatch = cleanText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonBlockMatch) {
    cleanText = jsonBlockMatch[1].trim();
  }
  
  // 2. Tentar encontrar o primeiro { e último } para extrair apenas o objeto JSON
  const firstBrace = cleanText.indexOf('{');
  const lastBrace = cleanText.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleanText = cleanText.substring(firstBrace, lastBrace + 1);
  }
  
  // 3. Parsear JSON
  let parsed: any;
  try {
    parsed = JSON.parse(cleanText);
  } catch (parseError) {
    console.error('❌ Erro ao parsear JSON:', parseError);
    console.error('📄 Texto original (primeiros 500 chars):', text.substring(0, 500));
    console.error('📄 Texto limpo tentado:', cleanText.substring(0, 500));
    
    const errorMsg = parseError instanceof Error ? parseError.message : 'Erro desconhecido';
    throw new Error(`Falha ao parsear JSON da resposta: ${errorMsg}`);
  }
  
  // 4. Validar com schema se fornecido
  if (schema) {
    const result = schema.safeParse(parsed);
    
    if (!result.success) {
      const errors = result.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('; ');
      
      console.error('❌ Erro de validação de schema:', errors);
      console.error('📄 Dados recebidos:', JSON.stringify(parsed, null, 2));
      
      throw new Error(`Schema validation failed: ${errors}`);
    }
    
    return result.data;
  }
  
  return parsed as T;
}
