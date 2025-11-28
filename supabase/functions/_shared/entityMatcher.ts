/**
 * Entity Matcher - Vincula dados extraídos do OCR com entidades do banco
 *
 * Funções para:
 * - Buscar/criar laboratórios baseado no nome
 * - Buscar/criar médicos baseado no CRM
 * - Buscar exames na biblioteca pelo nome
 * - Mapear parâmetros extraídos para parameter_code
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

interface MatchLabResult {
  id: string;
  name: string;
  matched: boolean;
  created: boolean;
}

interface MatchDoctorResult {
  id: string;
  full_name: string;
  crm: string;
  matched: boolean;
  created: boolean;
}

interface MatchExamResult {
  id: string;
  exam_code: string;
  exam_name: string;
  category_id: string | null;
  matched: boolean;
}

interface ParameterMapping {
  parameter_name: string;
  parameter_code: string | null;
  exam_library_parameter_id: string | null;
  reference_range: any | null;
}

/**
 * Busca ou cria laboratório baseado no nome extraído do OCR
 */
export async function matchOrCreateLaboratory(
  supabase: SupabaseClient,
  labName: string | null
): Promise<MatchLabResult | null> {
  if (!labName || labName.trim().length < 3) {
    return null;
  }

  const cleanName = labName.trim();

  // Tentar buscar laboratório existente (case-insensitive, fuzzy)
  const { data: existing } = await supabase
    .from('laboratories')
    .select('id, name')
    .ilike('name', `%${cleanName}%`)
    .limit(1)
    .single();

  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
      matched: true,
      created: false,
    };
  }

  // Criar novo laboratório
  const { data: created, error } = await supabase
    .from('laboratories')
    .insert({
      name: cleanName,
      cnpj: null, // Pode ser extraído posteriormente
      address_city: null,
      address_state: null,
    })
    .select('id, name')
    .single();

  if (error) {
    console.error('Erro ao criar laboratório:', error);
    return null;
  }

  return {
    id: created.id,
    name: created.name,
    matched: false,
    created: true,
  };
}

/**
 * Busca ou cria médico baseado no CRM extraído do OCR
 */
export async function matchOrCreateDoctor(
  supabase: SupabaseClient,
  doctorName: string | null,
  crm: string | null
): Promise<MatchDoctorResult | null> {
  if (!crm || crm.trim().length < 3) {
    return null;
  }

  const cleanCRM = crm.trim().toUpperCase();

  // Buscar médico existente pelo CRM
  const { data: existing } = await supabase
    .from('doctors')
    .select('id, full_name, crm')
    .eq('crm', cleanCRM)
    .single();

  if (existing) {
    return {
      id: existing.id,
      full_name: existing.full_name,
      crm: existing.crm,
      matched: true,
      created: false,
    };
  }

  // Criar novo médico
  const { data: created, error } = await supabase
    .from('doctors')
    .insert({
      full_name: doctorName || 'Médico não identificado',
      crm: cleanCRM,
      specialties: [],
      doctor_type: 'general',
    })
    .select('id, full_name, crm')
    .single();

  if (error) {
    console.error('Erro ao criar médico:', error);
    return null;
  }

  return {
    id: created.id,
    full_name: created.full_name,
    crm: created.crm,
    matched: false,
    created: true,
  };
}

/**
 * Busca exame na biblioteca baseado no nome extraído
 */
export async function matchExamFromLibrary(
  supabase: SupabaseClient,
  examName: string | null,
  category: string | null
): Promise<MatchExamResult | null> {
  if (!examName || examName.trim().length < 3) {
    return null;
  }

  const cleanName = examName.trim();

  // Estratégia 1: Match exato por exam_name
  let { data: exactMatch } = await supabase
    .from('exam_library')
    .select('id, exam_code, exam_name, category_id')
    .ilike('exam_name', cleanName)
    .limit(1)
    .single();

  if (exactMatch) {
    return {
      id: exactMatch.id,
      exam_code: exactMatch.exam_code,
      exam_name: exactMatch.exam_name,
      category_id: exactMatch.category_id,
      matched: true,
    };
  }

  // Estratégia 2: Match parcial por nome ou aliases
  const { data: partialMatch } = await supabase
    .from('exam_library')
    .select('id, exam_code, exam_name, category_id, aliases')
    .or(`exam_name.ilike.%${cleanName}%,aliases.cs.{${cleanName}}`)
    .limit(1)
    .single();

  if (partialMatch) {
    return {
      id: partialMatch.id,
      exam_code: partialMatch.exam_code,
      exam_name: partialMatch.exam_name,
      category_id: partialMatch.category_id,
      matched: true,
    };
  }

  // Estratégia 3: Match por categoria + nome parcial
  if (category) {
    const { data: categoryData } = await supabase
      .from('exam_categories')
      .select('id')
      .ilike('name', `%${category}%`)
      .single();

    if (categoryData) {
      const { data: categoryMatch } = await supabase
        .from('exam_library')
        .select('id, exam_code, exam_name, category_id')
        .eq('category_id', categoryData.id)
        .ilike('exam_name', `%${cleanName}%`)
        .limit(1)
        .single();

      if (categoryMatch) {
        return {
          id: categoryMatch.id,
          exam_code: categoryMatch.exam_code,
          exam_name: categoryMatch.exam_name,
          category_id: categoryMatch.category_id,
          matched: true,
        };
      }
    }
  }

  return null;
}

/**
 * Mapeia parâmetros extraídos do OCR para parameter_code da biblioteca
 */
export async function mapParametersToLibrary(
  supabase: SupabaseClient,
  examLibraryId: string,
  extractedParameters: Array<{ name: string; value: any; unit?: string }>
): Promise<ParameterMapping[]> {
  // Buscar todos os parâmetros do exame na biblioteca
  const { data: libraryParams, error } = await supabase
    .from('exam_library_parameters')
    .select('id, parameter_code, parameter_name, unit, reference_ranges')
    .eq('exam_library_id', examLibraryId);

  if (error || !libraryParams || libraryParams.length === 0) {
    console.log('⚠️ Nenhum parâmetro na biblioteca para este exame');
    return extractedParameters.map(p => ({
      parameter_name: p.name,
      parameter_code: null,
      exam_library_parameter_id: null,
      reference_range: null,
    }));
  }

  const mappings: ParameterMapping[] = [];

  for (const extractedParam of extractedParameters) {
    const cleanName = extractedParam.name.trim().toLowerCase();

    // Tentar match exato
    let match = libraryParams.find(
      lp => lp.parameter_name.toLowerCase() === cleanName
    );

    // Tentar match parcial
    if (!match) {
      match = libraryParams.find(
        lp => lp.parameter_name.toLowerCase().includes(cleanName) ||
              cleanName.includes(lp.parameter_name.toLowerCase())
      );
    }

    mappings.push({
      parameter_name: extractedParam.name,
      parameter_code: match?.parameter_code || null,
      exam_library_parameter_id: match?.id || null,
      reference_range: match?.reference_ranges || null,
    });
  }

  return mappings;
}

/**
 * Extrai CRM do texto OCR
 * Formatos comuns: "CRM 12345", "CRM-SP 12345", "CRM/SP: 12345"
 */
export function extractCRMFromText(text: string): string | null {
  if (!text) return null;

  const crmPatterns = [
    /CRM[:\s-\/]*([A-Z]{2})?[\s-]*(\d{4,6})/i,
    /Médico.*?CRM[:\s-\/]*([A-Z]{2})?[\s-]*(\d{4,6})/i,
  ];

  for (const pattern of crmPatterns) {
    const match = text.match(pattern);
    if (match) {
      const state = match[1] || '';
      const number = match[2];
      return state ? `${number}/${state}` : number;
    }
  }

  return null;
}

/**
 * Extrai nome do médico do texto OCR
 */
export function extractDoctorNameFromText(text: string): string | null {
  if (!text) return null;

  const patterns = [
    /(?:Dr\.?|Dra\.?|Médico[a]?)[:\s]+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç\s]+)/i,
    /Responsável[:\s]+(?:Dr\.?|Dra\.?)?\s*([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç\s]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Calcula idade baseado na data de nascimento
 */
export function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;

  try {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age >= 0 ? age : null;
  } catch {
    return null;
  }
}

/**
 * Determina o status de um parâmetro baseado nas faixas de referência
 */
export function determineParameterStatus(
  value: number,
  referenceRanges: any[],
  age: number | null,
  sex: string | null
): 'normal' | 'baixo' | 'alto' | 'critico' {
  if (!referenceRanges || referenceRanges.length === 0) {
    return 'normal';
  }

  // Encontrar a faixa de referência apropriada
  const appropriateRange = referenceRanges.find(range => {
    const ageMatches = (
      (range.age_min === null || (age !== null && age >= range.age_min)) &&
      (range.age_max === null || (age !== null && age <= range.age_max))
    );

    const sexMatches = (
      range.sex === 'all' ||
      range.sex === null ||
      (sex && range.sex === sex.toLowerCase())
    );

    return ageMatches && sexMatches;
  });

  if (!appropriateRange) {
    // Fallback: usar primeira faixa disponível
    const fallbackRange = referenceRanges[0];
    return evaluateAgainstRange(value, fallbackRange);
  }

  return evaluateAgainstRange(value, appropriateRange);
}

function evaluateAgainstRange(value: number, range: any): 'normal' | 'baixo' | 'alto' | 'critico' {
  // Verificar valores críticos
  if (range.critical_min !== null && value < range.critical_min) {
    return 'critico';
  }
  if (range.critical_max !== null && value > range.critical_max) {
    return 'critico';
  }

  // Verificar valores normais
  if (range.min !== null && value < range.min) {
    return 'baixo';
  }
  if (range.max !== null && value > range.max) {
    return 'alto';
  }

  return 'normal';
}
