import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

/**
 * Schema para análise integrada de exames com pré-diagnósticos
 */
export const analysisSchema = z.object({
  health_score: z.number().min(0).max(10),
  summary: z.string().min(10),
  evolution: z.array(z.object({
    category: z.string(),
    trend: z.enum(['improving', 'stable', 'worsening']),
    description: z.string()
  })).optional(),
  patient_view: z.object({
    main_message: z.string(),
    key_points: z.array(z.string()),
    recommendations: z.array(z.string())
  }).optional(),
  attention_points: z.array(z.object({
    category: z.string(),
    parameter: z.string(),
    value: z.union([z.string(), z.number()]),
    severity: z.enum(['high', 'medium', 'low']),
    recommendation: z.string()
  })),
  specialists: z.array(z.object({
    specialty: z.string(),
    reason: z.string(),
    priority: z.enum(['urgent', 'high', 'medium', 'low'])
  })),
  pre_diagnostics: z.array(z.object({
    name: z.string(),
    severity: z.enum(['high', 'medium', 'low']),
    related_parameters: z.array(z.object({
      name: z.string(),
      value: z.union([z.string(), z.number()]),
      unit: z.string().optional(),
      status: z.enum(['normal', 'alto', 'baixo', 'critico'])
    })),
    explanation: z.string(),
    recommendations: z.array(z.string())
  })).optional(),
  grouped_results: z.array(z.object({
    category_name: z.string(),
    category_icon: z.string(),
    parameters: z.array(z.object({
      name: z.string(),
      value: z.union([z.string(), z.number()]),
      unit: z.string().optional(),
      status: z.enum(['normal', 'alto', 'baixo', 'critico']),
      reference_range: z.string().optional()
    }))
  })).optional()
});

export type AnalysisResult = z.infer<typeof analysisSchema>;

/**
 * Schema para extração OCR de exames
 */
export const ocrExtractionSchema = z.object({
  exam_name: z.string(),
  exam_date: z.string().optional(),
  lab_name: z.string().optional(),
  category: z.string(),
  parameters: z.array(z.object({
    name: z.string(),
    value: z.string(),
    unit: z.string().optional(),
    reference_range: z.string().optional(),
    status: z.enum(['normal', 'alto', 'baixo', 'critico']).optional()
  }))
});

export type OCRExtraction = z.infer<typeof ocrExtractionSchema>;

/**
 * Schema para análise de dados de wearables
 */
export const wearableAnalysisSchema = z.object({
  cardiovascular_score: z.number().min(0).max(10),
  activity_score: z.number().min(0).max(10),
  sleep_score: z.number().min(0).max(10),
  overall_score: z.number().min(0).max(10),
  insights: z.array(z.object({
    category: z.string(),
    message: z.string(),
    severity: z.enum(['info', 'warning', 'alert'])
  })),
  recommendations: z.array(z.string())
});

export type WearableAnalysis = z.infer<typeof wearableAnalysisSchema>;

/**
 * Valida dados contra um schema Zod
 * @param data Dados a validar
 * @param schema Schema Zod
 * @returns Dados validados
 * @throws Error se validação falhar
 */
export function validateSchema<T>(data: unknown, schema: z.ZodSchema<T>): T {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.errors.map(err => 
      `${err.path.join('.')}: ${err.message}`
    ).join('; ');
    
    console.error('❌ Erro de validação de schema:', errors);
    console.error('📄 Dados recebidos:', JSON.stringify(data, null, 2));
    
    throw new Error(`Schema validation failed: ${errors}`);
  }
  
  return result.data;
}
