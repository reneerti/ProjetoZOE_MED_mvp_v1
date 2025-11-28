-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DE CONDIÇÕES CLÍNICAS E REGRAS DE DIAGNÓSTICO
-- ═══════════════════════════════════════════════════════════════════════════════
-- Popula o banco com condições clínicas comuns e regras para detecção automática
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. ANEMIA FERROPRIVA
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO clinical_conditions (
  condition_code,
  condition_name,
  condition_name_alternative,
  category,
  severity_level,
  description,
  symptoms,
  risk_factors,
  prevalence_percentage,
  common_treatments,
  specialists_recommended,
  is_chronic,
  requires_immediate_attention
) VALUES (
  'D50',
  'Anemia Ferropriva',
  ARRAY['Anemia por Deficiência de Ferro', 'Anemia Microcítica'],
  'hematológica',
  'medium',
  'Anemia causada por deficiência de ferro, caracterizada por baixos níveis de hemoglobina e hemácias pequenas (microcitose)',
  ARRAY['Cansaço', 'Fraqueza', 'Palidez', 'Falta de ar', 'Tonturas', 'Unhas quebradiças', 'Queda de cabelo'],
  ARRAY['Menstruação abundante', 'Gravidez', 'Dieta pobre em ferro', 'Sangramento gastrointestinal', 'Má absorção'],
  10.0,
  ARRAY['Suplementação de ferro oral', 'Sulfato ferroso 300mg/dia', 'Investigar e tratar causa do sangramento'],
  ARRAY['Hematologia', 'Clínica Médica'],
  false,
  false
);

-- Regra de diagnóstico para Anemia Ferropriva
INSERT INTO diagnostic_rules (
  condition_id,
  rule_name,
  rule_description,
  criteria,
  confidence_threshold,
  priority,
  is_active
) SELECT
  id,
  'Anemia Ferropriva - Critério Clássico',
  'Hemoglobina baixa + VCM baixo + HCM baixo indicam anemia microcítica hipocrômica típica de deficiência de ferro',
  '{
    "required_parameters": [
      {
        "parameter_code": "HEM_HB",
        "operator": "<",
        "value_male": 13.5,
        "value_female": 12.0,
        "weight": 3
      },
      {
        "parameter_code": "HEM_VCM",
        "operator": "<",
        "value": 80.0,
        "weight": 2
      },
      {
        "parameter_code": "HEM_HCM",
        "operator": "<",
        "value": 27.0,
        "weight": 2
      },
      {
        "parameter_code": "HEM_RBC",
        "operator": "<",
        "value_male": 4.5,
        "value_female": 4.0,
        "weight": 1
      }
    ],
    "minimum_matches": 3,
    "minimum_weight": 5
  }'::JSONB,
  75.0,
  1,
  true
FROM clinical_conditions WHERE condition_code = 'D50';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. DISLIPIDEMIA / HIPERCOLESTEROLEMIA
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO clinical_conditions (
  condition_code,
  condition_name,
  condition_name_alternative,
  category,
  severity_level,
  description,
  symptoms,
  risk_factors,
  prevalence_percentage,
  common_treatments,
  specialists_recommended,
  is_chronic,
  requires_immediate_attention
) VALUES (
  'E78.0',
  'Hipercolesterolemia',
  ARRAY['Colesterol Alto', 'Dislipidemia'],
  'metabólica',
  'medium',
  'Elevação dos níveis de colesterol no sangue, principal fator de risco cardiovascular',
  ARRAY['Geralmente assintomática', 'Xantomas (depósitos de gordura na pele)', 'Arco corneano'],
  ARRAY['Dieta rica em gorduras saturadas', 'Sedentarismo', 'Obesidade', 'Genética', 'Diabetes'],
  25.0,
  ARRAY['Estatinas', 'Dieta hipocolesterolêmica', 'Exercícios físicos', 'Redução de peso'],
  ARRAY['Cardiologia', 'Endocrinologia', 'Nutrologia'],
  true,
  false
);

INSERT INTO diagnostic_rules (
  condition_id,
  rule_name,
  rule_description,
  criteria,
  confidence_threshold,
  priority,
  is_active
) SELECT
  id,
  'Hipercolesterolemia - Critério LDL Elevado',
  'LDL elevado é o principal marcador de risco cardiovascular',
  '{
    "required_parameters": [
      {
        "parameter_code": "LIP_LDL",
        "operator": ">=",
        "value": 130,
        "weight": 4
      },
      {
        "parameter_code": "LIP_CT",
        "operator": ">=",
        "value": 200,
        "weight": 2
      }
    ],
    "minimum_matches": 1,
    "minimum_weight": 4
  }'::JSONB,
  80.0,
  1,
  true
FROM clinical_conditions WHERE condition_code = 'E78.0';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. HIPERTRIGLICERIDEMIA
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO clinical_conditions (
  condition_code,
  condition_name,
  condition_name_alternative,
  category,
  severity_level,
  description,
  symptoms,
  risk_factors,
  prevalence_percentage,
  common_treatments,
  specialists_recommended,
  is_chronic,
  requires_immediate_attention
) VALUES (
  'E78.1',
  'Hipertrigliceridemia',
  ARRAY['Triglicerídeos Alto'],
  'metabólica',
  'medium',
  'Elevação dos triglicerídeos no sangue, associada a risco de pancreatite e doença cardiovascular',
  ARRAY['Geralmente assintomática', 'Xantomas eruptivos', 'Hepatomegalia'],
  ARRAY['Obesidade', 'Diabetes não controlado', 'Consumo de álcool', 'Dieta rica em carboidratos'],
  15.0,
  ARRAY['Fibratos', 'Ômega-3', 'Dieta hipocalórica', 'Redução de álcool', 'Controle glicêmico'],
  ARRAY['Endocrinologia', 'Cardiologia'],
  true,
  false
);

INSERT INTO diagnostic_rules (
  condition_id,
  rule_name,
  rule_description,
  criteria,
  confidence_threshold,
  priority,
  is_active
) SELECT
  id,
  'Hipertrigliceridemia - Critério Elevado',
  'Triglicerídeos ≥150 mg/dL',
  '{
    "required_parameters": [
      {
        "parameter_code": "LIP_TG",
        "operator": ">=",
        "value": 150,
        "weight": 5
      }
    ],
    "minimum_matches": 1,
    "minimum_weight": 5
  }'::JSONB,
  90.0,
  1,
  true
FROM clinical_conditions WHERE condition_code = 'E78.1';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. SÍNDROME METABÓLICA
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO clinical_conditions (
  condition_code,
  condition_name,
  condition_name_alternative,
  category,
  severity_level,
  description,
  symptoms,
  risk_factors,
  prevalence_percentage,
  common_treatments,
  specialists_recommended,
  is_chronic,
  requires_immediate_attention
) VALUES (
  'E88.81',
  'Síndrome Metabólica',
  ARRAY['Síndrome X', 'Síndrome de Resistência à Insulina'],
  'metabólica',
  'high',
  'Conjunto de fatores de risco cardiovascular: obesidade abdominal, resistência à insulina, dislipidemia e hipertensão',
  ARRAY['Obesidade abdominal', 'Cansaço', 'Sede excessiva', 'Manchas escuras na pele (acantose)'],
  ARRAY['Obesidade', 'Sedentarismo', 'História familiar', 'Idade >45 anos'],
  30.0,
  ARRAY['Perda de peso', 'Exercícios', 'Dieta mediterrânea', 'Metformina', 'Tratamento da hipertensão e dislipidemia'],
  ARRAY['Endocrinologia', 'Cardiologia', 'Nutrologia'],
  true,
  false
);

INSERT INTO diagnostic_rules (
  condition_id,
  rule_name,
  rule_description,
  criteria,
  confidence_threshold,
  priority,
  is_active
) SELECT
  id,
  'Síndrome Metabólica - Critério ATP III',
  '3 ou mais critérios: TG alto, HDL baixo, glicemia alterada, (obesidade e PA verificados clinicamente)',
  '{
    "required_parameters": [
      {
        "parameter_code": "LIP_TG",
        "operator": ">=",
        "value": 150,
        "weight": 2
      },
      {
        "parameter_code": "LIP_HDL",
        "operator": "<",
        "value_male": 40,
        "value_female": 50,
        "weight": 2
      },
      {
        "parameter_code": "GLI_JEJUM",
        "operator": ">=",
        "value": 100,
        "weight": 2
      },
      {
        "parameter_code": "GLI_HBA1C",
        "operator": ">=",
        "value": 5.7,
        "weight": 1
      }
    ],
    "minimum_matches": 2,
    "minimum_weight": 4,
    "note": "Obesidade abdominal e hipertensão devem ser verificados clinicamente"
  }'::JSONB,
  70.0,
  2,
  true
FROM clinical_conditions WHERE condition_code = 'E88.81';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. PRÉ-DIABETES
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO clinical_conditions (
  condition_code,
  condition_name,
  condition_name_alternative,
  category,
  severity_level,
  description,
  symptoms,
  risk_factors,
  prevalence_percentage,
  common_treatments,
  specialists_recommended,
  is_chronic,
  requires_immediate_attention
) VALUES (
  'R73.03',
  'Pré-Diabetes',
  ARRAY['Glicemia de Jejum Alterada', 'Intolerância à Glicose'],
  'metabólica',
  'medium',
  'Estágio intermediário entre glicemia normal e diabetes, com alto risco de progressão',
  ARRAY['Geralmente assintomática'],
  ARRAY['Obesidade', 'Sedentarismo', 'História familiar de diabetes', 'Síndrome metabólica'],
  20.0,
  ARRAY['Mudanças no estilo de vida', 'Perda de peso de 5-10%', 'Exercícios 150min/semana', 'Metformina (casos selecionados)'],
  ARRAY['Endocrinologia', 'Nutrologia'],
  false,
  false
);

INSERT INTO diagnostic_rules (
  condition_id,
  rule_name,
  rule_description,
  criteria,
  confidence_threshold,
  priority,
  is_active
) SELECT
  id,
  'Pré-Diabetes - Glicemia ou HbA1c Alteradas',
  'Glicemia 100-125 mg/dL ou HbA1c 5.7-6.4%',
  '{
    "required_parameters": [
      {
        "parameter_code": "GLI_JEJUM",
        "operator": "BETWEEN",
        "value_min": 100,
        "value_max": 125,
        "weight": 3
      },
      {
        "parameter_code": "GLI_HBA1C",
        "operator": "BETWEEN",
        "value_min": 5.7,
        "value_max": 6.4,
        "weight": 3
      }
    ],
    "minimum_matches": 1,
    "minimum_weight": 3
  }'::JSONB,
  85.0,
  1,
  true
FROM clinical_conditions WHERE condition_code = 'R73.03';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. DIABETES MELLITUS
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO clinical_conditions (
  condition_code,
  condition_name,
  condition_name_alternative,
  category,
  severity_level,
  description,
  symptoms,
  risk_factors,
  prevalence_percentage,
  common_treatments,
  specialists_recommended,
  is_chronic,
  requires_immediate_attention
) VALUES (
  'E11',
  'Diabetes Mellitus Tipo 2',
  ARRAY['Diabetes', 'DM2'],
  'metabólica',
  'high',
  'Doença crônica caracterizada por hiperglicemia devido à resistência à insulina e/ou deficiência de sua secreção',
  ARRAY['Poliúria', 'Polidipsia', 'Polifagia', 'Perda de peso', 'Visão turva', 'Cicatrização lenta'],
  ARRAY['Obesidade', 'Sedentarismo', 'História familiar', 'Idade >45 anos', 'Síndrome metabólica'],
  9.0,
  ARRAY['Metformina', 'Sulfoniluréias', 'Inibidores DPP-4', 'Análogos GLP-1', 'Insulina', 'Dieta e exercícios'],
  ARRAY['Endocrinologia'],
  true,
  true
);

INSERT INTO diagnostic_rules (
  condition_id,
  rule_name,
  rule_description,
  criteria,
  confidence_threshold,
  priority,
  is_active
) SELECT
  id,
  'Diabetes - Critério Glicêmico',
  'Glicemia ≥126 mg/dL ou HbA1c ≥6.5%',
  '{
    "required_parameters": [
      {
        "parameter_code": "GLI_JEJUM",
        "operator": ">=",
        "value": 126,
        "weight": 5
      },
      {
        "parameter_code": "GLI_HBA1C",
        "operator": ">=",
        "value": 6.5,
        "weight": 5
      }
    ],
    "minimum_matches": 1,
    "minimum_weight": 5,
    "note": "Confirmar em segunda ocasião se assintomático"
  }'::JSONB,
  90.0,
  1,
  true
FROM clinical_conditions WHERE condition_code = 'E11';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. ESTEATOSE HEPÁTICA
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO clinical_conditions (
  condition_code,
  condition_name,
  condition_name_alternative,
  category,
  severity_level,
  description,
  symptoms,
  risk_factors,
  prevalence_percentage,
  common_treatments,
  specialists_recommended,
  is_chronic,
  requires_immediate_attention
) VALUES (
  'K76.0',
  'Esteatose Hepática (Fígado Gorduroso)',
  ARRAY['DHGNA', 'Fígado Gorduroso', 'NAFLD'],
  'metabólica',
  'medium',
  'Acúmulo de gordura no fígado não relacionado ao consumo de álcool',
  ARRAY['Geralmente assintomática', 'Desconforto abdominal superior direito', 'Fadiga'],
  ARRAY['Obesidade', 'Diabetes', 'Dislipidemia', 'Síndrome metabólica'],
  30.0,
  ARRAY['Perda de peso', 'Exercícios', 'Controle de diabetes e dislipidemia', 'Evitar álcool'],
  ARRAY['Hepatologia', 'Gastroenterologia', 'Endocrinologia'],
  true,
  false
);

INSERT INTO diagnostic_rules (
  condition_id,
  rule_name,
  rule_description,
  criteria,
  confidence_threshold,
  priority,
  is_active
) SELECT
  id,
  'Esteatose - Enzimas Hepáticas Elevadas',
  'TGO/TGP elevadas com padrão sugestivo (TGO/TGP <1 em geral)',
  '{
    "required_parameters": [
      {
        "parameter_code": "HEP_TGP",
        "operator": ">",
        "value": 41,
        "weight": 3
      },
      {
        "parameter_code": "HEP_TGO",
        "operator": ">",
        "value": 40,
        "weight": 2
      },
      {
        "parameter_code": "HEP_GGT",
        "operator": ">",
        "value_male": 55,
        "value_female": 38,
        "weight": 1
      }
    ],
    "minimum_matches": 2,
    "minimum_weight": 4,
    "note": "Diagnóstico confirmado por ultrassom ou elastografia"
  }'::JSONB,
  60.0,
  3,
  true
FROM clinical_conditions WHERE condition_code = 'K76.0';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. HIPOTIREOIDISMO
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO clinical_conditions (
  condition_code,
  condition_name,
  condition_name_alternative,
  category,
  severity_level,
  description,
  symptoms,
  risk_factors,
  prevalence_percentage,
  common_treatments,
  specialists_recommended,
  is_chronic,
  requires_immediate_attention
) VALUES (
  'E03.9',
  'Hipotireoidismo',
  ARRAY['Tireoide Lenta'],
  'endócrina',
  'medium',
  'Diminuição da produção de hormônios tireoidianos',
  ARRAY['Cansaço', 'Ganho de peso', 'Intolerância ao frio', 'Pele seca', 'Constipação', 'Queda de cabelo'],
  ARRAY['Tireoidite de Hashimoto', 'Pós-cirurgia de tireoide', 'Tratamento com radioiodo', 'Sexo feminino'],
  5.0,
  ARRAY['Levotiroxina (T4)', 'Dose ajustada pelo TSH'],
  ARRAY['Endocrinologia'],
  true,
  false
);

INSERT INTO diagnostic_rules (
  condition_id,
  rule_name,
  rule_description,
  criteria,
  confidence_threshold,
  priority,
  is_active
) SELECT
  id,
  'Hipotireoidismo - TSH Elevado',
  'TSH >4.0 com ou sem T4 livre baixo',
  '{
    "required_parameters": [
      {
        "parameter_code": "TIR_TSH",
        "operator": ">",
        "value": 4.0,
        "weight": 5
      },
      {
        "parameter_code": "TIR_T4L",
        "operator": "<",
        "value": 0.8,
        "weight": 3
      }
    ],
    "minimum_matches": 1,
    "minimum_weight": 5
  }'::JSONB,
  85.0,
  1,
  true
FROM clinical_conditions WHERE condition_code = 'E03.9';

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIM DO SEED
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON SCHEMA public IS 'Condições clínicas populadas com regras de diagnóstico automático';
