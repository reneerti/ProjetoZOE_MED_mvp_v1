-- ═══════════════════════════════════════════════════════════════
-- ESTRUTURA DE BIOIMPEDÂNCIA
-- Sistema completo para análise de composição corporal
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. BIBLIOTECA DE PARÂMETROS DE BIOIMPEDÂNCIA
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bioimpedance_parameter_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter_code TEXT UNIQUE NOT NULL,
  parameter_name TEXT NOT NULL,
  parameter_name_english TEXT,
  category TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL,
  reference_ranges JSONB NOT NULL,
  interpretation_guide TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE bioimpedance_parameter_library IS 'Biblioteca de parâmetros de bioimpedância com faixas de referência';
COMMENT ON COLUMN bioimpedance_parameter_library.parameter_code IS 'Código único (ex: BIA_BF, BIA_MM, BIA_TBW)';
COMMENT ON COLUMN bioimpedance_parameter_library.category IS 'Categoria: composicao_corporal, agua_corporal, metabolismo, muscular, outros';
COMMENT ON COLUMN bioimpedance_parameter_library.reference_ranges IS 'Faixas por idade, sexo e nível atlético [{"age_min":18,"age_max":39,"sex":"male","athletic_level":"sedentary","min":10,"max":20,"optimal_min":12,"optimal_max":18}]';

CREATE INDEX idx_bioimpedance_library_category ON bioimpedance_parameter_library(category);
CREATE INDEX idx_bioimpedance_library_code ON bioimpedance_parameter_library(parameter_code);

-- ═══════════════════════════════════════════════════════════════
-- 2. REGISTROS DE BIOIMPEDÂNCIA DO USUÁRIO
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bioimpedance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measurement_date DATE NOT NULL,
  measurement_time TIME,
  device_brand TEXT,
  device_model TEXT,
  measurement_conditions JSONB,
  notes TEXT,
  file_url TEXT,
  processing_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE bioimpedance_records IS 'Registros de medições de bioimpedância';
COMMENT ON COLUMN bioimpedance_records.measurement_conditions IS 'Condições da medição: {"hydration":"normal","fasting_hours":8,"last_exercise_hours":24}';
COMMENT ON COLUMN bioimpedance_records.processing_status IS 'Status: pending, processing, completed, failed';

CREATE INDEX idx_bioimpedance_user ON bioimpedance_records(user_id);
CREATE INDEX idx_bioimpedance_date ON bioimpedance_records(measurement_date DESC);
CREATE INDEX idx_bioimpedance_user_date ON bioimpedance_records(user_id, measurement_date DESC);

-- RLS
ALTER TABLE bioimpedance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bioimpedance records"
  ON bioimpedance_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bioimpedance records"
  ON bioimpedance_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bioimpedance records"
  ON bioimpedance_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bioimpedance records"
  ON bioimpedance_records FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 3. RESULTADOS DE BIOIMPEDÂNCIA
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bioimpedance_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES bioimpedance_records(id) ON DELETE CASCADE,
  parameter_code TEXT,
  bioimpedance_parameter_id UUID REFERENCES bioimpedance_parameter_library(id),
  parameter_name TEXT NOT NULL,
  value NUMERIC,
  unit TEXT,
  status TEXT DEFAULT 'normal',
  percentile NUMERIC(5,2),
  z_score NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE bioimpedance_results IS 'Resultados individuais de cada parâmetro de bioimpedância';
COMMENT ON COLUMN bioimpedance_results.status IS 'Status: muito_baixo, baixo, normal, ideal, alto, muito_alto, critico';
COMMENT ON COLUMN bioimpedance_results.percentile IS 'Percentil em relação à população de referência (0-100)';
COMMENT ON COLUMN bioimpedance_results.z_score IS 'Z-score (desvios padrão da média)';

CREATE INDEX idx_bioimpedance_results_record ON bioimpedance_results(record_id);
CREATE INDEX idx_bioimpedance_results_code ON bioimpedance_results(parameter_code);
CREATE INDEX idx_bioimpedance_results_param ON bioimpedance_results(bioimpedance_parameter_id);

-- RLS
ALTER TABLE bioimpedance_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bioimpedance results"
  ON bioimpedance_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bioimpedance_records
      WHERE bioimpedance_records.id = bioimpedance_results.record_id
        AND bioimpedance_records.user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- 4. CONDIÇÕES IDENTIFICADAS POR BIOIMPEDÂNCIA
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bioimpedance_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_code TEXT UNIQUE NOT NULL,
  condition_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  health_risks TEXT[],
  recommendations TEXT[],
  severity_levels JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE bioimpedance_conditions IS 'Condições identificáveis por bioimpedância';
COMMENT ON COLUMN bioimpedance_conditions.category IS 'Categoria: obesidade, sarcopenia, desidratacao, retencao_liquidos, baixa_massa_muscular';
COMMENT ON COLUMN bioimpedance_conditions.severity_levels IS 'Níveis de severidade: {"mild":{"min":25,"max":30},"moderate":{"min":30,"max":35},"severe":{"min":35}}';

-- ═══════════════════════════════════════════════════════════════
-- 5. REGRAS DIAGNÓSTICAS DE BIOIMPEDÂNCIA
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bioimpedance_diagnostic_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_id UUID NOT NULL REFERENCES bioimpedance_conditions(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  criteria JSONB NOT NULL,
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE bioimpedance_diagnostic_rules IS 'Regras para detecção automática de condições por bioimpedância';
COMMENT ON COLUMN bioimpedance_diagnostic_rules.criteria IS 'Critérios JSON: {"required_parameters":[{"parameter_code":"BIA_BF","operator":">","value_male":25,"weight":3}],"minimum_matches":2}';

CREATE INDEX idx_bioimpedance_rules_condition ON bioimpedance_diagnostic_rules(condition_id);
CREATE INDEX idx_bioimpedance_rules_active ON bioimpedance_diagnostic_rules(is_active) WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════════
-- 6. DIAGNÓSTICOS IDENTIFICADOS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS identified_bioimpedance_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_id UUID NOT NULL REFERENCES bioimpedance_records(id) ON DELETE CASCADE,
  condition_id UUID NOT NULL REFERENCES bioimpedance_conditions(id),
  confidence_score NUMERIC(5,2) NOT NULL,
  severity_level TEXT,
  contributing_parameters JSONB,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE identified_bioimpedance_conditions IS 'Condições identificadas automaticamente por bioimpedância';
COMMENT ON COLUMN identified_bioimpedance_conditions.severity_level IS 'Severidade: leve, moderado, severo';

CREATE INDEX idx_identified_bia_user ON identified_bioimpedance_conditions(user_id);
CREATE INDEX idx_identified_bia_record ON identified_bioimpedance_conditions(record_id);
CREATE INDEX idx_identified_bia_condition ON identified_bioimpedance_conditions(condition_id);

-- RLS
ALTER TABLE identified_bioimpedance_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bioimpedance conditions"
  ON identified_bioimpedance_conditions FOR SELECT
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 7. HISTÓRICO DE EVOLUÇÃO
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bioimpedance_evolution_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parameter_code TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_value NUMERIC NOT NULL,
  end_value NUMERIC NOT NULL,
  change_percentage NUMERIC(6,2),
  trend TEXT,
  goal_value NUMERIC,
  goal_reached BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE bioimpedance_evolution_tracking IS 'Rastreamento de evolução de parâmetros de bioimpedância';
COMMENT ON COLUMN bioimpedance_evolution_tracking.trend IS 'Tendência: improving, stable, worsening';

CREATE INDEX idx_bia_evolution_user ON bioimpedance_evolution_tracking(user_id);
CREATE INDEX idx_bia_evolution_param ON bioimpedance_evolution_tracking(parameter_code);

-- RLS
ALTER TABLE bioimpedance_evolution_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bioimpedance evolution"
  ON bioimpedance_evolution_tracking FOR SELECT
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 8. VIEWS ÚTEIS
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW bioimpedance_complete_records AS
SELECT
  br.id,
  br.user_id,
  br.measurement_date,
  br.device_brand,
  br.device_model,
  br.processing_status,
  jsonb_agg(
    jsonb_build_object(
      'parameter_code', bres.parameter_code,
      'parameter_name', bres.parameter_name,
      'value', bres.value,
      'unit', bres.unit,
      'status', bres.status,
      'percentile', bres.percentile
    ) ORDER BY bres.parameter_name
  ) AS parameters,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'condition_name', bc.condition_name,
        'confidence', ibc.confidence_score,
        'severity', ibc.severity_level
      )
    )
    FROM identified_bioimpedance_conditions ibc
    JOIN bioimpedance_conditions bc ON ibc.condition_id = bc.id
    WHERE ibc.record_id = br.id
  ) AS identified_conditions
FROM bioimpedance_records br
LEFT JOIN bioimpedance_results bres ON br.id = bres.record_id
GROUP BY br.id;

COMMENT ON VIEW bioimpedance_complete_records IS 'View completa de registros com parâmetros e condições';

-- ═══════════════════════════════════════════════════════════════
-- 9. FUNÇÕES ÚTEIS
-- ═══════════════════════════════════════════════════════════════

-- Função para calcular percentil baseado em distribuição normal
CREATE OR REPLACE FUNCTION calculate_percentile(
  p_value NUMERIC,
  p_mean NUMERIC,
  p_stddev NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  z_score NUMERIC;
  percentile NUMERIC;
BEGIN
  -- Calcular z-score
  z_score := (p_value - p_mean) / NULLIF(p_stddev, 0);

  -- Aproximação do percentil (simplificada)
  -- Para cálculo preciso, usar tabela de distribuição normal
  IF z_score <= -3 THEN percentile := 0.13;
  ELSIF z_score <= -2 THEN percentile := 2.28;
  ELSIF z_score <= -1 THEN percentile := 15.87;
  ELSIF z_score <= 0 THEN percentile := 50.00;
  ELSIF z_score <= 1 THEN percentile := 84.13;
  ELSIF z_score <= 2 THEN percentile := 97.72;
  ELSE percentile := 99.87;
  END IF;

  RETURN ROUND(percentile, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para obter faixa de referência apropriada
CREATE OR REPLACE FUNCTION get_bioimpedance_reference_range(
  p_parameter_code TEXT,
  p_age INTEGER,
  p_sex TEXT,
  p_athletic_level TEXT DEFAULT 'sedentary'
) RETURNS JSONB AS $$
DECLARE
  v_range JSONB;
BEGIN
  SELECT jsonb_array_elements(reference_ranges) INTO v_range
  FROM bioimpedance_parameter_library
  WHERE parameter_code = p_parameter_code
    AND (
      (reference_ranges->>'age_min')::INTEGER <= p_age OR (reference_ranges->>'age_min') IS NULL
    )
    AND (
      (reference_ranges->>'age_max')::INTEGER >= p_age OR (reference_ranges->>'age_max') IS NULL
    )
    AND (reference_ranges->>'sex' = p_sex OR reference_ranges->>'sex' = 'all')
    AND (reference_ranges->>'athletic_level' = p_athletic_level OR (reference_ranges->>'athletic_level') IS NULL)
  LIMIT 1;

  RETURN v_range;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_bioimpedance_reference_range IS 'Retorna faixa de referência apropriada para bioimpedância';
