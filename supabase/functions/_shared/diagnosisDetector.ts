/**
 * Diagnosis Detector - Detecção automática de condições clínicas
 *
 * Baseado nas regras diagnósticas cadastradas, analisa os parâmetros
 * do exame e identifica possíveis condições clínicas
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

interface DiagnosticRule {
  id: string;
  condition_id: string;
  rule_name: string;
  criteria: {
    required_parameters: Array<{
      parameter_code: string;
      operator: '<' | '>' | '<=' | '>=' | '=' | '!=';
      value?: number;
      value_male?: number;
      value_female?: number;
      weight: number;
    }>;
    minimum_matches: number;
    minimum_weight: number;
  };
}

interface ExamParameter {
  parameter_code: string | null;
  parameter_name: string;
  value: number | null;
  status: string;
}

interface DiagnosisResult {
  condition_id: string;
  condition_name: string;
  condition_code: string;
  confidence_score: number;
  matched_rules: string[];
  contributing_parameters: Array<{
    parameter_code: string;
    parameter_name: string;
    value: number;
    expected: string;
  }>;
  urgency_level: 'normal' | 'observacao' | 'urgente';
}

/**
 * Detecta diagnósticos baseado nos parâmetros do exame
 */
export async function detectDiagnoses(
  supabase: SupabaseClient,
  userId: string,
  examImageId: string,
  userSex: string | null
): Promise<DiagnosisResult[]> {
  console.log('🔍 Iniciando detecção de diagnósticos...');

  // 1. Buscar parâmetros do exame
  const { data: examResults, error: resultsError } = await supabase
    .from('exam_results')
    .select('parameter_code, parameter_name, value, status')
    .eq('exam_image_id', examImageId)
    .not('parameter_code', 'is', null)
    .not('value', 'is', null);

  if (resultsError || !examResults || examResults.length === 0) {
    console.log('⚠️ Nenhum parâmetro com código encontrado para análise');
    return [];
  }

  console.log(`✅ ${examResults.length} parâmetros encontrados`);

  // 2. Buscar todas as regras diagnósticas ativas
  const { data: diagnosticRules, error: rulesError } = await supabase
    .from('diagnostic_rules')
    .select(`
      id,
      condition_id,
      rule_name,
      criteria,
      clinical_conditions!inner (
        id,
        condition_code,
        condition_name,
        category
      )
    `);

  if (rulesError || !diagnosticRules || diagnosticRules.length === 0) {
    console.log('⚠️ Nenhuma regra diagnóstica encontrada');
    return [];
  }

  console.log(`✅ ${diagnosticRules.length} regras diagnósticas carregadas`);

  // 3. Avaliar cada regra
  const detectedDiagnoses: DiagnosisResult[] = [];

  for (const rule of diagnosticRules) {
    const result = evaluateRule(rule, examResults as ExamParameter[], userSex);

    if (result.matched) {
      const condition = (rule as any).clinical_conditions;

      detectedDiagnoses.push({
        condition_id: rule.condition_id,
        condition_name: condition.condition_name,
        condition_code: condition.condition_code,
        confidence_score: result.confidence,
        matched_rules: [rule.rule_name],
        contributing_parameters: result.contributingParameters,
        urgency_level: determineUrgency(result.confidence, examResults as ExamParameter[]),
      });
    }
  }

  console.log(`✅ ${detectedDiagnoses.length} diagnósticos detectados`);

  // 4. Salvar diagnósticos identificados
  if (detectedDiagnoses.length > 0) {
    await saveDiagnoses(supabase, userId, examImageId, detectedDiagnoses);
  }

  return detectedDiagnoses;
}

/**
 * Avalia uma regra diagnóstica contra os parâmetros do exame
 */
function evaluateRule(
  rule: any,
  examParameters: ExamParameter[],
  userSex: string | null
): { matched: boolean; confidence: number; contributingParameters: any[] } {
  const criteria = rule.criteria;
  const requiredParams = criteria.required_parameters || [];

  let matchedCount = 0;
  let totalWeight = 0;
  const contributingParameters: any[] = [];

  for (const requirement of requiredParams) {
    // Encontrar parâmetro correspondente
    const examParam = examParameters.find(
      p => p.parameter_code === requirement.parameter_code
    );

    if (!examParam || examParam.value === null) {
      continue;
    }

    // Determinar valor esperado (pode variar por sexo)
    let expectedValue = requirement.value;
    if (userSex === 'male' && requirement.value_male !== undefined) {
      expectedValue = requirement.value_male;
    } else if (userSex === 'female' && requirement.value_female !== undefined) {
      expectedValue = requirement.value_female;
    }

    if (expectedValue === undefined) {
      continue;
    }

    // Avaliar operador
    const matches = evaluateOperator(
      examParam.value,
      requirement.operator,
      expectedValue
    );

    if (matches) {
      matchedCount++;
      totalWeight += requirement.weight;

      contributingParameters.push({
        parameter_code: examParam.parameter_code,
        parameter_name: examParam.parameter_name,
        value: examParam.value,
        expected: `${requirement.operator} ${expectedValue}`,
      });
    }
  }

  // Verificar se atende aos critérios mínimos
  const meetsMinimumMatches = matchedCount >= (criteria.minimum_matches || 0);
  const meetsMinimumWeight = totalWeight >= (criteria.minimum_weight || 0);
  const matched = meetsMinimumMatches && meetsMinimumWeight;

  // Calcular confiança (0-100)
  let confidence = 0;
  if (matched) {
    const matchRatio = requiredParams.length > 0
      ? matchedCount / requiredParams.length
      : 0;

    const weightRatio = criteria.minimum_weight > 0
      ? totalWeight / (criteria.minimum_weight * 1.5) // 1.5x = 100%
      : matchRatio;

    confidence = Math.min(100, Math.round((matchRatio * 0.5 + weightRatio * 0.5) * 100));
  }

  return {
    matched,
    confidence,
    contributingParameters,
  };
}

/**
 * Avalia um operador de comparação
 */
function evaluateOperator(
  actualValue: number,
  operator: string,
  expectedValue: number
): boolean {
  switch (operator) {
    case '<':
      return actualValue < expectedValue;
    case '<=':
      return actualValue <= expectedValue;
    case '>':
      return actualValue > expectedValue;
    case '>=':
      return actualValue >= expectedValue;
    case '=':
      return Math.abs(actualValue - expectedValue) < 0.01;
    case '!=':
      return Math.abs(actualValue - expectedValue) >= 0.01;
    default:
      return false;
  }
}

/**
 * Determina o nível de urgência baseado na confiança e parâmetros críticos
 */
function determineUrgency(
  confidence: number,
  examParameters: ExamParameter[]
): 'normal' | 'observacao' | 'urgente' {
  // Verificar se há parâmetros críticos
  const hasCriticalParams = examParameters.some(p => p.status === 'critico');

  if (hasCriticalParams) {
    return 'urgente';
  }

  if (confidence >= 80) {
    return 'observacao';
  }

  return 'normal';
}

/**
 * Salva os diagnósticos identificados no banco
 */
async function saveDiagnoses(
  supabase: SupabaseClient,
  userId: string,
  examImageId: string,
  diagnoses: DiagnosisResult[]
): Promise<void> {
  try {
    // Remover diagnósticos anteriores deste exame
    await supabase
      .from('identified_diagnoses')
      .delete()
      .eq('exam_image_id', examImageId);

    // Inserir novos diagnósticos
    const diagnosesToInsert = diagnoses.map(d => ({
      user_id: userId,
      exam_image_id: examImageId,
      condition_id: d.condition_id,
      confidence_score: d.confidence_score,
      contributing_parameters: d.contributing_parameters,
      urgency_level: d.urgency_level,
      detected_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('identified_diagnoses')
      .insert(diagnosesToInsert);

    if (error) {
      console.error('❌ Erro ao salvar diagnósticos:', error);
    } else {
      console.log(`✅ ${diagnoses.length} diagnósticos salvos`);
    }
  } catch (error) {
    console.error('❌ Erro ao salvar diagnósticos:', error);
  }
}

/**
 * Busca histórico de evolução de diagnósticos do usuário
 */
export async function getProgressionHistory(
  supabase: SupabaseClient,
  userId: string,
  conditionId: string,
  days: number = 90
): Promise<any[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { data, error } = await supabase
    .from('identified_diagnoses')
    .select(`
      id,
      confidence_score,
      detected_at,
      exam_images!inner (
        exam_date
      )
    `)
    .eq('user_id', userId)
    .eq('condition_id', conditionId)
    .gte('detected_at', cutoffDate.toISOString())
    .order('detected_at', { ascending: true });

  if (error) {
    console.error('Erro ao buscar histórico:', error);
    return [];
  }

  return data || [];
}

/**
 * Calcula a tendência de evolução (melhorando, estável, piorando)
 */
export function calculateEvolutionTrend(history: any[]): 'improving' | 'stable' | 'worsening' | null {
  if (history.length < 2) {
    return null;
  }

  // Comparar primeiros 2 e últimos 2 exames
  const firstTwo = history.slice(0, 2);
  const lastTwo = history.slice(-2);

  const avgFirst = firstTwo.reduce((sum, h) => sum + h.confidence_score, 0) / firstTwo.length;
  const avgLast = lastTwo.reduce((sum, h) => sum + h.confidence_score, 0) / lastTwo.length;

  const change = ((avgLast - avgFirst) / avgFirst) * 100;

  if (change < -10) {
    return 'improving'; // Confiança diminuiu = melhorando
  } else if (change > 10) {
    return 'worsening'; // Confiança aumentou = piorando
  } else {
    return 'stable';
  }
}
