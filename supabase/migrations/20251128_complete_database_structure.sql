-- ═══════════════════════════════════════════════════════════════════════════════
-- ESTRUTURA COMPLETA E MELHORADA DO BANCO DE DADOS - ZOE MED
-- ═══════════════════════════════════════════════════════════════════════════════
-- Esta migration adiciona:
-- 1. Entidades de Médicos e Laboratórios
-- 2. Biblioteca completa de Exames e Parâmetros
-- 3. Sistema de Diagnósticos Agrupados
-- 4. Condições Clínicas e Relacionamentos
-- 5. Histórico de Evolução de Diagnósticos
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. LABORATÓRIOS E CLÍNICAS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS laboratories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dados básicos
  name TEXT NOT NULL,
  trade_name TEXT, -- Nome fantasia
  cnpj TEXT UNIQUE,

  -- Contato
  phone TEXT,
  email TEXT,
  website TEXT,

  -- Endereço
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zipcode TEXT,

  -- Acreditações
  accreditations TEXT[], -- ['PALC', 'DICQ', 'ISO 15189']

  -- Metadados
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Índices para busca
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('portuguese', COALESCE(name, '') || ' ' || COALESCE(trade_name, ''))
  ) STORED
);

CREATE INDEX idx_laboratories_search ON laboratories USING gin(search_vector);
CREATE INDEX idx_laboratories_city ON laboratories(address_city);
CREATE INDEX idx_laboratories_active ON laboratories(is_active);

COMMENT ON TABLE laboratories IS 'Cadastro de laboratórios e clínicas médicas';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. MÉDICOS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dados pessoais
  full_name TEXT NOT NULL,
  crm TEXT NOT NULL, -- CRM com UF (ex: 12345-SP)
  cpf TEXT UNIQUE,

  -- Especialidades (podem ter várias)
  specialties TEXT[] NOT NULL, -- ['Cardiologia', 'Clínica Médica']

  -- Contato
  phone TEXT,
  email TEXT,

  -- Tipo de médico
  doctor_type TEXT NOT NULL DEFAULT 'general', -- 'general', 'specialist', 'pathologist'

  -- Metadados
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Índices para busca
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('portuguese', COALESCE(full_name, '') || ' ' || COALESCE(crm, ''))
  ) STORED,

  UNIQUE(crm)
);

CREATE INDEX idx_doctors_search ON doctors USING gin(search_vector);
CREATE INDEX idx_doctors_crm ON doctors(crm);
CREATE INDEX idx_doctors_specialties ON doctors USING gin(specialties);
CREATE INDEX idx_doctors_active ON doctors(is_active);

COMMENT ON TABLE doctors IS 'Cadastro de médicos solicitantes e laudadores';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. BIBLIOTECA DE EXAMES (CATÁLOGO COMPLETO)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS exam_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  exam_code TEXT UNIQUE NOT NULL, -- Código único (ex: HEM001, LIP001)
  exam_name TEXT NOT NULL,
  exam_name_alternative TEXT[], -- Nomes alternativos

  -- Classificação
  category_id UUID REFERENCES exam_categories(id),
  subcategory TEXT, -- Subcategoria mais específica

  -- Descrição
  description TEXT,
  clinical_indication TEXT, -- Quando solicitar
  preparation_instructions TEXT, -- Preparo do paciente

  -- Método
  collection_method TEXT, -- 'sangue', 'urina', 'fezes', 'imagem'
  analysis_method TEXT, -- 'espectrofotometria', 'imunoensaio'

  -- Timing
  fasting_required BOOLEAN DEFAULT false,
  fasting_hours INTEGER, -- Horas de jejum necessárias
  turnaround_time_hours INTEGER, -- Tempo médio de resultado

  -- Flags
  is_urgent_available BOOLEAN DEFAULT false,
  requires_authorization BOOLEAN DEFAULT false, -- Necessita autorização do convênio

  -- Preços médios (referência)
  avg_cost_private NUMERIC(10,2), -- Custo particular médio
  avg_cost_sus NUMERIC(10,2), -- Custo SUS

  -- Metadados
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('portuguese',
      COALESCE(exam_name, '') || ' ' ||
      COALESCE(exam_code, '') || ' ' ||
      COALESCE(array_to_string(exam_name_alternative, ' '), '')
    )
  ) STORED
);

CREATE INDEX idx_exam_library_search ON exam_library USING gin(search_vector);
CREATE INDEX idx_exam_library_code ON exam_library(exam_code);
CREATE INDEX idx_exam_library_category ON exam_library(category_id);
CREATE INDEX idx_exam_library_active ON exam_library(is_active);

COMMENT ON TABLE exam_library IS 'Biblioteca de exames médicos com informações completas';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. PARÂMETROS DA BIBLIOTECA (VALORES PADRÃO)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS exam_library_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relacionamento
  exam_library_id UUID REFERENCES exam_library(id) ON DELETE CASCADE,

  -- Identificação do parâmetro
  parameter_code TEXT NOT NULL, -- Código único (ex: HEM_RBC, LIP_COL)
  parameter_name TEXT NOT NULL,
  parameter_name_alternative TEXT[], -- Nomes alternativos

  -- Unidade
  unit TEXT NOT NULL, -- mg/dL, g/dL, milhões/mm³
  unit_alternatives TEXT[], -- Unidades alternativas

  -- Valores de Referência (podem variar por idade/sexo)
  reference_ranges JSONB NOT NULL DEFAULT '[]'::JSONB,
  /* Estrutura:
  [
    {
      "age_min": 0, "age_max": 12, "sex": "all",
      "min": 4.0, "max": 6.0,
      "critical_min": 2.5, "critical_max": 7.5
    },
    {
      "age_min": 13, "age_max": null, "sex": "male",
      "min": 4.5, "max": 6.5,
      "critical_min": 3.0, "critical_max": 8.0
    }
  ]
  */

  -- Descrição
  description TEXT,
  clinical_significance TEXT, -- O que significa este parâmetro

  -- Ordem de exibição
  display_order INTEGER DEFAULT 0,

  -- Flags
  is_calculated BOOLEAN DEFAULT false, -- Se é calculado a partir de outros
  calculation_formula TEXT, -- Fórmula de cálculo (se aplicável)

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(exam_library_id, parameter_code)
);

CREATE INDEX idx_exam_library_params_exam ON exam_library_parameters(exam_library_id);
CREATE INDEX idx_exam_library_params_code ON exam_library_parameters(parameter_code);

COMMENT ON TABLE exam_library_parameters IS 'Parâmetros padrão de cada exame da biblioteca';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. CONDIÇÕES CLÍNICAS E DIAGNÓSTICOS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS clinical_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  condition_code TEXT UNIQUE NOT NULL, -- CID-10 ou código interno
  condition_name TEXT NOT NULL,
  condition_name_alternative TEXT[],

  -- Classificação
  category TEXT NOT NULL, -- 'metabólica', 'cardiovascular', 'hematológica'
  severity_level TEXT, -- 'low', 'medium', 'high', 'critical'

  -- Descrição
  description TEXT,
  symptoms TEXT[], -- Sintomas comuns
  risk_factors TEXT[], -- Fatores de risco

  -- Prevalência
  prevalence_percentage NUMERIC(5,2), -- % da população

  -- Tratamento
  common_treatments TEXT[],
  specialists_recommended TEXT[], -- Especialidades médicas

  -- Flags
  is_chronic BOOLEAN DEFAULT false,
  requires_immediate_attention BOOLEAN DEFAULT false,

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('portuguese',
      COALESCE(condition_name, '') || ' ' ||
      COALESCE(condition_code, '')
    )
  ) STORED
);

CREATE INDEX idx_clinical_conditions_search ON clinical_conditions USING gin(search_vector);
CREATE INDEX idx_clinical_conditions_code ON clinical_conditions(condition_code);
CREATE INDEX idx_clinical_conditions_category ON clinical_conditions(category);

COMMENT ON TABLE clinical_conditions IS 'Catálogo de condições clínicas e diagnósticos';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. REGRAS DE DIAGNÓSTICO (MÚLTIPLOS PARÂMETROS)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS diagnostic_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Condição identificada
  condition_id UUID REFERENCES clinical_conditions(id) ON DELETE CASCADE,

  -- Nome da regra
  rule_name TEXT NOT NULL,
  rule_description TEXT,

  -- Critérios (JSON para flexibilidade)
  criteria JSONB NOT NULL,
  /* Estrutura:
  {
    "required_parameters": [
      {
        "parameter_code": "HEM_RBC",
        "operator": "<",
        "value": 4.0,
        "weight": 2
      },
      {
        "parameter_code": "HEM_HB",
        "operator": "<",
        "value": 12.0,
        "weight": 3
      }
    ],
    "minimum_matches": 2,
    "minimum_weight": 4
  }
  */

  -- Confiança
  confidence_threshold NUMERIC(5,2) DEFAULT 70.0, -- % mínima de confiança

  -- Prioridade
  priority INTEGER DEFAULT 0, -- Ordem de verificação

  -- Flags
  is_active BOOLEAN DEFAULT true,
  requires_specialist_confirmation BOOLEAN DEFAULT false,

  -- Metadados
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_diagnostic_rules_condition ON diagnostic_rules(condition_id);
CREATE INDEX idx_diagnostic_rules_active ON diagnostic_rules(is_active);

COMMENT ON TABLE diagnostic_rules IS 'Regras para identificação automática de diagnósticos baseados em múltiplos parâmetros';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. ATUALIZAÇÃO DA TABELA exam_images (ADICIONAR RELACIONAMENTOS)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Adicionar colunas de relacionamento
ALTER TABLE exam_images ADD COLUMN IF NOT EXISTS laboratory_id UUID REFERENCES laboratories(id);
ALTER TABLE exam_images ADD COLUMN IF NOT EXISTS requesting_doctor_id UUID REFERENCES doctors(id);
ALTER TABLE exam_images ADD COLUMN IF NOT EXISTS reporting_doctor_id UUID REFERENCES doctors(id);
ALTER TABLE exam_images ADD COLUMN IF NOT EXISTS exam_library_id UUID REFERENCES exam_library(id);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_exam_images_laboratory ON exam_images(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_exam_images_requesting_doctor ON exam_images(requesting_doctor_id);
CREATE INDEX IF NOT EXISTS idx_exam_images_reporting_doctor ON exam_images(reporting_doctor_id);
CREATE INDEX IF NOT EXISTS idx_exam_images_exam_library ON exam_images(exam_library_id);

-- Manter compatibilidade com campos TEXT antigos
COMMENT ON COLUMN exam_images.lab_name IS 'DEPRECATED: Use laboratory_id. Mantido para compatibilidade';
COMMENT ON COLUMN exam_images.requesting_doctor IS 'DEPRECATED: Use requesting_doctor_id. Mantido para compatibilidade';
COMMENT ON COLUMN exam_images.reporting_doctor IS 'DEPRECATED: Use reporting_doctor_id. Mantido para compatibilidade';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. DIAGNÓSTICOS IDENTIFICADOS (RESULTADO DA ANÁLISE)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS identified_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Paciente e análise
  user_id UUID NOT NULL REFERENCES auth.users(id),
  health_analysis_id UUID REFERENCES health_analysis(id),

  -- Diagnóstico
  condition_id UUID REFERENCES clinical_conditions(id),
  diagnostic_rule_id UUID REFERENCES diagnostic_rules(id), -- Regra que identificou

  -- Confiança
  confidence_score NUMERIC(5,2) NOT NULL, -- 0-100%

  -- Parâmetros que contribuíram
  contributing_parameters JSONB NOT NULL,
  /* Estrutura:
  [
    {
      "parameter_code": "HEM_RBC",
      "parameter_name": "Hemácias",
      "value": 3.5,
      "expected_range": "4.0-6.0",
      "deviation_percentage": -12.5,
      "severity": "medium"
    }
  ]
  */

  -- Recomendações
  recommended_actions TEXT[],
  recommended_specialists TEXT[],
  urgency_level TEXT DEFAULT 'normal', -- 'normal', 'attention', 'urgent', 'critical'

  -- Status
  status TEXT DEFAULT 'identified', -- 'identified', 'reviewed', 'confirmed', 'dismissed'
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Evolução
  is_new BOOLEAN DEFAULT true, -- Primeiro diagnóstico desta condição
  previous_diagnosis_id UUID REFERENCES identified_diagnoses(id), -- Diagnóstico anterior da mesma condição
  evolution_trend TEXT, -- 'improving', 'stable', 'worsening'

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_identified_diagnoses_user ON identified_diagnoses(user_id);
CREATE INDEX idx_identified_diagnoses_condition ON identified_diagnoses(condition_id);
CREATE INDEX idx_identified_diagnoses_status ON identified_diagnoses(status);
CREATE INDEX idx_identified_diagnoses_urgency ON identified_diagnoses(urgency_level);
CREATE INDEX idx_identified_diagnoses_date ON identified_diagnoses(created_at DESC);

COMMENT ON TABLE identified_diagnoses IS 'Diagnósticos identificados automaticamente através de análise de parâmetros';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. HISTÓRICO DE EVOLUÇÃO DE DIAGNÓSTICOS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS diagnosis_evolution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Diagnóstico
  diagnosis_id UUID REFERENCES identified_diagnoses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  condition_id UUID REFERENCES clinical_conditions(id),

  -- Snapshot dos parâmetros no momento
  parameters_snapshot JSONB NOT NULL,
  confidence_score NUMERIC(5,2),

  -- Evolução
  trend TEXT, -- 'improving', 'stable', 'worsening'
  trend_percentage NUMERIC(5,2), -- % de melhora ou piora

  -- Notas médicas
  medical_notes TEXT,
  treatment_changes TEXT[],

  -- Metadados
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_diagnosis_evolution_diagnosis ON diagnosis_evolution_history(diagnosis_id);
CREATE INDEX idx_diagnosis_evolution_user ON diagnosis_evolution_history(user_id);
CREATE INDEX idx_diagnosis_evolution_date ON diagnosis_evolution_history(snapshot_date DESC);

COMMENT ON TABLE diagnosis_evolution_history IS 'Histórico de evolução de diagnósticos ao longo do tempo';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. VIEWS ÚTEIS
-- ═══════════════════════════════════════════════════════════════════════════════

-- View: Exames completos com todos os relacionamentos
CREATE OR REPLACE VIEW exam_images_complete AS
SELECT
  ei.*,

  -- Laboratório
  lab.name AS laboratory_name,
  lab.cnpj AS laboratory_cnpj,
  lab.address_city AS laboratory_city,

  -- Médico solicitante
  req_doc.full_name AS requesting_doctor_name,
  req_doc.crm AS requesting_doctor_crm,
  req_doc.specialties AS requesting_doctor_specialties,

  -- Médico laudador
  rep_doc.full_name AS reporting_doctor_name,
  rep_doc.crm AS reporting_doctor_crm,

  -- Exame da biblioteca
  el.exam_name AS library_exam_name,
  el.exam_code AS library_exam_code,
  el.description AS library_exam_description,

  -- Categoria
  ec.name AS category_name,
  ec.icon AS category_icon

FROM exam_images ei
LEFT JOIN laboratories lab ON ei.laboratory_id = lab.id
LEFT JOIN doctors req_doc ON ei.requesting_doctor_id = req_doc.id
LEFT JOIN doctors rep_doc ON ei.reporting_doctor_id = rep_doc.id
LEFT JOIN exam_library el ON ei.exam_library_id = el.id
LEFT JOIN exam_categories ec ON ei.exam_category_id = ec.id;

-- View: Diagnósticos ativos por paciente
CREATE OR REPLACE VIEW active_diagnoses_by_patient AS
SELECT
  id.user_id,
  id.id AS diagnosis_id,

  -- Condição
  cc.condition_name,
  cc.condition_code,
  cc.category AS condition_category,
  cc.severity_level,

  -- Detalhes do diagnóstico
  id.confidence_score,
  id.urgency_level,
  id.status,
  id.evolution_trend,
  id.contributing_parameters,
  id.recommended_actions,
  id.recommended_specialists,

  -- Datas
  id.created_at AS identified_at,
  id.updated_at AS last_updated,
  id.reviewed_at,

  -- Contagem de evoluções
  (SELECT COUNT(*) FROM diagnosis_evolution_history deh
   WHERE deh.diagnosis_id = id.id) AS evolution_count

FROM identified_diagnoses id
INNER JOIN clinical_conditions cc ON id.condition_id = cc.id
WHERE id.status IN ('identified', 'confirmed')
ORDER BY id.urgency_level DESC, id.created_at DESC;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. FUNÇÕES ÚTEIS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Função para buscar valores de referência apropriados por idade/sexo
CREATE OR REPLACE FUNCTION get_reference_range(
  p_parameter_code TEXT,
  p_age_years INTEGER,
  p_sex TEXT -- 'male', 'female', 'all'
)
RETURNS JSONB AS $$
DECLARE
  ranges JSONB;
  match JSONB;
BEGIN
  -- Buscar ranges do parâmetro
  SELECT reference_ranges INTO ranges
  FROM exam_library_parameters
  WHERE parameter_code = p_parameter_code;

  IF ranges IS NULL THEN
    RETURN NULL;
  END IF;

  -- Procurar match exato por idade e sexo
  SELECT range INTO match
  FROM jsonb_array_elements(ranges) AS range
  WHERE (range->>'sex' = p_sex OR range->>'sex' = 'all')
    AND (range->>'age_min' IS NULL OR (range->>'age_min')::INTEGER <= p_age_years)
    AND (range->>'age_max' IS NULL OR (range->>'age_max')::INTEGER >= p_age_years)
  ORDER BY
    CASE WHEN range->>'sex' = p_sex THEN 1 ELSE 2 END, -- Prioriza sexo específico
    (range->>'age_min')::INTEGER DESC NULLS LAST
  LIMIT 1;

  RETURN match;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar diagnósticos automaticamente
CREATE OR REPLACE FUNCTION check_for_diagnoses(p_user_id UUID, p_health_analysis_id UUID)
RETURNS TABLE (
  condition_id UUID,
  condition_name TEXT,
  confidence_score NUMERIC,
  contributing_params JSONB
) AS $$
DECLARE
  rule RECORD;
  param_values JSONB;
  matches INTEGER;
  total_weight INTEGER;
  confidence NUMERIC;
BEGIN
  -- Para cada regra de diagnóstico ativa
  FOR rule IN
    SELECT dr.*, cc.condition_name
    FROM diagnostic_rules dr
    INNER JOIN clinical_conditions cc ON dr.condition_id = cc.id
    WHERE dr.is_active = true
    ORDER BY dr.priority ASC
  LOOP
    -- Buscar valores dos parâmetros do usuário
    SELECT jsonb_agg(
      jsonb_build_object(
        'parameter_code', elp.parameter_code,
        'value', er.value,
        'unit', er.unit
      )
    ) INTO param_values
    FROM exam_results er
    INNER JOIN exam_images ei ON er.exam_image_id = ei.id
    INNER JOIN exam_library_parameters elp ON er.parameter_name = elp.parameter_name
    WHERE ei.user_id = p_user_id
      AND ei.processing_status = 'completed'
    ORDER BY ei.exam_date DESC
    LIMIT 1;

    -- TODO: Implementar lógica de matching baseada em rule.criteria
    -- Por enquanto, retorna estrutura básica

  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_reference_range IS 'Retorna valores de referência apropriados baseado em idade e sexo';
COMMENT ON FUNCTION check_for_diagnoses IS 'Verifica automaticamente possíveis diagnósticos baseado em regras';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 12. RLS (ROW LEVEL SECURITY)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Laboratórios (públicos para leitura)
ALTER TABLE laboratories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view laboratories" ON laboratories FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage laboratories" ON laboratories FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Médicos (públicos para leitura)
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view doctors" ON doctors FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage doctors" ON doctors FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Biblioteca de exames (público para leitura)
ALTER TABLE exam_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view exam library" ON exam_library FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage exam library" ON exam_library FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

ALTER TABLE exam_library_parameters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view exam parameters" ON exam_library_parameters FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage exam parameters" ON exam_library_parameters FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Condições clínicas (público para leitura)
ALTER TABLE clinical_conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view conditions" ON clinical_conditions FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage conditions" ON clinical_conditions FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Regras de diagnóstico (apenas admins)
ALTER TABLE diagnostic_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage diagnostic rules" ON diagnostic_rules FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Diagnósticos identificados (próprios ou pacientes gerenciados)
ALTER TABLE identified_diagnoses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own diagnoses" ON identified_diagnoses FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Controllers can view patient diagnoses" ON identified_diagnoses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM controller_patients cp
      WHERE cp.controller_id = auth.uid() AND cp.patient_id = identified_diagnoses.user_id
    ) OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Histórico de evolução (mesmo esquema de diagnósticos)
ALTER TABLE diagnosis_evolution_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own evolution" ON diagnosis_evolution_history FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Controllers can view patient evolution" ON diagnosis_evolution_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM controller_patients cp
      WHERE cp.controller_id = auth.uid() AND cp.patient_id = diagnosis_evolution_history.user_id
    ) OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIM DA MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON SCHEMA public IS 'Estrutura completa do banco de dados ZOE MED com biblioteca de exames e sistema de diagnósticos';
