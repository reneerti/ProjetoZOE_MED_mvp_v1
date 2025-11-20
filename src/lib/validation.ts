import { z } from "zod";

/**
 * Schema de validação para metadados de exames médicos
 */
export const examMetadataSchema = z.object({
  requestingDoctor: z.string()
    .max(200, "Nome do médico deve ter no máximo 200 caracteres")
    .regex(/^[a-zA-ZÀ-ÿ\s.'-]*$/, "Nome do médico contém caracteres inválidos")
    .optional()
    .transform(val => val || undefined),
  
  reportingDoctor: z.string()
    .max(200, "Nome do médico laudador deve ter no máximo 200 caracteres")
    .regex(/^[a-zA-ZÀ-ÿ\s.'-]*$/, "Nome do médico contém caracteres inválidos")
    .optional()
    .transform(val => val || undefined),
  
  examDate: z.coerce.date()
    .max(new Date(), "Data do exame não pode ser futura")
    .optional()
    .transform(val => val || undefined),
});

export type ExamMetadata = z.infer<typeof examMetadataSchema>;

/**
 * Schema de validação para medicações
 */
export const medicationSchema = z.object({
  medication_name: z.string()
    .min(1, "Nome da medicação é obrigatório")
    .max(200, "Nome da medicação deve ter no máximo 200 caracteres")
    .regex(/^[a-zA-ZÀ-ÿ0-9\s.,()+-]*$/, "Nome contém caracteres inválidos"),
  
  current_dose: z.string()
    .min(1, "Dose é obrigatória")
    .max(100, "Dose deve ter no máximo 100 caracteres")
    .regex(/^[\d.,]+\s*[a-zA-Zµμ]+$/, "Formato de dose inválido. Use formato como: 2.5mg, 5000 UI"),
  
  start_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
    .refine((date) => new Date(date) <= new Date(), "Data não pode ser futura"),
  
  notes: z.string()
    .max(1000, "Notas devem ter no máximo 1000 caracteres")
    .optional()
    .transform(val => val || undefined),
  
  medication_type: z.enum(["oral", "injectable", "glp1"]),
});

export type MedicationInput = z.infer<typeof medicationSchema>;

/**
 * Schema de validação para suplementos
 */
export const supplementSchema = z.object({
  supplement_name: z.string()
    .min(1, "Nome do suplemento é obrigatório")
    .max(200, "Nome do suplemento deve ter no máximo 200 caracteres")
    .regex(/^[a-zA-ZÀ-ÿ0-9\s.,()+-]*$/, "Nome contém caracteres inválidos"),
  
  supplement_type: z.enum(["vitamina", "mineral", "proteina", "aminoacido", "outros"]),
  
  current_dose: z.string()
    .min(1, "Dose é obrigatória")
    .max(50, "Dose deve ter no máximo 50 caracteres")
    .regex(/^[\d.,]+$/, "Dose deve conter apenas números"),
  
  unit: z.enum(["mg", "g", "mcg", "UI", "ml", "comprimido"]),
  
  frequency: z.enum(["diario", "dia_sim_dia_nao", "semanal", "conforme_necessario"]),
  
  time_of_day: z.enum(["manha", "tarde", "noite", "jejum", "apos_refeicao"]).optional(),
  
  notes: z.string()
    .max(500, "Notas devem ter no máximo 500 caracteres")
    .optional()
    .transform(val => val || undefined),
});

export type SupplementInput = z.infer<typeof supplementSchema>;

/**
 * Schema de validação para upload de arquivos (exames)
 */
export const fileUploadSchema = z.object({
  file: z.custom<File>()
    .refine((file) => file instanceof File, "Arquivo inválido")
    .refine(
      (file) => ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type),
      "Apenas imagens (JPG, PNG, WEBP) ou PDF são aceitos"
    )
    .refine(
      (file) => file.size <= 10 * 1024 * 1024,
      "Arquivo muito grande. Tamanho máximo é 10MB"
    ),
});

export type FileUpload = z.infer<typeof fileUploadSchema>;
