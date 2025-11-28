-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DA BIBLIOTECA DE EXAMES - ZOE MED
-- ═══════════════════════════════════════════════════════════════════════════════
-- Popula o banco com exames comuns do sistema de saúde brasileiro
-- Baseado em padrões SBPC/ML e CBHPM
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. HEMOGRAMA COMPLETO
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO exam_library (exam_code, exam_name, exam_name_alternative, category_id, subcategory, description, clinical_indication, preparation_instructions, collection_method, analysis_method, fasting_required, fasting_hours, turnaround_time_hours, is_urgent_available, avg_cost_private, avg_cost_sus)
SELECT
  'HEM001',
  'Hemograma Completo',
  ARRAY['Eritrograma', 'Leucograma', 'Plaquetograma', 'CBC'],
  id,
  'Hematologia',
  'Exame que avalia os componentes do sangue: glóbulos vermelhos, glóbulos brancos e plaquetas',
  'Avaliação de anemias, infecções, leucemias, distúrbios de coagulação',
  'Não é necessário jejum. Evitar exercícios físicos intensos antes da coleta',
  'Sangue',
  'Contador automatizado + microscopia',
  false,
  NULL,
  4,
  true,
  35.00,
  12.00
FROM exam_categories WHERE name = 'Hemograma';

-- Parâmetros do Hemograma
INSERT INTO exam_library_parameters (exam_library_id, parameter_code, parameter_name, parameter_name_alternative, unit, unit_alternatives, reference_ranges, description, clinical_significance, display_order)
SELECT
  el.id,
  'HEM_RBC',
  'Hemácias',
  ARRAY['Eritrócitos', 'Glóbulos Vermelhos', 'RBC'],
  'milhões/mm³',
  ARRAY['×10⁶/μL', '×10¹²/L'],
  '[
    {"age_min": 0, "age_max": 14, "sex": "all", "min": 4.0, "max": 5.5, "critical_min": 2.5, "critical_max": 7.0},
    {"age_min": 15, "age_max": null, "sex": "male", "min": 4.5, "max": 6.0, "critical_min": 3.0, "critical_max": 7.5},
    {"age_min": 15, "age_max": null, "sex": "female", "min": 4.0, "max": 5.5, "critical_min": 2.5, "critical_max": 7.0}
  ]'::JSONB,
  'Número total de glóbulos vermelhos no sangue',
  'Valores baixos indicam anemia. Valores altos podem indicar policitemia',
  1
FROM exam_library el WHERE el.exam_code = 'HEM001';

INSERT INTO exam_library_parameters (exam_library_id, parameter_code, parameter_name, parameter_name_alternative, unit, unit_alternatives, reference_ranges, description, clinical_significance, display_order)
SELECT
  el.id,
  'HEM_HB',
  'Hemoglobina',
  ARRAY['Hb', 'HGB'],
  'g/dL',
  ARRAY['g/L'],
  '[
    {"age_min": 0, "age_max": 14, "sex": "all", "min": 11.0, "max": 15.5, "critical_min": 7.0, "critical_max": 18.0},
    {"age_min": 15, "age_max": null, "sex": "male", "min": 13.5, "max": 17.5, "critical_min": 9.0, "critical_max": 20.0},
    {"age_min": 15, "age_max": null, "sex": "female", "min": 12.0, "max": 16.0, "critical_min": 8.0, "critical_max": 18.0}
  ]'::JSONB,
  'Proteína responsável pelo transporte de oxigênio',
  'Principal indicador de anemia. Valores críticos podem necessitar transfusão',
  2
FROM exam_library el WHERE el.exam_code = 'HEM001';

INSERT INTO exam_library_parameters (exam_library_id, parameter_code, parameter_name, parameter_name_alternative, unit, unit_alternatives, reference_ranges, description, clinical_significance, display_order)
SELECT
  el.id,
  'HEM_HCT',
  'Hematócrito',
  ARRAY['Ht', 'HCT'],
  '%',
  ARRAY['L/L'],
  '[
    {"age_min": 15, "age_max": null, "sex": "male", "min": 40.0, "max": 52.0, "critical_min": 25.0, "critical_max": 60.0},
    {"age_min": 15, "age_max": null, "sex": "female", "min": 36.0, "max": 48.0, "critical_min": 22.0, "critical_max": 55.0}
  ]'::JSONB,
  'Percentual do volume sanguíneo ocupado por hemácias',
  'Reflete a proporção de células vermelhas no sangue',
  3
FROM exam_library el WHERE el.exam_code = 'HEM001';

INSERT INTO exam_library_parameters (exam_library_id, parameter_code, parameter_name, parameter_name_alternative, unit, unit_alternatives, reference_ranges, description, clinical_significance, display_order)
SELECT
  el.id,
  'HEM_VCM',
  'VCM',
  ARRAY['Volume Corpuscular Médio', 'MCV'],
  'fL',
  ARRAY['μm³'],
  '[
    {"age_min": 0, "age_max": null, "sex": "all", "min": 80.0, "max": 100.0, "critical_min": 60.0, "critical_max": 120.0}
  ]'::JSONB,
  'Tamanho médio das hemácias',
  'Ajuda a classificar anemias: microcítica (<80), normocítica (80-100), macrocítica (>100)',
  4
FROM exam_library el WHERE el.exam_code = 'HEM001';

INSERT INTO exam_library_parameters (exam_library_id, parameter_code, parameter_name, parameter_name_alternative, unit, unit_alternatives, reference_ranges, description, clinical_significance, display_order)
SELECT
  el.id,
  'HEM_HCM',
  'HCM',
  ARRAY['Hemoglobina Corpuscular Média', 'MCH'],
  'pg',
  ARRAY['pg/célula'],
  '[
    {"age_min": 0, "age_max": null, "sex": "all", "min": 27.0, "max": 33.0, "critical_min": 20.0, "critical_max": 40.0}
  ]'::JSONB,
  'Quantidade média de hemoglobina por hemácia',
  'Valores baixos indicam hipocromia (anemia ferropriva)',
  5
FROM exam_library el WHERE el.exam_code = 'HEM001';

INSERT INTO exam_library_parameters (exam_library_id, parameter_code, parameter_name, parameter_name_alternative, unit, unit_alternatives, reference_ranges, description, clinical_significance, display_order)
SELECT
  el.id,
  'HEM_CHCM',
  'CHCM',
  ARRAY['Concentração de Hemoglobina Corpuscular Média', 'MCHC'],
  'g/dL',
  ARRAY['%'],
  '[
    {"age_min": 0, "age_max": null, "sex": "all", "min": 32.0, "max": 36.0, "critical_min": 28.0, "critical_max": 38.0}
  ]'::JSONB,
  'Concentração de hemoglobina dentro das hemácias',
  'Auxilia no diagnóstico de anemias hipocrômicas e hipercrômicas',
  6
FROM exam_library el WHERE el.exam_code = 'HEM001';

INSERT INTO exam_library_parameters (exam_library_id, parameter_code, parameter_name, parameter_name_alternative, unit, unit_alternatives, reference_ranges, description, clinical_significance, display_order)
SELECT
  el.id,
  'HEM_WBC',
  'Leucócitos',
  ARRAY['Glóbulos Brancos', 'WBC'],
  '/mm³',
  ARRAY['×10³/μL', '×10⁹/L'],
  '[
    {"age_min": 0, "age_max": null, "sex": "all", "min": 4000, "max": 11000, "critical_min": 1000, "critical_max": 30000}
  ]'::JSONB,
  'Células de defesa do organismo',
  'Aumento indica infecção, inflamação ou leucemia. Diminuição indica imunossupressão',
  7
FROM exam_library el WHERE el.exam_code = 'HEM001';

INSERT INTO exam_library_parameters (exam_library_id, parameter_code, parameter_name, parameter_name_alternative, unit, unit_alternatives, reference_ranges, description, clinical_significance, display_order)
SELECT
  el.id,
  'HEM_PLT',
  'Plaquetas',
  ARRAY['Trombócitos', 'PLT'],
  '/mm³',
  ARRAY['×10³/μL', '×10⁹/L'],
  '[
    {"age_min": 0, "age_max": null, "sex": "all", "min": 150000, "max": 450000, "critical_min": 50000, "critical_max": 1000000}
  ]'::JSONB,
  'Células responsáveis pela coagulação',
  'Valores baixos aumentam risco de sangramento. Valores altos aumentam risco de trombose',
  8
FROM exam_library el WHERE el.exam_code = 'HEM001';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. PERFIL LIPÍDICO (LIPIDOGRAMA)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO exam_library (exam_code, exam_name, exam_name_alternative, category_id, subcategory, description, clinical_indication, preparation_instructions, collection_method, analysis_method, fasting_required, fasting_hours, turnaround_time_hours, is_urgent_available, avg_cost_private, avg_cost_sus)
SELECT
  'LIP001',
  'Perfil Lipídico Completo',
  ARRAY['Lipidograma', 'Colesterol Total e Frações'],
  id,
  'Bioquímica',
  'Avaliação dos níveis de colesterol e triglicerídeos no sangue',
  'Avaliação de risco cardiovascular, dislipidemia, síndrome metabólica',
  'Jejum de 12 horas obrigatório. Manter dieta habitual nos 3 dias anteriores',
  'Sangue',
  'Espectrofotometria enzimática',
  true,
  12,
  6,
  false,
  45.00,
  15.00
FROM exam_categories WHERE name = 'Perfil Lipídico';

-- Parâmetros do Perfil Lipídico
INSERT INTO exam_library_parameters (exam_library_id, parameter_code, parameter_name, parameter_name_alternative, unit, unit_alternatives, reference_ranges, description, clinical_significance, display_order)
SELECT
  el.id,
  'LIP_CT',
  'Colesterol Total',
  ARRAY['CT', 'Total Cholesterol'],
  'mg/dL',
  ARRAY['mmol/L'],
  '[
    {"age_min": 0, "age_max": null, "sex": "all", "min": 0, "max": 200, "critical_min": null, "critical_max": 300}
  ]'::JSONB,
  'Soma de todas as frações de colesterol',
  'Desejável: <200 mg/dL. Limítrofe: 200-239. Alto: ≥240',
  1
FROM exam_library el WHERE el.exam_code = 'LIP001';

INSERT INTO exam_library_parameters (exam_library_id, parameter_code, parameter_name, parameter_name_alternative, unit, unit_alternatives, reference_ranges, description, clinical_significance, display_order)
SELECT
  el.id,
  'LIP_HDL',
  'HDL Colesterol',
  ARRAY['Colesterol Bom', 'HDL-C'],
  'mg/dL',
  ARRAY['mmol/L'],
  '[
    {"age_min": 0, "age_max": null, "sex": "male", "min": 40, "max": 1000, "critical_min": 20, "critical_max": null},
    {"age_min": 0, "age_max": null, "sex": "female", "min": 50, "max": 1000, "critical_min": 25, "critical_max": null}
  ]'::JSONB,
  'Lipoproteína de alta densidade (protetor cardiovascular)',
  'Quanto maior, melhor. Valores baixos aumentam risco cardiovascular',
  2
FROM exam_library el WHERE el.exam_code = 'LIP001';

INSERT INTO exam_library_parameters (exam_library_id, parameter_code, parameter_name, parameter_name_alternative, unit, unit_alternatives, reference_ranges, description, clinical_significance, display_order)
SELECT
  el.id,
  'LIP_LDL',
  'LDL Colesterol',
  ARRAY['Colesterol Ruim', 'LDL-C'],
  'mg/dL',
  ARRAY['mmol/L'],
  '[
    {"age_min": 0, "age_max": null, "sex": "all", "min": 0, "max": 100, "critical_min": null, "critical_max": 250}
  ]'::JSONB,
  'Lipoproteína de baixa densidade (aterogênico)',
  'Ótimo: <100. Desejável: <130. Limítrofe: 130-159. Alto: 160-189. Muito alto: ≥190',
  3
FROM exam_library el WHERE el.exam_code = 'LIP001';

INSERT INTO exam_library_parameters (exam_library_id, parameter_code, parameter_name, parameter_name_alternative, unit, unit_alternatives, reference_ranges, description, clinical_significance, display_order)
SELECT
  el.id,
  'LIP_VLDL',
  'VLDL Colesterol',
  ARRAY['VLDL-C'],
  'mg/dL',
  ARRAY['mmol/L'],
  '[
    {"age_min": 0, "age_max": null, "sex": "all", "min": 0, "max": 30, "critical_min": null, "critical_max": 60}
  ]'::JSONB,
  'Lipoproteína de muito baixa densidade',
  'Transporta principalmente triglicerídeos. Geralmente calculado: TG/5',
  4
FROM exam_library el WHERE el.exam_code = 'LIP001';

INSERT INTO exam_library_parameters (exam_library_id, parameter_code, parameter_name, parameter_name_alternative, unit, unit_alternatives, reference_ranges, description, clinical_significance, display_order)
SELECT
  el.id,
  'LIP_TG',
  'Triglicerídeos',
  ARRAY['TG', 'Triglycerides'],
  'mg/dL',
  ARRAY['mmol/L'],
  '[
    {"age_min": 0, "age_max": null, "sex": "all", "min": 0, "max": 150, "critical_min": null, "critical_max": 500}
  ]'::JSONB,
  'Principal forma de armazenamento de gordura',
  'Desejável: <150. Limítrofe: 150-199. Alto: 200-499. Muito alto: ≥500',
  5
FROM exam_library el WHERE el.exam_code = 'LIP001';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. GLICEMIA E DIABETES
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO exam_library (exam_code, exam_name, exam_name_alternative, category_id, subcategory, description, clinical_indication, preparation_instructions, collection_method, analysis_method, fasting_required, fasting_hours, turnaround_time_hours, is_urgent_available, avg_cost_private, avg_cost_sus)
SELECT
  'GLI001',
  'Glicemia de Jejum',
  ARRAY['Glicose em Jejum', 'FPG'],
  id,
  'Bioquímica',
  'Dosagem de glicose no sangue após jejum',
  'Diagnóstico e monitoramento de diabetes mellitus',
  'Jejum de 8-12 horas. Pode beber água',
  'Sangue',
  'Método enzimático (glicose oxidase)',
  true,
  12,
  2,
  true,
  15.00,
  5.00
FROM exam_categories WHERE name = 'Glicemia';

INSERT INTO exam_library_parameters (exam_library_id, parameter_code, parameter_name, parameter_name_alternative, unit, unit_alternatives, reference_ranges, description, clinical_significance, display_order)
SELECT
  el.id,
  'GLI_JEJUM',
  'Glicose',
  ARRAY['Glicemia', 'Glucose'],
  'mg/dL',
  ARRAY['mmol/L'],
  '[
    {"age_min": 0, "age_max": null, "sex": "all", "min": 70, "max": 99, "critical_min": 40, "critical_max": 400}
  ]'::JSONB,
  'Concentração de açúcar no sangue',
  'Normal: 70-99. Pré-diabetes: 100-125. Diabetes: ≥126 (em 2 ocasiões)',
  1
FROM exam_library el WHERE el.exam_code = 'GLI001';

-- Hemoglobina Glicada
INSERT INTO exam_library (exam_code, exam_name, exam_name_alternative, category_id, subcategory, description, clinical_indication, preparation_instructions, collection_method, analysis_method, fasting_required, fasting_hours, turnaround_time_hours, is_urgent_available, avg_cost_private, avg_cost_sus)
SELECT
  'GLI002',
  'Hemoglobina Glicada',
  ARRAY['HbA1c', 'A1C', 'Glicohemoglobina'],
  id,
  'Bioquímica',
  'Média da glicemia dos últimos 3 meses',
  'Monitoramento do controle glicêmico em diabéticos',
  'Não requer jejum',
  'Sangue',
  'HPLC ou imunoensaio',
  false,
  NULL,
  6,
  false,
  55.00,
  20.00
FROM exam_categories WHERE name = 'Glicemia';

INSERT INTO exam_library_parameters (exam_library_id, parameter_code, parameter_name, parameter_name_alternative, unit, unit_alternatives, reference_ranges, description, clinical_significance, display_order)
SELECT
  el.id,
  'GLI_HBA1C',
  'HbA1c',
  ARRAY['Hemoglobina Glicada', 'A1C'],
  '%',
  ARRAY['mmol/mol'],
  '[
    {"age_min": 0, "age_max": null, "sex": "all", "min": 4.0, "max": 5.6, "critical_min": null, "critical_max": 14.0}
  ]'::JSONB,
  'Percentual de hemoglobina ligada à glicose',
  'Normal: <5.7%. Pré-diabetes: 5.7-6.4%. Diabetes: ≥6.5%. Meta diabéticos: <7%',
  1
FROM exam_library el WHERE el.exam_code = 'GLI002';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. FUNÇÃO RENAL
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO exam_library (exam_code, exam_name, exam_name_alternative, category_id, subcategory, description, clinical_indication, preparation_instructions, collection_method, analysis_method, fasting_required, fasting_hours, turnaround_time_hours, is_urgent_available, avg_cost_private, avg_cost_sus)
SELECT
  'REN001',
  'Ureia e Creatinina',
  ARRAY['Função Renal'],
  id,
  'Bioquímica',
  'Avaliação da função dos rins',
  'Diagnóstico e monitoramento de doença renal',
  'Jejum de 4 horas recomendado',
  'Sangue',
  'Método enzimático',
  false,
  4,
  4,
  true,
  25.00,
  10.00
FROM exam_categories WHERE name = 'Função Renal';

INSERT INTO exam_library_parameters (exam_library_id, parameter_code, parameter_name, parameter_name_alternative, unit, unit_alternatives, reference_ranges, description, clinical_significance, display_order)
SELECT
  el.id,
  'REN_UREIA',
  'Ureia',
  ARRAY['BUN', 'Urea'],
  'mg/dL',
  ARRAY['mmol/L'],
  '[
    {"age_min": 0, "age_max": null, "sex": "all", "min": 10, "max": 50, "critical_min": 5, "critical_max": 200}
  ]'::JSONB,
  'Produto final do metabolismo proteico',
  'Aumenta em insuficiência renal, desidratação, dieta hiperproteica',
  1
FROM exam_library el WHERE el.exam_code = 'REN001';

INSERT INTO exam_library_parameters (exam_library_id, parameter_code, parameter_name, parameter_name_alternative, unit, unit_alternatives, reference_ranges, description, clinical_significance, display_order)
SELECT
  el.id,
  'REN_CREAT',
  'Creatinina',
  ARRAY['Creat', 'Creatinine'],
  'mg/dL',
  ARRAY['μmol/L'],
  '[
    {"age_min": 0, "age_max": null, "sex": "male", "min": 0.7, "max": 1.3, "critical_min": 0.3, "critical_max": 15.0},
    {"age_min": 0, "age_max": null, "sex": "female", "min": 0.6, "max": 1.1, "critical_min": 0.3, "critical_max": 15.0}
  ]'::JSONB,
  'Produto do metabolismo muscular',
  'Marcador mais específico de função renal. Usado para calcular TFG',
  2
FROM exam_library el WHERE el.exam_code = 'REN001';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. FUNÇÃO HEPÁTICA
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO exam_library (exam_code, exam_name, exam_name_alternative, category_id, subcategory, description, clinical_indication, preparation_instructions, collection_method, analysis_method, fasting_required, fasting_hours, turnaround_time_hours, is_urgent_available, avg_cost_private, avg_cost_sus)
SELECT
  'HEP001',
  'Hepatograma Completo',
  ARRAY['Função Hepática', 'Enzimas Hepáticas'],
  id,
  'Bioquímica',
  'Avaliação da função do fígado',
  'Diagnóstico de hepatites, cirrose, esteatose hepática',
  'Jejum de 4 horas. Evitar álcool 72h antes',
  'Sangue',
  'Método enzimático',
  false,
  4,
  6,
  false,
  50.00,
  18.00
FROM exam_categories WHERE name = 'Função Hepática';

INSERT INTO exam_library_parameters (exam_library_id, parameter_code, parameter_name, parameter_name_alternative, unit, unit_alternatives, reference_ranges, description, clinical_significance, display_order)
SELECT
  el.id,
  'HEP_TGO',
  'TGO/AST',
  ARRAY['Transaminase Glutâmico Oxalacética', 'AST', 'SGOT'],
  'U/L',
  ARRAY['UI/L'],
  '[
    {"age_min": 0, "age_max": null, "sex": "all", "min": 0, "max": 40, "critical_min": null, "critical_max": 500}
  ]'::JSONB,
  'Enzima presente no fígado, coração e músculos',
  'Aumenta em lesão hepática, infarto, miopatias',
  1
FROM exam_library el WHERE el.exam_code = 'HEP001';

INSERT INTO exam_library_parameters (exam_library_id, parameter_code, parameter_name, parameter_name_alternative, unit, unit_alternatives, reference_ranges, description, clinical_significance, display_order)
SELECT
  el.id,
  'HEP_TGP',
  'TGP/ALT',
  ARRAY['Transaminase Glutâmico Pirúvica', 'ALT', 'SGPT'],
  'U/L',
  ARRAY['UI/L'],
  '[
    {"age_min": 0, "age_max": null, "sex": "all", "min": 0, "max": 41, "critical_min": null, "critical_max": 500}
  ]'::JSONB,
  'Enzima mais específica do fígado',
  'Principal marcador de lesão hepatocelular',
  2
FROM exam_library el WHERE el.exam_code = 'HEP001';

INSERT INTO exam_library_parameters (exam_library_id, parameter_code, parameter_name, parameter_name_alternative, unit, unit_alternatives, reference_ranges, description, clinical_significance, display_order)
SELECT
  el.id,
  'HEP_GGT',
  'Gama GT',
  ARRAY['GGT', 'Gama Glutamil Transferase'],
  'U/L',
  ARRAY['UI/L'],
  '[
    {"age_min": 0, "age_max": null, "sex": "male", "min": 0, "max": 55, "critical_min": null, "critical_max": 500},
    {"age_min": 0, "age_max": null, "sex": "female", "min": 0, "max": 38, "critical_min": null, "critical_max": 500}
  ]'::JSONB,
  'Enzima presente em fígado e vias biliares',
  'Marcador sensível de colestase e consumo de álcool',
  3
FROM exam_library el WHERE el.exam_code = 'HEP001';

INSERT INTO exam_library_parameters (exam_library_id, parameter_code, parameter_name, parameter_name_alternative, unit, unit_alternatives, reference_ranges, description, clinical_significance, display_order)
SELECT
  el.id,
  'HEP_FA',
  'Fosfatase Alcalina',
  ARRAY['FA', 'ALP'],
  'U/L',
  ARRAY['UI/L'],
  '[
    {"age_min": 0, "age_max": 14, "sex": "all", "min": 0, "max": 350, "critical_min": null, "critical_max": 1000},
    {"age_min": 15, "age_max": null, "sex": "all", "min": 30, "max": 120, "critical_min": null, "critical_max": 1000}
  ]'::JSONB,
  'Enzima presente em fígado e ossos',
  'Aumenta em colestase e doenças ósseas',
  4
FROM exam_library el WHERE el.exam_code = 'HEP001';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. TIREOIDE
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO exam_library (exam_code, exam_name, exam_name_alternative, category_id, subcategory, description, clinical_indication, preparation_instructions, collection_method, analysis_method, fasting_required, fasting_hours, turnaround_time_hours, is_urgent_available, avg_cost_private, avg_cost_sus)
SELECT
  'TIR001',
  'TSH',
  ARRAY['Hormônio Estimulante da Tireoide', 'Tireotrofina'],
  id,
  'Endocrinologia',
  'Hormônio que regula a função da tireoide',
  'Diagnóstico de hipo e hipertireoidismo',
  'Não requer jejum. Coletar sempre no mesmo horário para acompanhamento',
  'Sangue',
  'Quimioluminescência',
  false,
  NULL,
  8,
  false,
  40.00,
  15.00
FROM exam_categories WHERE name = 'Tireoide';

INSERT INTO exam_library_parameters (exam_library_id, parameter_code, parameter_name, parameter_name_alternative, unit, unit_alternatives, reference_ranges, description, clinical_significance, display_order)
SELECT
  el.id,
  'TIR_TSH',
  'TSH',
  ARRAY['Tireotrofina'],
  'μUI/mL',
  ARRAY['mUI/L'],
  '[
    {"age_min": 0, "age_max": null, "sex": "all", "min": 0.4, "max": 4.0, "critical_min": 0.01, "critical_max": 100.0}
  ]'::JSONB,
  'Hormônio produzido pela hipófise que estimula a tireoide',
  'Baixo em hipertireoidismo. Alto em hipotireoidismo',
  1
FROM exam_library el WHERE el.exam_code = 'TIR001';

-- Continua com T4 Livre...
INSERT INTO exam_library (exam_code, exam_name, exam_name_alternative, category_id, subcategory, description, clinical_indication, preparation_instructions, collection_method, analysis_method, fasting_required, fasting_hours, turnaround_time_hours, is_urgent_available, avg_cost_private, avg_cost_sus)
SELECT
  'TIR002',
  'T4 Livre',
  ARRAY['Tiroxina Livre', 'FT4'],
  id,
  'Endocrinologia',
  'Hormônio produzido pela tireoide',
  'Complementa TSH no diagnóstico de doenças da tireoide',
  'Não requer jejum',
  'Sangue',
  'Quimioluminescência',
  false,
  NULL,
  8,
  false,
  45.00,
  18.00
FROM exam_categories WHERE name = 'Tireoide';

INSERT INTO exam_library_parameters (exam_library_id, parameter_code, parameter_name, parameter_name_alternative, unit, unit_alternatives, reference_ranges, description, clinical_significance, display_order)
SELECT
  el.id,
  'TIR_T4L',
  'T4 Livre',
  ARRAY['FT4', 'Free T4'],
  'ng/dL',
  ARRAY['pmol/L'],
  '[
    {"age_min": 0, "age_max": null, "sex": "all", "min": 0.8, "max": 1.8, "critical_min": 0.1, "critical_max": 10.0}
  ]'::JSONB,
  'Fração livre (ativa) da tiroxina',
  'Baixo em hipotireoidismo. Alto em hipertireoidismo',
  1
FROM exam_library el WHERE el.exam_code = 'TIR002';

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIM DO SEED
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON SCHEMA public IS 'Biblioteca populada com exames médicos comuns do sistema brasileiro';
