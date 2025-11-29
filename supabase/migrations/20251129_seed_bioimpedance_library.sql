-- ═══════════════════════════════════════════════════════════════
-- SEEDS: BIBLIOTECA DE PARÂMETROS DE BIOIMPEDÂNCIA
-- Parâmetros comuns em análise de composição corporal
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- CATEGORIA: COMPOSIÇÃO CORPORAL
-- ═══════════════════════════════════════════════════════════════

-- Percentual de Gordura Corporal (Body Fat)
INSERT INTO bioimpedance_parameter_library (
  parameter_code, parameter_name, parameter_name_english, category,
  description, unit, reference_ranges, interpretation_guide
) VALUES (
  'BIA_BF',
  'Percentual de Gordura Corporal',
  'Body Fat Percentage',
  'composicao_corporal',
  'Percentual de massa gorda em relação ao peso total',
  '%',
  '[
    {"age_min": 18, "age_max": 39, "sex": "male", "athletic_level": "sedentary", "min": 8, "max": 20, "optimal_min": 14, "optimal_max": 17, "critical_max": 25},
    {"age_min": 18, "age_max": 39, "sex": "female", "athletic_level": "sedentary", "min": 21, "max": 33, "optimal_min": 21, "optimal_max": 24, "critical_max": 39},
    {"age_min": 40, "age_max": 59, "sex": "male", "athletic_level": "sedentary", "min": 11, "max": 22, "optimal_min": 18, "optimal_max": 20, "critical_max": 28},
    {"age_min": 40, "age_max": 59, "sex": "female", "athletic_level": "sedentary", "min": 23, "max": 34, "optimal_min": 23, "optimal_max": 27, "critical_max": 40},
    {"age_min": 60, "age_max": null, "sex": "male", "athletic_level": "sedentary", "min": 13, "max": 25, "optimal_min": 20, "optimal_max": 22, "critical_max": 30},
    {"age_min": 60, "age_max": null, "sex": "female", "athletic_level": "sedentary", "min": 24, "max": 36, "optimal_min": 24, "optimal_max": 30, "critical_max": 42},
    {"age_min": 18, "age_max": 39, "sex": "male", "athletic_level": "athlete", "min": 6, "max": 13, "optimal_min": 7, "optimal_max": 10},
    {"age_min": 18, "age_max": 39, "sex": "female", "athletic_level": "athlete", "min": 14, "max": 20, "optimal_min": 16, "optimal_max": 18}
  ]'::JSONB,
  'Abaixo de 8% (homem) ou 21% (mulher): muito baixo, risco de deficiências. Acima de 25% (homem) ou 33% (mulher): excesso, risco cardiometabólico.'
);

-- Massa Muscular (Muscle Mass)
INSERT INTO bioimpedance_parameter_library (
  parameter_code, parameter_name, parameter_name_english, category,
  description, unit, reference_ranges, interpretation_guide
) VALUES (
  'BIA_MM',
  'Massa Muscular',
  'Muscle Mass',
  'composicao_corporal',
  'Quantidade total de massa muscular esquelética',
  'kg',
  '[
    {"age_min": 18, "age_max": 39, "sex": "male", "min": 33, "max": 39, "optimal_min": 36, "optimal_max": 44},
    {"age_min": 18, "age_max": 39, "sex": "female", "min": 24, "max": 30, "optimal_min": 27, "optimal_max": 34},
    {"age_min": 40, "age_max": 59, "sex": "male", "min": 31, "max": 37, "optimal_min": 34, "optimal_max": 41},
    {"age_min": 40, "age_max": 59, "sex": "female", "min": 22, "max": 28, "optimal_min": 25, "optimal_max": 31},
    {"age_min": 60, "age_max": null, "sex": "male", "min": 28, "max": 34, "optimal_min": 31, "optimal_max": 37},
    {"age_min": 60, "age_max": null, "sex": "female", "min": 20, "max": 26, "optimal_min": 23, "optimal_max": 28}
  ]'::JSONB,
  'Baixa massa muscular (sarcopenia): risco de fragilidade e quedas. Alta massa muscular: melhor metabolismo e saúde óssea.'
);

-- Massa Magra (Lean Body Mass)
INSERT INTO bioimpedance_parameter_library (
  parameter_code, parameter_name, parameter_name_english, category,
  description, unit, reference_ranges, interpretation_guide
) VALUES (
  'BIA_LBM',
  'Massa Magra',
  'Lean Body Mass',
  'composicao_corporal',
  'Massa corporal sem gordura (músculos, ossos, órgãos)',
  'kg',
  '[
    {"age_min": 18, "age_max": null, "sex": "male", "min": 52, "max": 68, "optimal_min": 58, "optimal_max": 75},
    {"age_min": 18, "age_max": null, "sex": "female", "min": 38, "max": 48, "optimal_min": 42, "optimal_max": 54}
  ]'::JSONB,
  'Massa magra adequada é essencial para metabolismo basal elevado e saúde geral.'
);

-- Índice de Massa Muscular Esquelética (SMI - Skeletal Muscle Index)
INSERT INTO bioimpedance_parameter_library (
  parameter_code, parameter_name, parameter_name_english, category,
  description, unit, reference_ranges, interpretation_guide
) VALUES (
  'BIA_SMI',
  'Índice de Massa Muscular Esquelética',
  'Skeletal Muscle Index',
  'composicao_corporal',
  'Massa muscular esquelética / altura²',
  'kg/m²',
  '[
    {"age_min": 18, "age_max": null, "sex": "male", "min": 8.5, "max": 10.75, "optimal_min": 9.5, "optimal_max": 12.0, "critical_min": 7.0},
    {"age_min": 18, "age_max": null, "sex": "female", "min": 6.75, "max": 8.5, "optimal_min": 7.5, "optimal_max": 9.5, "critical_min": 5.7}
  ]'::JSONB,
  'SMI < 7.0 (homem) ou < 5.7 (mulher): sarcopenia. SMI > 10 (homem) ou > 8 (mulher): excelente massa muscular.'
);

-- Massa Óssea (Bone Mass)
INSERT INTO bioimpedance_parameter_library (
  parameter_code, parameter_name, parameter_name_english, category,
  description, unit, reference_ranges, interpretation_guide
) VALUES (
  'BIA_BONE',
  'Massa Óssea',
  'Bone Mass',
  'composicao_corporal',
  'Estimativa da massa mineral óssea',
  'kg',
  '[
    {"age_min": 18, "age_max": null, "sex": "male", "min": 2.5, "max": 3.2, "optimal_min": 2.8, "optimal_max": 3.5},
    {"age_min": 18, "age_max": null, "sex": "female", "min": 1.8, "max": 2.4, "optimal_min": 2.0, "optimal_max": 2.8}
  ]'::JSONB,
  'Massa óssea baixa pode indicar risco de osteoporose. Importante para suporte estrutural.'
);

-- ═══════════════════════════════════════════════════════════════
-- CATEGORIA: ÁGUA CORPORAL
-- ═══════════════════════════════════════════════════════════════

-- Água Corporal Total (Total Body Water)
INSERT INTO bioimpedance_parameter_library (
  parameter_code, parameter_name, parameter_name_english, category,
  description, unit, reference_ranges, interpretation_guide
) VALUES (
  'BIA_TBW',
  'Água Corporal Total',
  'Total Body Water',
  'agua_corporal',
  'Percentual de água em relação ao peso total',
  '%',
  '[
    {"age_min": 18, "age_max": 39, "sex": "male", "min": 50, "max": 65, "optimal_min": 55, "optimal_max": 60},
    {"age_min": 18, "age_max": 39, "sex": "female", "min": 45, "max": 60, "optimal_min": 50, "optimal_max": 55},
    {"age_min": 40, "age_max": 59, "sex": "male", "min": 47, "max": 63, "optimal_min": 52, "optimal_max": 58},
    {"age_min": 40, "age_max": 59, "sex": "female", "min": 42, "max": 57, "optimal_min": 47, "optimal_max": 52},
    {"age_min": 60, "age_max": null, "sex": "male", "min": 45, "max": 60, "optimal_min": 50, "optimal_max": 55},
    {"age_min": 60, "age_max": null, "sex": "female", "min": 40, "max": 55, "optimal_min": 45, "optimal_max": 50}
  ]'::JSONB,
  'Abaixo de 50% (homem) ou 45% (mulher): desidratação. Acima de 65% (homem) ou 60% (mulher): possível retenção de líquidos.'
);

-- Água Intracelular (ICW - Intracellular Water)
INSERT INTO bioimpedance_parameter_library (
  parameter_code, parameter_name, parameter_name_english, category,
  description, unit, reference_ranges, interpretation_guide
) VALUES (
  'BIA_ICW',
  'Água Intracelular',
  'Intracellular Water',
  'agua_corporal',
  'Água dentro das células',
  'L',
  '[
    {"age_min": 18, "age_max": null, "sex": "male", "min": 20, "max": 30, "optimal_min": 24, "optimal_max": 28},
    {"age_min": 18, "age_max": null, "sex": "female", "min": 15, "max": 22, "optimal_min": 17, "optimal_max": 20}
  ]'::JSONB,
  'Água intracelular está relacionada à massa celular ativa (metabolismo).'
);

-- Água Extracelular (ECW - Extracellular Water)
INSERT INTO bioimpedance_parameter_library (
  parameter_code, parameter_name, parameter_name_english, category,
  description, unit, reference_ranges, interpretation_guide
) VALUES (
  'BIA_ECW',
  'Água Extracelular',
  'Extracellular Water',
  'agua_corporal',
  'Água fora das células (intersticial e plasma)',
  'L',
  '[
    {"age_min": 18, "age_max": null, "sex": "male", "min": 12, "max": 18, "optimal_min": 14, "optimal_max": 16},
    {"age_min": 18, "age_max": null, "sex": "female", "min": 9, "max": 14, "optimal_min": 10, "optimal_max": 12}
  ]'::JSONB,
  'ECW elevada pode indicar retenção de líquidos ou edema.'
);

-- Razão ECW/TBW (Edema Index)
INSERT INTO bioimpedance_parameter_library (
  parameter_code, parameter_name, parameter_name_english, category,
  description, unit, reference_ranges, interpretation_guide
) VALUES (
  'BIA_ECW_TBW',
  'Razão Água Extracelular/Total',
  'ECW/TBW Ratio',
  'agua_corporal',
  'Proporção de água extracelular em relação à água total',
  'ratio',
  '[
    {"age_min": 18, "age_max": null, "sex": "all", "min": 0.36, "max": 0.40, "optimal_min": 0.37, "optimal_max": 0.39, "critical_max": 0.42}
  ]'::JSONB,
  'Razão > 0.40: retenção de líquidos ou edema. Razão < 0.36: desidratação.'
);

-- ═══════════════════════════════════════════════════════════════
-- CATEGORIA: METABOLISMO
-- ═══════════════════════════════════════════════════════════════

-- Taxa Metabólica Basal (BMR - Basal Metabolic Rate)
INSERT INTO bioimpedance_parameter_library (
  parameter_code, parameter_name, parameter_name_english, category,
  description, unit, reference_ranges, interpretation_guide
) VALUES (
  'BIA_BMR',
  'Taxa Metabólica Basal',
  'Basal Metabolic Rate',
  'metabolismo',
  'Gasto energético em repouso absoluto',
  'kcal/dia',
  '[
    {"age_min": 18, "age_max": 29, "sex": "male", "min": 1600, "max": 1800, "optimal_min": 1700, "optimal_max": 2000},
    {"age_min": 18, "age_max": 29, "sex": "female", "min": 1200, "max": 1400, "optimal_min": 1300, "optimal_max": 1600},
    {"age_min": 30, "age_max": 59, "sex": "male", "min": 1500, "max": 1700, "optimal_min": 1600, "optimal_max": 1900},
    {"age_min": 30, "age_max": 59, "sex": "female", "min": 1100, "max": 1300, "optimal_min": 1200, "optimal_max": 1500},
    {"age_min": 60, "age_max": null, "sex": "male", "min": 1400, "max": 1600, "optimal_min": 1500, "optimal_max": 1800},
    {"age_min": 60, "age_max": null, "sex": "female", "min": 1000, "max": 1200, "optimal_min": 1100, "optimal_max": 1400}
  ]'::JSONB,
  'BMR alto indica metabolismo ativo (mais massa muscular). BMR baixo pode indicar perda de massa magra.'
);

-- Gasto Energético Total (TDEE - Total Daily Energy Expenditure)
INSERT INTO bioimpedance_parameter_library (
  parameter_code, parameter_name, parameter_name_english, category,
  description, unit, reference_ranges, interpretation_guide
) VALUES (
  'BIA_TDEE',
  'Gasto Energético Total Diário',
  'Total Daily Energy Expenditure',
  'metabolismo',
  'Gasto energético total incluindo atividades',
  'kcal/dia',
  '[
    {"age_min": 18, "age_max": null, "sex": "male", "athletic_level": "sedentary", "min": 2000, "max": 2400},
    {"age_min": 18, "age_max": null, "sex": "female", "athletic_level": "sedentary", "min": 1600, "max": 2000},
    {"age_min": 18, "age_max": null, "sex": "male", "athletic_level": "active", "min": 2400, "max": 3000},
    {"age_min": 18, "age_max": null, "sex": "female", "athletic_level": "active", "min": 2000, "max": 2400}
  ]'::JSONB,
  'TDEE usado para planejamento de dieta: déficit calórico (perder peso), superávit (ganhar peso).'
);

-- ═══════════════════════════════════════════════════════════════
-- CATEGORIA: MUSCULAR
-- ═══════════════════════════════════════════════════════════════

-- Massa Muscular dos Braços
INSERT INTO bioimpedance_parameter_library (
  parameter_code, parameter_name, parameter_name_english, category,
  description, unit, reference_ranges, interpretation_guide
) VALUES (
  'BIA_ARM_MM',
  'Massa Muscular dos Braços',
  'Arm Muscle Mass',
  'muscular',
  'Massa muscular dos membros superiores',
  'kg',
  '[
    {"age_min": 18, "age_max": null, "sex": "male", "min": 5.5, "max": 7.5, "optimal_min": 6.5, "optimal_max": 9.0},
    {"age_min": 18, "age_max": null, "sex": "female", "min": 3.5, "max": 4.5, "optimal_min": 4.0, "optimal_max": 5.5}
  ]'::JSONB,
  'Massa muscular dos braços importante para força funcional e independência.'
);

-- Massa Muscular das Pernas
INSERT INTO bioimpedance_parameter_library (
  parameter_code, parameter_name, parameter_name_english, category,
  description, unit, reference_ranges, interpretation_guide
) VALUES (
  'BIA_LEG_MM',
  'Massa Muscular das Pernas',
  'Leg Muscle Mass',
  'muscular',
  'Massa muscular dos membros inferiores',
  'kg',
  '[
    {"age_min": 18, "age_max": null, "sex": "male", "min": 16, "max": 20, "optimal_min": 18, "optimal_max": 24},
    {"age_min": 18, "age_max": null, "sex": "female", "min": 12, "max": 15, "optimal_min": 13, "optimal_max": 18}
  ]'::JSONB,
  'Massa muscular das pernas crucial para mobilidade e prevenção de quedas em idosos.'
);

-- Massa Muscular do Tronco
INSERT INTO bioimpedance_parameter_library (
  parameter_code, parameter_name, parameter_name_english, category,
  description, unit, reference_ranges, interpretation_guide
) VALUES (
  'BIA_TRUNK_MM',
  'Massa Muscular do Tronco',
  'Trunk Muscle Mass',
  'muscular',
  'Massa muscular do core e torso',
  'kg',
  '[
    {"age_min": 18, "age_max": null, "sex": "male", "min": 22, "max": 28, "optimal_min": 25, "optimal_max": 32},
    {"age_min": 18, "age_max": null, "sex": "female", "min": 16, "max": 20, "optimal_min": 18, "optimal_max": 24}
  ]'::JSONB,
  'Massa muscular do tronco importante para postura e estabilidade central.'
);

-- ═══════════════════════════════════════════════════════════════
-- CATEGORIA: OUTROS
-- ═══════════════════════════════════════════════════════════════

-- Gordura Visceral (Visceral Fat Level)
INSERT INTO bioimpedance_parameter_library (
  parameter_code, parameter_name, parameter_name_english, category,
  description, unit, reference_ranges, interpretation_guide
) VALUES (
  'BIA_VF',
  'Nível de Gordura Visceral',
  'Visceral Fat Level',
  'outros',
  'Gordura ao redor dos órgãos abdominais',
  'nível',
  '[
    {"age_min": 18, "age_max": null, "sex": "all", "min": 1, "max": 9, "optimal_min": 1, "optimal_max": 4, "critical_min": 15}
  ]'::JSONB,
  'Nível 1-9: saudável. Nível 10-14: elevado, risco aumentado. Nível ≥15: muito alto, risco de diabetes e doenças cardiovasculares.'
);

-- Idade Metabólica (Metabolic Age)
INSERT INTO bioimpedance_parameter_library (
  parameter_code, parameter_name, parameter_name_english, category,
  description, unit, reference_ranges, interpretation_guide
) VALUES (
  'BIA_META_AGE',
  'Idade Metabólica',
  'Metabolic Age',
  'outros',
  'Idade baseada no metabolismo e composição corporal',
  'anos',
  '[
    {"age_min": 18, "age_max": null, "sex": "all", "min": null, "max": null, "optimal_min": null, "optimal_max": null}
  ]'::JSONB,
  'Idealmente, idade metabólica deve ser igual ou menor que a idade cronológica. Diferença > 5 anos indica composição corporal desfavorável.'
);

-- Ângulo de Fase (Phase Angle)
INSERT INTO bioimpedance_parameter_library (
  parameter_code, parameter_name, parameter_name_english, category,
  description, unit, reference_ranges, interpretation_guide
) VALUES (
  'BIA_PA',
  'Ângulo de Fase',
  'Phase Angle',
  'outros',
  'Indicador de integridade celular e saúde geral',
  'graus',
  '[
    {"age_min": 18, "age_max": 49, "sex": "male", "min": 6.0, "max": 7.0, "optimal_min": 6.5, "optimal_max": 8.5},
    {"age_min": 18, "age_max": 49, "sex": "female", "min": 5.5, "max": 6.5, "optimal_min": 6.0, "optimal_max": 7.5},
    {"age_min": 50, "age_max": null, "sex": "male", "min": 5.5, "max": 6.5, "optimal_min": 6.0, "optimal_max": 7.5},
    {"age_min": 50, "age_max": null, "sex": "female", "min": 5.0, "max": 6.0, "optimal_min": 5.5, "optimal_max": 7.0}
  ]'::JSONB,
  'Ângulo de fase alto indica células saudáveis e massa celular ativa. Baixo pode indicar desnutrição ou doença crônica.'
);

-- Proteína Corporal (Body Protein)
INSERT INTO bioimpedance_parameter_library (
  parameter_code, parameter_name, parameter_name_english, category,
  description, unit, reference_ranges, interpretation_guide
) VALUES (
  'BIA_PROTEIN',
  'Proteína Corporal',
  'Body Protein',
  'outros',
  'Estimativa de proteína total no corpo',
  'kg',
  '[
    {"age_min": 18, "age_max": null, "sex": "male", "min": 10, "max": 13, "optimal_min": 11, "optimal_max": 15},
    {"age_min": 18, "age_max": null, "sex": "female", "min": 7, "max": 9, "optimal_min": 8, "optimal_max": 11}
  ]'::JSONB,
  'Proteína corporal essencial para manutenção muscular e funções metabólicas.'
);

-- Atualizar timestamps
UPDATE bioimpedance_parameter_library SET updated_at = NOW();
