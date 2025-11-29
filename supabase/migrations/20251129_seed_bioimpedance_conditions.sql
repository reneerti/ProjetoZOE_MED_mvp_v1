-- ═══════════════════════════════════════════════════════════════
-- SEEDS: CONDIÇÕES CLÍNICAS DETECTÁVEIS POR BIOIMPEDÂNCIA
-- Condições relacionadas à composição corporal
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. OBESIDADE
-- ═══════════════════════════════════════════════════════════════

INSERT INTO bioimpedance_conditions (
  condition_code, condition_name, category, description,
  health_risks, recommendations, severity_levels
) VALUES (
  'BIA_OB',
  'Obesidade por Composição Corporal',
  'obesidade',
  'Excesso de gordura corporal independente do IMC',
  ARRAY[
    'Doenças cardiovasculares',
    'Diabetes tipo 2',
    'Hipertensão arterial',
    'Apneia do sono',
    'Doenças articulares',
    'Certos tipos de câncer'
  ],
  ARRAY[
    'Consultar nutricionista para plano alimentar',
    'Iniciar programa de exercícios físicos',
    'Avaliar hormônios tireoidianos',
    'Acompanhamento médico regular',
    'Reduzir consumo de alimentos ultraprocessados'
  ],
  '{
    "leve": {"bf_male_min": 20, "bf_male_max": 25, "bf_female_min": 33, "bf_female_max": 39},
    "moderada": {"bf_male_min": 25, "bf_male_max": 30, "bf_female_min": 39, "bf_female_max": 45},
    "severa": {"bf_male_min": 30, "bf_female_min": 45}
  }'::JSONB
);

-- Regra diagnóstica para obesidade
INSERT INTO bioimpedance_diagnostic_rules (
  condition_id, rule_name, criteria, priority
) SELECT id, 'Obesidade - Critério Percentual de Gordura',
  '{
    "required_parameters": [
      {
        "parameter_code": "BIA_BF",
        "operator": ">",
        "value_male": 25.0,
        "value_female": 33.0,
        "weight": 5
      }
    ],
    "optional_parameters": [
      {
        "parameter_code": "BIA_VF",
        "operator": ">=",
        "value": 10,
        "weight": 3
      }
    ],
    "minimum_matches": 1,
    "minimum_weight": 5
  }'::JSONB,
  1
FROM bioimpedance_conditions WHERE condition_code = 'BIA_OB';

-- ═══════════════════════════════════════════════════════════════
-- 2. SARCOPENIA
-- ═══════════════════════════════════════════════════════════════

INSERT INTO bioimpedance_conditions (
  condition_code, condition_name, category, description,
  health_risks, recommendations, severity_levels
) VALUES (
  'BIA_SARC',
  'Sarcopenia',
  'sarcopenia',
  'Perda de massa muscular associada ao envelhecimento ou inatividade',
  ARRAY[
    'Fragilidade e quedas',
    'Fraturas ósseas',
    'Perda de independência',
    'Redução da capacidade funcional',
    'Aumento de mortalidade'
  ],
  ARRAY[
    'Treino de resistência (musculação)',
    'Aumentar ingestão de proteínas (1.2-1.5g/kg/dia)',
    'Suplementação de vitamina D',
    'Avaliação geriátrica',
    'Fisioterapia para melhora funcional'
  ],
  '{
    "pre_sarcopenia": {"smi_male_min": 8.5, "smi_male_max": 9.5, "smi_female_min": 6.75, "smi_female_max": 7.5},
    "sarcopenia": {"smi_male_min": 7.0, "smi_male_max": 8.5, "smi_female_min": 5.7, "smi_female_max": 6.75},
    "sarcopenia_severa": {"smi_male_max": 7.0, "smi_female_max": 5.7}
  }'::JSONB
);

-- Regra diagnóstica para sarcopenia
INSERT INTO bioimpedance_diagnostic_rules (
  condition_id, rule_name, criteria, priority
) SELECT id, 'Sarcopenia - Critério SMI Baixo',
  '{
    "required_parameters": [
      {
        "parameter_code": "BIA_SMI",
        "operator": "<",
        "value_male": 8.5,
        "value_female": 6.75,
        "weight": 5
      }
    ],
    "optional_parameters": [
      {
        "parameter_code": "BIA_MM",
        "operator": "<",
        "value_male": 33.0,
        "value_female": 24.0,
        "weight": 3
      }
    ],
    "minimum_matches": 1,
    "minimum_weight": 5
  }'::JSONB,
  1
FROM bioimpedance_conditions WHERE condition_code = 'BIA_SARC';

-- ═══════════════════════════════════════════════════════════════
-- 3. OBESIDADE SARCOPÊNICA
-- ═══════════════════════════════════════════════════════════════

INSERT INTO bioimpedance_conditions (
  condition_code, condition_name, category, description,
  health_risks, recommendations, severity_levels
) VALUES (
  'BIA_SARC_OB',
  'Obesidade Sarcopênica',
  'obesidade',
  'Combinação de excesso de gordura com baixa massa muscular',
  ARRAY[
    'Risco cardiometabólico elevado',
    'Síndrome metabólica',
    'Fragilidade aumentada',
    'Limitação funcional severa',
    'Maior mortalidade que obesidade ou sarcopenia isoladas'
  ],
  ARRAY[
    'Programa combinado: musculação + aeróbico',
    'Dieta hipocalórica rica em proteínas',
    'Acompanhamento multidisciplinar',
    'Avaliação endocrinológica',
    'Monitoramento frequente'
  ],
  '{
    "moderada": {"bf_male_min": 25, "smi_male_max": 8.5, "bf_female_min": 33, "smi_female_max": 6.75},
    "severa": {"bf_male_min": 30, "smi_male_max": 7.0, "bf_female_min": 39, "smi_female_max": 5.7}
  }'::JSONB
);

-- Regra diagnóstica para obesidade sarcopênica
INSERT INTO bioimpedance_diagnostic_rules (
  condition_id, rule_name, criteria, priority
) SELECT id, 'Obesidade Sarcopênica - Critério Duplo',
  '{
    "required_parameters": [
      {
        "parameter_code": "BIA_BF",
        "operator": ">",
        "value_male": 25.0,
        "value_female": 33.0,
        "weight": 3
      },
      {
        "parameter_code": "BIA_SMI",
        "operator": "<",
        "value_male": 8.5,
        "value_female": 6.75,
        "weight": 3
      }
    ],
    "minimum_matches": 2,
    "minimum_weight": 6
  }'::JSONB,
  1
FROM bioimpedance_conditions WHERE condition_code = 'BIA_SARC_OB';

-- ═══════════════════════════════════════════════════════════════
-- 4. DESIDRATAÇÃO
-- ═══════════════════════════════════════════════════════════════

INSERT INTO bioimpedance_conditions (
  condition_code, condition_name, category, description,
  health_risks, recommendations, severity_levels
) VALUES (
  'BIA_DEHYD',
  'Desidratação',
  'desidratacao',
  'Baixo percentual de água corporal total',
  ARRAY[
    'Fadiga e fraqueza',
    'Tontura e confusão mental',
    'Constipação',
    'Problemas renais',
    'Pele seca'
  ],
  ARRAY[
    'Aumentar ingestão hídrica (2-3L/dia)',
    'Reduzir consumo de álcool e cafeína',
    'Consumir alimentos ricos em água',
    'Monitorar cor da urina',
    'Investigar causas médicas se persistir'
  ],
  '{
    "leve": {"tbw_male_min": 47, "tbw_male_max": 50, "tbw_female_min": 42, "tbw_female_max": 45},
    "moderada": {"tbw_male_min": 45, "tbw_male_max": 47, "tbw_female_min": 40, "tbw_female_max": 42},
    "severa": {"tbw_male_max": 45, "tbw_female_max": 40}
  }'::JSONB
);

-- Regra diagnóstica para desidratação
INSERT INTO bioimpedance_diagnostic_rules (
  condition_id, rule_name, criteria, priority
) SELECT id, 'Desidratação - Critério Água Corporal Baixa',
  '{
    "required_parameters": [
      {
        "parameter_code": "BIA_TBW",
        "operator": "<",
        "value_male": 50.0,
        "value_female": 45.0,
        "weight": 5
      }
    ],
    "minimum_matches": 1,
    "minimum_weight": 5
  }'::JSONB,
  1
FROM bioimpedance_conditions WHERE condition_code = 'BIA_DEHYD';

-- ═══════════════════════════════════════════════════════════════
-- 5. RETENÇÃO DE LÍQUIDOS / EDEMA
-- ═══════════════════════════════════════════════════════════════

INSERT INTO bioimpedance_conditions (
  condition_code, condition_name, category, description,
  health_risks, recommendations, severity_levels
) VALUES (
  'BIA_EDEMA',
  'Retenção de Líquidos',
  'retencao_liquidos',
  'Excesso de água extracelular indicando edema',
  ARRAY[
    'Insuficiência cardíaca',
    'Doença renal',
    'Problemas hepáticos',
    'Hipertensão',
    'Linfedema'
  ],
  ARRAY[
    'Avaliação médica urgente',
    'Reduzir consumo de sódio',
    'Elevar pernas quando deitado',
    'Evitar ficar muito tempo parado',
    'Investigar causas cardiovasculares ou renais'
  ],
  '{
    "leve": {"ecw_tbw_min": 0.40, "ecw_tbw_max": 0.42},
    "moderada": {"ecw_tbw_min": 0.42, "ecw_tbw_max": 0.45},
    "severa": {"ecw_tbw_min": 0.45}
  }'::JSONB
);

-- Regra diagnóstica para retenção de líquidos
INSERT INTO bioimpedance_diagnostic_rules (
  condition_id, rule_name, criteria, priority
) SELECT id, 'Edema - Critério Razão ECW/TBW Elevada',
  '{
    "required_parameters": [
      {
        "parameter_code": "BIA_ECW_TBW",
        "operator": ">",
        "value": 0.40,
        "weight": 5
      }
    ],
    "optional_parameters": [
      {
        "parameter_code": "BIA_TBW",
        "operator": ">",
        "value_male": 65.0,
        "value_female": 60.0,
        "weight": 2
      }
    ],
    "minimum_matches": 1,
    "minimum_weight": 5
  }'::JSONB,
  1
FROM bioimpedance_conditions WHERE condition_code = 'BIA_EDEMA';

-- ═══════════════════════════════════════════════════════════════
-- 6. BAIXA MASSA MUSCULAR (sem sarcopenia formal)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO bioimpedance_conditions (
  condition_code, condition_name, category, description,
  health_risks, recommendations, severity_levels
) VALUES (
  'BIA_LOW_MM',
  'Baixa Massa Muscular',
  'baixa_massa_muscular',
  'Massa muscular abaixo do ideal mas acima do critério de sarcopenia',
  ARRAY[
    'Metabolismo basal reduzido',
    'Menor resistência física',
    'Tendência ao ganho de gordura',
    'Risco futuro de sarcopenia'
  ],
  ARRAY[
    'Iniciar treino de resistência',
    'Aumentar ingestão proteica',
    'Avaliar níveis de vitamina D',
    'Considerar suplementação de creatina',
    'Monitorar evolução trimestral'
  ],
  '{
    "leve": {"mm_male_min": 31, "mm_male_max": 33, "mm_female_min": 22, "mm_female_max": 24}
  }'::JSONB
);

-- Regra diagnóstica para baixa massa muscular
INSERT INTO bioimpedance_diagnostic_rules (
  condition_id, rule_name, criteria, priority
) SELECT id, 'Baixa Massa Muscular - Abaixo do Ideal',
  '{
    "required_parameters": [
      {
        "parameter_code": "BIA_MM",
        "operator": "<",
        "value_male": 36.0,
        "value_female": 27.0,
        "weight": 4
      },
      {
        "parameter_code": "BIA_SMI",
        "operator": ">=",
        "value_male": 8.5,
        "value_female": 6.75,
        "weight": 2
      }
    ],
    "minimum_matches": 2,
    "minimum_weight": 6
  }'::JSONB,
  2
FROM bioimpedance_conditions WHERE condition_code = 'BIA_LOW_MM';

-- ═══════════════════════════════════════════════════════════════
-- 7. GORDURA VISCERAL ELEVADA
-- ═══════════════════════════════════════════════════════════════

INSERT INTO bioimpedance_conditions (
  condition_code, condition_name, category, description,
  health_risks, recommendations, severity_levels
) VALUES (
  'BIA_HIGH_VF',
  'Gordura Visceral Elevada',
  'obesidade',
  'Excesso de gordura ao redor dos órgãos abdominais',
  ARRAY[
    'Resistência à insulina e diabetes',
    'Doenças cardiovasculares',
    'Síndrome metabólica',
    'Fígado gorduroso',
    'Inflamação crônica'
  ],
  ARRAY[
    'Dieta anti-inflamatória',
    'Exercícios aeróbicos regulares',
    'Reduzir açúcar e carboidratos refinados',
    'Avaliação de resistência insulínica',
    'Acompanhamento endocrinológico'
  ],
  '{
    "elevada": {"vf_min": 10, "vf_max": 14},
    "muito_elevada": {"vf_min": 15}
  }'::JSONB
);

-- Regra diagnóstica para gordura visceral elevada
INSERT INTO bioimpedance_diagnostic_rules (
  condition_id, rule_name, criteria, priority
) SELECT id, 'Gordura Visceral Elevada - Critério Nível',
  '{
    "required_parameters": [
      {
        "parameter_code": "BIA_VF",
        "operator": ">=",
        "value": 10,
        "weight": 5
      }
    ],
    "minimum_matches": 1,
    "minimum_weight": 5
  }'::JSONB,
  1
FROM bioimpedance_conditions WHERE condition_code = 'BIA_HIGH_VF';

-- ═══════════════════════════════════════════════════════════════
-- 8. METABOLISMO REDUZIDO
-- ═══════════════════════════════════════════════════════════════

INSERT INTO bioimpedance_conditions (
  condition_code, condition_name, category, description,
  health_risks, recommendations, severity_levels
) VALUES (
  'BIA_LOW_BMR',
  'Metabolismo Basal Reduzido',
  'metabolismo',
  'Taxa metabólica basal abaixo do esperado',
  ARRAY[
    'Dificuldade para perder peso',
    'Fadiga crônica',
    'Possível hipotireoidismo',
    'Perda de massa muscular'
  ],
  ARRAY[
    'Avaliar função tireoidiana (TSH, T4)',
    'Aumentar massa muscular',
    'Evitar dietas muito restritivas',
    'Melhorar qualidade do sono',
    'Consultar endocrinologista'
  ],
  '{
    "reduzido": {"bmr_below_expected_percentage": 10}
  }'::JSONB
);

-- Regra diagnóstica para metabolismo reduzido
INSERT INTO bioimpedance_diagnostic_rules (
  condition_id, rule_name, criteria, priority
) SELECT id, 'Metabolismo Reduzido - Critério BMR Baixo',
  '{
    "required_parameters": [
      {
        "parameter_code": "BIA_BMR",
        "operator": "<",
        "value_male": 1500,
        "value_female": 1100,
        "weight": 4
      }
    ],
    "optional_parameters": [
      {
        "parameter_code": "BIA_MM",
        "operator": "<",
        "value_male": 33,
        "value_female": 24,
        "weight": 2
      }
    ],
    "minimum_matches": 1,
    "minimum_weight": 4
  }'::JSONB,
  2
FROM bioimpedance_conditions WHERE condition_code = 'BIA_LOW_BMR';

-- ═══════════════════════════════════════════════════════════════
-- 9. BAIXA INTEGRIDADE CELULAR (Phase Angle)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO bioimpedance_conditions (
  condition_code, condition_name, category, description,
  health_risks, recommendations, severity_levels
) VALUES (
  'BIA_LOW_PA',
  'Baixa Integridade Celular',
  'outros',
  'Ângulo de fase reduzido indicando saúde celular comprometida',
  ARRAY[
    'Desnutrição',
    'Doenças crônicas',
    'Redução da capacidade funcional',
    'Maior mortalidade'
  ],
  ARRAY[
    'Avaliação nutricional completa',
    'Investigar doenças crônicas',
    'Otimizar ingestão de micronutrientes',
    'Suplementação se necessário',
    'Acompanhamento médico'
  ],
  '{
    "reduzido": {"pa_male_max": 5.5, "pa_female_max": 5.0}
  }'::JSONB
);

-- Regra diagnóstica para baixa integridade celular
INSERT INTO bioimpedance_diagnostic_rules (
  condition_id, rule_name, criteria, priority
) SELECT id, 'Baixa Integridade Celular - Ângulo de Fase Baixo',
  '{
    "required_parameters": [
      {
        "parameter_code": "BIA_PA",
        "operator": "<",
        "value_male": 5.5,
        "value_female": 5.0,
        "weight": 5
      }
    ],
    "minimum_matches": 1,
    "minimum_weight": 5
  }'::JSONB,
  2
FROM bioimpedance_conditions WHERE condition_code = 'BIA_LOW_PA';
