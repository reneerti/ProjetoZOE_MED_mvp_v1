-- ═══════════════════════════════════════════════════════════════
-- ESTRUTURA DE MEDICAÇÕES
-- Sistema completo para rastreamento de medicamentos
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. BIBLIOTECA DE MEDICAMENTOS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS medication_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_code TEXT UNIQUE NOT NULL,
  commercial_name TEXT NOT NULL,
  generic_name TEXT NOT NULL,
  active_ingredient TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  manufacturer TEXT,
  presentation JSONB,
  therapeutic_class TEXT,
  mechanism_of_action TEXT,
  indications TEXT[],
  contraindications TEXT[],
  common_side_effects TEXT[],
  serious_side_effects TEXT[],
  drug_interactions TEXT[],
  requires_prescription BOOLEAN DEFAULT true,
  controlled_substance BOOLEAN DEFAULT false,
  pregnancy_category TEXT,
  breastfeeding_safe BOOLEAN,
  storage_conditions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE medication_library IS 'Biblioteca de medicamentos com informações completas';
COMMENT ON COLUMN medication_library.medication_code IS 'Código único (ex: MED_MONJ, MED_METF)';
COMMENT ON COLUMN medication_library.category IS 'Categoria: antidiabeticos, hipolipemiantes, anti_hipertensivos, hormonios, antibioticos, etc';
COMMENT ON COLUMN medication_library.presentation IS 'Apresentações disponíveis: [{"dosage":"5mg","form":"comprimido","package":"30 comprimidos"}]';
COMMENT ON COLUMN medication_library.pregnancy_category IS 'A, B, C, D, X conforme FDA';

CREATE INDEX idx_medication_library_category ON medication_library(category);
CREATE INDEX idx_medication_library_code ON medication_library(medication_code);
CREATE INDEX idx_medication_library_generic ON medication_library(generic_name);

-- ═══════════════════════════════════════════════════════════════
-- 2. POSOLOGIAS PADRÃO
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS medication_dosage_guidelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES medication_library(id) ON DELETE CASCADE,
  indication TEXT NOT NULL,
  age_group TEXT,
  dosage_min NUMERIC,
  dosage_max NUMERIC,
  dosage_unit TEXT,
  frequency TEXT,
  route TEXT,
  duration TEXT,
  special_instructions TEXT,
  titration_schedule JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE medication_dosage_guidelines IS 'Diretrizes de posologia para cada medicamento';
COMMENT ON COLUMN medication_dosage_guidelines.age_group IS 'adulto, idoso, pediatrico';
COMMENT ON COLUMN medication_dosage_guidelines.route IS 'oral, injetavel, topico, sublingual, etc';
COMMENT ON COLUMN medication_dosage_guidelines.titration_schedule IS 'Esquema de titulação: [{"week":1,"dosage":2.5},{"week":2,"dosage":5}]';

CREATE INDEX idx_dosage_medication ON medication_dosage_guidelines(medication_id);

-- ═══════════════════════════════════════════════════════════════
-- 3. PRESCRIÇÕES DO USUÁRIO
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id UUID REFERENCES medication_library(id),
  medication_name TEXT NOT NULL,
  prescribing_doctor_id UUID REFERENCES doctors(id),
  prescription_date DATE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  dosage NUMERIC NOT NULL,
  dosage_unit TEXT NOT NULL,
  frequency TEXT NOT NULL,
  route TEXT DEFAULT 'oral',
  instructions TEXT,
  reason TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE user_prescriptions IS 'Prescrições médicas do usuário';
COMMENT ON COLUMN user_prescriptions.frequency IS 'Frequência: 1x/dia, 2x/dia, 3x/dia, 12/12h, 8/8h, SOS, etc';
COMMENT ON COLUMN user_prescriptions.reason IS 'Motivo da prescrição (diagnóstico)';

CREATE INDEX idx_user_prescriptions_user ON user_prescriptions(user_id);
CREATE INDEX idx_user_prescriptions_medication ON user_prescriptions(medication_id);
CREATE INDEX idx_user_prescriptions_active ON user_prescriptions(is_active) WHERE is_active = true;
CREATE INDEX idx_user_prescriptions_dates ON user_prescriptions(user_id, start_date DESC);

-- RLS
ALTER TABLE user_prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prescriptions"
  ON user_prescriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prescriptions"
  ON user_prescriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prescriptions"
  ON user_prescriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prescriptions"
  ON user_prescriptions FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 4. REGISTRO DE ADMINISTRAÇÃO/ADESÃO
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS medication_administration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES user_prescriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMPTZ NOT NULL,
  administered_time TIMESTAMPTZ,
  dosage_taken NUMERIC,
  status TEXT DEFAULT 'pending',
  skipped_reason TEXT,
  side_effects_reported TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE medication_administration_log IS 'Log de administração de medicamentos';
COMMENT ON COLUMN medication_administration_log.status IS 'Status: pending, taken, skipped, late';

CREATE INDEX idx_med_log_prescription ON medication_administration_log(prescription_id);
CREATE INDEX idx_med_log_user ON medication_administration_log(user_id);
CREATE INDEX idx_med_log_scheduled ON medication_administration_log(scheduled_time DESC);
CREATE INDEX idx_med_log_user_date ON medication_administration_log(user_id, scheduled_time DESC);

-- RLS
ALTER TABLE medication_administration_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own medication logs"
  ON medication_administration_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own medication logs"
  ON medication_administration_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own medication logs"
  ON medication_administration_log FOR UPDATE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 5. EFEITOS COLATERAIS REPORTADOS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS medication_side_effects_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prescription_id UUID NOT NULL REFERENCES user_prescriptions(id) ON DELETE CASCADE,
  side_effect TEXT NOT NULL,
  severity TEXT NOT NULL,
  started_at DATE NOT NULL,
  ended_at DATE,
  description TEXT,
  action_taken TEXT,
  reported_to_doctor BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE medication_side_effects_reports IS 'Reporte de efeitos colaterais pelo usuário';
COMMENT ON COLUMN medication_side_effects_reports.severity IS 'Severidade: leve, moderada, grave';

CREATE INDEX idx_side_effects_user ON medication_side_effects_reports(user_id);
CREATE INDEX idx_side_effects_prescription ON medication_side_effects_reports(prescription_id);

-- RLS
ALTER TABLE medication_side_effects_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own side effects reports"
  ON medication_side_effects_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own side effects reports"
  ON medication_side_effects_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 6. ALERTAS DE INTERAÇÕES MEDICAMENTOSAS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS drug_interaction_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_a_id UUID NOT NULL REFERENCES medication_library(id),
  medication_b_id UUID NOT NULL REFERENCES medication_library(id),
  interaction_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT NOT NULL,
  clinical_effects TEXT,
  recommendations TEXT,
  references TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE drug_interaction_alerts IS 'Base de interações medicamentosas conhecidas';
COMMENT ON COLUMN drug_interaction_alerts.interaction_type IS 'Tipo: farmacocinética, farmacodinâmica, sinérgica, antagônica';
COMMENT ON COLUMN drug_interaction_alerts.severity IS 'Severidade: leve, moderada, grave, contraindicada';

CREATE INDEX idx_drug_interactions_a ON drug_interaction_alerts(medication_a_id);
CREATE INDEX idx_drug_interactions_b ON drug_interaction_alerts(medication_b_id);
CREATE INDEX idx_drug_interactions_severity ON drug_interaction_alerts(severity);

-- ═══════════════════════════════════════════════════════════════
-- 7. ANÁLISE DE ADESÃO
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS medication_adherence_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prescription_id UUID NOT NULL REFERENCES user_prescriptions(id) ON DELETE CASCADE,
  analysis_period_start DATE NOT NULL,
  analysis_period_end DATE NOT NULL,
  total_scheduled_doses INTEGER NOT NULL,
  doses_taken INTEGER NOT NULL,
  doses_skipped INTEGER NOT NULL,
  doses_late INTEGER NOT NULL,
  adherence_rate NUMERIC(5,2) NOT NULL,
  adherence_level TEXT NOT NULL,
  barriers_identified TEXT[],
  recommendations TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE medication_adherence_analysis IS 'Análise de adesão ao tratamento medicamentoso';
COMMENT ON COLUMN medication_adherence_analysis.adherence_level IS 'Nível: excelente (>90%), bom (80-90%), regular (70-80%), ruim (<70%)';

CREATE INDEX idx_adherence_user ON medication_adherence_analysis(user_id);
CREATE INDEX idx_adherence_prescription ON medication_adherence_analysis(prescription_id);

-- RLS
ALTER TABLE medication_adherence_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own adherence analysis"
  ON medication_adherence_analysis FOR SELECT
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 8. VIEWS ÚTEIS
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW active_prescriptions AS
SELECT
  up.id,
  up.user_id,
  up.medication_name,
  ml.generic_name,
  ml.category,
  up.dosage,
  up.dosage_unit,
  up.frequency,
  up.start_date,
  up.end_date,
  d.full_name AS prescribing_doctor,
  d.crm,
  up.reason
FROM user_prescriptions up
LEFT JOIN medication_library ml ON up.medication_id = ml.id
LEFT JOIN doctors d ON up.prescribing_doctor_id = d.id
WHERE up.is_active = true
  AND (up.end_date IS NULL OR up.end_date >= CURRENT_DATE);

COMMENT ON VIEW active_prescriptions IS 'View de prescrições ativas do usuário';

-- ═══════════════════════════════════════════════════════════════
-- 9. FUNÇÕES ÚTEIS
-- ═══════════════════════════════════════════════════════════════

-- Função para detectar interações medicamentosas
CREATE OR REPLACE FUNCTION check_drug_interactions(
  p_user_id UUID
) RETURNS TABLE (
  medication_a TEXT,
  medication_b TEXT,
  severity TEXT,
  description TEXT,
  recommendations TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ml_a.commercial_name,
    ml_b.commercial_name,
    dia.severity,
    dia.description,
    dia.recommendations
  FROM user_prescriptions up_a
  JOIN user_prescriptions up_b ON up_a.user_id = up_b.user_id AND up_a.id < up_b.id
  JOIN drug_interaction_alerts dia ON (
    (dia.medication_a_id = up_a.medication_id AND dia.medication_b_id = up_b.medication_id) OR
    (dia.medication_a_id = up_b.medication_id AND dia.medication_b_id = up_a.medication_id)
  )
  JOIN medication_library ml_a ON up_a.medication_id = ml_a.id
  JOIN medication_library ml_b ON up_b.medication_id = ml_b.id
  WHERE up_a.user_id = p_user_id
    AND up_a.is_active = true
    AND up_b.is_active = true;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_drug_interactions IS 'Detecta interações entre medicamentos ativos do usuário';

-- Função para calcular taxa de adesão
CREATE OR REPLACE FUNCTION calculate_adherence_rate(
  p_prescription_id UUID,
  p_period_days INTEGER DEFAULT 30
) RETURNS NUMERIC AS $$
DECLARE
  v_total_scheduled INTEGER;
  v_doses_taken INTEGER;
  v_adherence_rate NUMERIC;
BEGIN
  -- Contar doses programadas no período
  SELECT COUNT(*) INTO v_total_scheduled
  FROM medication_administration_log
  WHERE prescription_id = p_prescription_id
    AND scheduled_time >= NOW() - (p_period_days || ' days')::INTERVAL
    AND scheduled_time <= NOW();

  -- Contar doses efetivamente tomadas
  SELECT COUNT(*) INTO v_doses_taken
  FROM medication_administration_log
  WHERE prescription_id = p_prescription_id
    AND scheduled_time >= NOW() - (p_period_days || ' days')::INTERVAL
    AND scheduled_time <= NOW()
    AND status = 'taken';

  -- Calcular taxa
  IF v_total_scheduled > 0 THEN
    v_adherence_rate := (v_doses_taken::NUMERIC / v_total_scheduled::NUMERIC) * 100;
  ELSE
    v_adherence_rate := NULL;
  END IF;

  RETURN ROUND(v_adherence_rate, 2);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_adherence_rate IS 'Calcula taxa de adesão para uma prescrição';

-- Trigger para atualizar timestamp
CREATE OR REPLACE FUNCTION update_medication_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_medication_library_timestamp
  BEFORE UPDATE ON medication_library
  FOR EACH ROW
  EXECUTE FUNCTION update_medication_timestamp();

CREATE TRIGGER update_user_prescriptions_timestamp
  BEFORE UPDATE ON user_prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_medication_timestamp();
