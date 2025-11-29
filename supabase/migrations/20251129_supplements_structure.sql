-- ═══════════════════════════════════════════════════════════════
-- ESTRUTURA DE SUPLEMENTAÇÃO
-- Sistema completo para rastreamento de suplementos
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. BIBLIOTECA DE SUPLEMENTOS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS supplement_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplement_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  active_compounds JSONB NOT NULL,
  description TEXT,
  benefits TEXT[],
  recommended_dosage_min NUMERIC,
  recommended_dosage_max NUMERIC,
  dosage_unit TEXT,
  upper_limit_safe NUMERIC,
  deficiency_symptoms TEXT[],
  excess_symptoms TEXT[],
  food_sources TEXT[],
  absorption_enhancers TEXT[],
  absorption_inhibitors TEXT[],
  contraindications TEXT[],
  interactions TEXT[],
  best_time_to_take TEXT,
  take_with_food BOOLEAN,
  pregnancy_safe BOOLEAN,
  breastfeeding_safe BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE supplement_library IS 'Biblioteca de suplementos com informações completas';
COMMENT ON COLUMN supplement_library.supplement_code IS 'Código único (ex: SUP_VIT_D, SUP_OMEGA3)';
COMMENT ON COLUMN supplement_library.category IS 'Categoria: vitaminas, minerais, aminoacidos, probioticos, fitoter
apicos, outros';
COMMENT ON COLUMN supplement_library.active_compounds IS 'Compostos ativos: [{"compound":"Vitamina D3","amount":1000,"unit":"UI"}]';
COMMENT ON COLUMN supplement_library.upper_limit_safe IS 'Limite superior seguro (UL - Upper Limit)';

CREATE INDEX idx_supplement_library_category ON supplement_library(category);
CREATE INDEX idx_supplement_library_code ON supplement_library(supplement_code);

-- ═══════════════════════════════════════════════════════════════
-- 2. REGISTROS DE SUPLEMENTAÇÃO DO USUÁRIO
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_supplements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplement_id UUID REFERENCES supplement_library(id),
  supplement_name TEXT NOT NULL,
  brand TEXT,
  dosage NUMERIC NOT NULL,
  dosage_unit TEXT NOT NULL,
  frequency TEXT NOT NULL,
  time_of_day TEXT[],
  with_food BOOLEAN DEFAULT true,
  start_date DATE NOT NULL,
  end_date DATE,
  reason TEXT,
  prescribed_by TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE user_supplements IS 'Suplementos em uso pelo usuário';
COMMENT ON COLUMN user_supplements.frequency IS 'Frequência: diario, dias_alternados, 2x_semana, etc';
COMMENT ON COLUMN user_supplements.time_of_day IS 'Horários: [manha, tarde, noite, jejum, apos_treino]';

CREATE INDEX idx_user_supplements_user ON user_supplements(user_id);
CREATE INDEX idx_user_supplements_supplement ON user_supplements(supplement_id);
CREATE INDEX idx_user_supplements_active ON user_supplements(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE user_supplements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own supplements"
  ON user_supplements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own supplements"
  ON user_supplements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own supplements"
  ON user_supplements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own supplements"
  ON user_supplements FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 3. LOG DE INGESTÃO
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS supplement_intake_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_supplement_id UUID NOT NULL REFERENCES user_supplements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMPTZ NOT NULL,
  taken_time TIMESTAMPTZ,
  dosage_taken NUMERIC,
  status TEXT DEFAULT 'pending',
  skipped_reason TEXT,
  side_effects TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE supplement_intake_log IS 'Log de ingestão de suplementos';
COMMENT ON COLUMN supplement_intake_log.status IS 'Status: pending, taken, skipped';

CREATE INDEX idx_supplement_log_user_supplement ON supplement_intake_log(user_supplement_id);
CREATE INDEX idx_supplement_log_user ON supplement_intake_log(user_id);
CREATE INDEX idx_supplement_log_time ON supplement_intake_log(scheduled_time DESC);

-- RLS
ALTER TABLE supplement_intake_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own supplement logs"
  ON supplement_intake_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own supplement logs"
  ON supplement_intake_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own supplement logs"
  ON supplement_intake_log FOR UPDATE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 4. NÍVEIS NUTRICIONAIS (baseado em exames)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS nutrient_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_image_id UUID REFERENCES exam_images(id),
  nutrient_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  reference_min NUMERIC,
  reference_max NUMERIC,
  status TEXT,
  test_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE nutrient_levels IS 'Níveis de nutrientes baseados em exames laboratoriais';
COMMENT ON COLUMN nutrient_levels.status IS 'Status: deficiente, insuficiente, adequado, excessivo';

CREATE INDEX idx_nutrient_levels_user ON nutrient_levels(user_id);
CREATE INDEX idx_nutrient_levels_nutrient ON nutrient_levels(nutrient_name);
CREATE INDEX idx_nutrient_levels_date ON nutrient_levels(test_date DESC);

-- RLS
ALTER TABLE nutrient_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nutrient levels"
  ON nutrient_levels FOR SELECT
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 5. RECOMENDAÇÕES DE SUPLEMENTAÇÃO
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS supplement_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplement_id UUID REFERENCES supplement_library(id),
  reason TEXT NOT NULL,
  based_on TEXT[],
  recommended_dosage NUMERIC,
  dosage_unit TEXT,
  duration_weeks INTEGER,
  priority TEXT DEFAULT 'media',
  status TEXT DEFAULT 'pending',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE supplement_recommendations IS 'Recomendações de suplementação baseadas em exames e condições';
COMMENT ON COLUMN supplement_recommendations.based_on IS 'Base: [deficiencia_detectada, sintomas, bioimpedancia, objetivo]';
COMMENT ON COLUMN supplement_recommendations.priority IS 'Prioridade: baixa, media, alta, critica';
COMMENT ON COLUMN supplement_recommendations.status IS 'Status: pending, accepted, rejected, completed';

CREATE INDEX idx_supplement_rec_user ON supplement_recommendations(user_id);
CREATE INDEX idx_supplement_rec_status ON supplement_recommendations(status);

-- RLS
ALTER TABLE supplement_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own supplement recommendations"
  ON supplement_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own supplement recommendations"
  ON supplement_recommendations FOR UPDATE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 6. INTERAÇÕES SUPLEMENTO-MEDICAMENTO
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS supplement_drug_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplement_id UUID NOT NULL REFERENCES supplement_library(id),
  medication_id UUID NOT NULL REFERENCES medication_library(id),
  interaction_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT NOT NULL,
  clinical_effects TEXT,
  recommendations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE supplement_drug_interactions IS 'Interações entre suplementos e medicamentos';
COMMENT ON COLUMN supplement_drug_interactions.interaction_type IS 'Tipo: reducao_absorcao, potencializacao, antagonismo';
COMMENT ON COLUMN supplement_drug_interactions.severity IS 'Severidade: leve, moderada, grave';

CREATE INDEX idx_supp_drug_int_supplement ON supplement_drug_interactions(supplement_id);
CREATE INDEX idx_supp_drug_int_medication ON supplement_drug_interactions(medication_id);

-- ═══════════════════════════════════════════════════════════════
-- 7. VIEWS ÚTEIS
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW active_supplements AS
SELECT
  us.id,
  us.user_id,
  us.supplement_name,
  sl.category,
  us.dosage,
  us.dosage_unit,
  us.frequency,
  us.time_of_day,
  us.start_date,
  us.reason,
  us.brand
FROM user_supplements us
LEFT JOIN supplement_library sl ON us.supplement_id = sl.id
WHERE us.is_active = true
  AND (us.end_date IS NULL OR us.end_date >= CURRENT_DATE);

COMMENT ON VIEW active_supplements IS 'View de suplementos ativos do usuário';

-- ═══════════════════════════════════════════════════════════════
-- 8. FUNÇÕES ÚTEIS
-- ═══════════════════════════════════════════════════════════════

-- Função para detectar interações suplemento-medicamento
CREATE OR REPLACE FUNCTION check_supplement_drug_interactions(
  p_user_id UUID
) RETURNS TABLE (
  supplement_name TEXT,
  medication_name TEXT,
  severity TEXT,
  description TEXT,
  recommendations TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sl.name,
    ml.commercial_name,
    sdi.severity,
    sdi.description,
    sdi.recommendations
  FROM user_supplements us
  JOIN user_prescriptions up ON us.user_id = up.user_id
  JOIN supplement_drug_interactions sdi ON (
    sdi.supplement_id = us.supplement_id AND sdi.medication_id = up.medication_id
  )
  JOIN supplement_library sl ON us.supplement_id = sl.id
  JOIN medication_library ml ON up.medication_id = ml.id
  WHERE us.user_id = p_user_id
    AND us.is_active = true
    AND up.is_active = true;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_supplement_drug_interactions IS 'Detecta interações entre suplementos e medicamentos ativos';

-- Função para gerar recomendações baseadas em deficiências
CREATE OR REPLACE FUNCTION generate_supplement_recommendations(
  p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_recommendations_created INTEGER := 0;
  v_nutrient RECORD;
BEGIN
  -- Buscar deficiências recentes (últimos 90 dias)
  FOR v_nutrient IN
    SELECT DISTINCT ON (nutrient_name)
      nutrient_name,
      value,
      unit,
      reference_min,
      status
    FROM nutrient_levels
    WHERE user_id = p_user_id
      AND status IN ('deficiente', 'insuficiente')
      AND test_date >= CURRENT_DATE - INTERVAL '90 days'
    ORDER BY nutrient_name, test_date DESC
  LOOP
    -- Verificar se já existe recomendação pendente
    IF NOT EXISTS (
      SELECT 1 FROM supplement_recommendations
      WHERE user_id = p_user_id
        AND reason LIKE '%' || v_nutrient.nutrient_name || '%'
        AND status IN ('pending', 'accepted')
    ) THEN
      -- Criar recomendação (lógica simplificada - pode ser expandida)
      INSERT INTO supplement_recommendations (
        user_id,
        reason,
        based_on,
        priority,
        status
      ) VALUES (
        p_user_id,
        'Deficiência de ' || v_nutrient.nutrient_name || ' detectada em exame',
        ARRAY['deficiencia_detectada'],
        CASE
          WHEN v_nutrient.status = 'deficiente' THEN 'alta'
          ELSE 'media'
        END,
        'pending'
      );

      v_recommendations_created := v_recommendations_created + 1;
    END IF;
  END LOOP;

  RETURN v_recommendations_created;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_supplement_recommendations IS 'Gera recomendações de suplementação baseadas em deficiências detectadas';

-- Trigger para atualizar timestamp
CREATE OR REPLACE FUNCTION update_supplement_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_supplement_library_timestamp
  BEFORE UPDATE ON supplement_library
  FOR EACH ROW
  EXECUTE FUNCTION update_supplement_timestamp();

CREATE TRIGGER update_user_supplements_timestamp
  BEFORE UPDATE ON user_supplements
  FOR EACH ROW
  EXECUTE FUNCTION update_supplement_timestamp();
