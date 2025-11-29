-- ═══════════════════════════════════════════════════════════════
-- SEEDS: MEDICAMENTOS COMUNS
-- Medicamentos frequentemente prescritos para controle metabólico
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- CATEGORIA: ANTIDIABÉTICOS - AGONISTAS GLP-1
-- ═══════════════════════════════════════════════════════════════

-- MONJARO (Tirzepatide)
INSERT INTO medication_library (
  medication_code, commercial_name, generic_name, active_ingredient,
  category, subcategory, manufacturer, therapeutic_class,
  mechanism_of_action, presentation, indications, contraindications,
  common_side_effects, serious_side_effects, drug_interactions,
  requires_prescription, controlled_substance, pregnancy_category,
  breastfeeding_safe, storage_conditions
) VALUES (
  'MED_MONJ',
  'Monjaro',
  'Tirzepatida',
  'Tirzepatide',
  'antidiabeticos',
  'agonistas_glp1_gip',
  'Eli Lilly',
  'Agonista duplo GLP-1 e GIP',
  'Ativa receptores de GLP-1 e GIP, estimulando a secreção de insulina dependente de glicose, reduzindo glucagon e retardando esvaziamento gástrico',
  '[
    {"dosage":"2.5mg","form":"caneta injetável","package":"4 canetas"},
    {"dosage":"5mg","form":"caneta injetável","package":"4 canetas"},
    {"dosage":"7.5mg","form":"caneta injetável","package":"4 canetas"},
    {"dosage":"10mg","form":"caneta injetável","package":"4 canetas"},
    {"dosage":"12.5mg","form":"caneta injetável","package":"4 canetas"},
    {"dosage":"15mg","form":"caneta injetável","package":"4 canetas"}
  ]'::JSONB,
  ARRAY['Diabetes mellitus tipo 2', 'Controle glicêmico', 'Perda de peso em diabéticos'],
  ARRAY['Hipersensibilidade ao tirzepatide', 'História pessoal/familiar de carcinoma medular de tireoide', 'Síndrome de neoplasia endócrina múltipla tipo 2 (MEN 2)', 'Gestação', 'Pancreatite aguda'],
  ARRAY['Náusea', 'Vômitos', 'Diarreia', 'Diminuição do apetite', 'Constipação', 'Dispepsia', 'Dor abdominal'],
  ARRAY['Pancreatite aguda', 'Retinopatia diabética', 'Hipoglicemia (com insulina ou sulfonilureias)', 'Reações alérgicas graves', 'Doença da vesícula biliar'],
  ARRAY['Insulina (risco de hipoglicemia)', 'Sulfonilureias (risco de hipoglicemia)', 'Medicamentos orais (absorção pode ser afetada)'],
  true,
  false,
  'C',
  false,
  'Refrigerar entre 2-8°C. Não congelar. Após primeiro uso, pode ser mantido em temperatura ambiente (até 30°C) por até 21 dias.'
);

-- Posologias do Monjaro
INSERT INTO medication_dosage_guidelines (
  medication_id, indication, age_group, dosage_min, dosage_max,
  dosage_unit, frequency, route, duration, special_instructions, titration_schedule
) SELECT id, 'Diabetes Tipo 2', 'adulto', 2.5, 15,
  'mg', '1x/semana', 'subcutânea', 'uso contínuo',
  'Aplicar no mesmo dia da semana. Pode ser aplicado a qualquer hora. Alternar local de aplicação (abdome, coxa, braço).',
  '[
    {"week": 1, "dosage": 2.5, "instructions": "Dose inicial"},
    {"week": 5, "dosage": 5, "instructions": "Aumento após 4 semanas"},
    {"week": 9, "dosage": 7.5, "instructions": "Aumento opcional"},
    {"week": 13, "dosage": 10, "instructions": "Aumento opcional"},
    {"week": 17, "dosage": 12.5, "instructions": "Aumento opcional"},
    {"week": 21, "dosage": 15, "instructions": "Dose máxima"}
  ]'::JSONB
FROM medication_library WHERE medication_code = 'MED_MONJ';

-- OZEMPIC (Semaglutide)
INSERT INTO medication_library (
  medication_code, commercial_name, generic_name, active_ingredient,
  category, subcategory, manufacturer, therapeutic_class,
  mechanism_of_action, presentation, indications, contraindications,
  common_side_effects, serious_side_effects, drug_interactions,
  requires_prescription, controlled_substance, pregnancy_category,
  breastfeeding_safe
) VALUES (
  'MED_OZEM',
  'Ozempic',
  'Semaglutida',
  'Semaglutide',
  'antidiabeticos',
  'agonistas_glp1',
  'Novo Nordisk',
  'Agonista do receptor GLP-1',
  'Ativa receptores de GLP-1, estimulando liberação de insulina e reduzindo glucagon',
  '[
    {"dosage":"0.25mg","form":"caneta injetável","package":"1 caneta"},
    {"dosage":"0.5mg","form":"caneta injetável","package":"1 caneta"},
    {"dosage":"1mg","form":"caneta injetável","package":"1 caneta"}
  ]'::JSONB,
  ARRAY['Diabetes mellitus tipo 2', 'Redução de risco cardiovascular em diabéticos'],
  ARRAY['Hipersensibilidade', 'História de carcinoma medular de tireoide', 'MEN 2'],
  ARRAY['Náusea', 'Vômitos', 'Diarreia', 'Dor abdominal', 'Constipação'],
  ARRAY['Pancreatite', 'Retinopatia diabética', 'Hipoglicemia', 'Lesões renais agudas'],
  ARRAY['Insulina', 'Sulfonilureias'],
  true,
  false,
  'C',
  false
);

-- Posologias do Ozempic
INSERT INTO medication_dosage_guidelines (
  medication_id, indication, age_group, dosage_min, dosage_max,
  dosage_unit, frequency, route, titration_schedule
) SELECT id, 'Diabetes Tipo 2', 'adulto', 0.25, 1,
  'mg', '1x/semana', 'subcutânea',
  '[
    {"week": 1, "dosage": 0.25, "instructions": "Dose inicial - 4 semanas"},
    {"week": 5, "dosage": 0.5, "instructions": "Dose de manutenção"},
    {"week": 9, "dosage": 1, "instructions": "Dose máxima (opcional)"}
  ]'::JSONB
FROM medication_library WHERE medication_code = 'MED_OZEM';

-- ═══════════════════════════════════════════════════════════════
-- CATEGORIA: ANTIDIABÉTICOS - BIGUANIDAS
-- ═══════════════════════════════════════════════════════════════

-- METFORMINA
INSERT INTO medication_library (
  medication_code, commercial_name, generic_name, active_ingredient,
  category, subcategory, manufacturer, therapeutic_class,
  mechanism_of_action, presentation, indications, contraindications,
  common_side_effects, serious_side_effects, drug_interactions,
  requires_prescription, controlled_substance, pregnancy_category,
  breastfeeding_safe
) VALUES (
  'MED_METF',
  'Glifage / Metformina',
  'Cloridrato de Metformina',
  'Metformin Hydrochloride',
  'antidiabeticos',
  'biguanidas',
  'Diversos',
  'Antidiabético oral - biguanida',
  'Reduz produção hepática de glicose, aumenta sensibilidade à insulina e reduz absorção intestinal de glicose',
  '[
    {"dosage":"500mg","form":"comprimido","package":"30 comprimidos"},
    {"dosage":"850mg","form":"comprimido","package":"30 comprimidos"},
    {"dosage":"1000mg","form":"comprimido","package":"30 comprimidos"},
    {"dosage":"500mg","form":"comprimido XR","package":"30 comprimidos"},
    {"dosage":"750mg","form":"comprimido XR","package":"30 comprimidos"}
  ]'::JSONB,
  ARRAY['Diabetes mellitus tipo 2', 'Síndrome dos ovários policísticos', 'Pré-diabetes'],
  ARRAY['Insuficiência renal (TFG <30)', 'Acidose metabólica', 'Insuficiência cardíaca descompensada', 'Insuficiência hepática grave', 'Alcoolismo'],
  ARRAY['Diarreia', 'Náusea', 'Vômitos', 'Flatulência', 'Gosto metálico', 'Dor abdominal'],
  ARRAY['Acidose láctica (raro)', 'Deficiência de vitamina B12'],
  ARRAY['Contraste iodado (suspender antes de exames)', 'Álcool (risco de acidose láctica)'],
  true,
  false,
  'B',
  true
);

-- Posologias da Metformina
INSERT INTO medication_dosage_guidelines (
  medication_id, indication, age_group, dosage_min, dosage_max,
  dosage_unit, frequency, route, special_instructions, titration_schedule
) SELECT id, 'Diabetes Tipo 2', 'adulto', 500, 2550,
  'mg', '2-3x/dia', 'oral',
  'Tomar durante ou após as refeições. Aumentar dose gradualmente para minimizar efeitos GI.',
  '[
    {"week": 1, "dosage": 500, "frequency": "1x/dia (jantar)", "instructions": "Dose inicial"},
    {"week": 2, "dosage": 500, "frequency": "2x/dia (café e jantar)", "instructions": "Aumento gradual"},
    {"week": 3, "dosage": 850, "frequency": "2x/dia", "instructions": "Titulação"},
    {"week": 4, "dosage": 850, "frequency": "3x/dia", "instructions": "Dose usual máxima"}
  ]'::JSONB
FROM medication_library WHERE medication_code = 'MED_METF';

-- ═══════════════════════════════════════════════════════════════
-- CATEGORIA: HIPOLIPEMIANTES - ESTATINAS
-- ═══════════════════════════════════════════════════════════════

-- ATORVASTATINA
INSERT INTO medication_library (
  medication_code, commercial_name, generic_name, active_ingredient,
  category, subcategory, therapeutic_class,
  mechanism_of_action, presentation, indications, contraindications,
  common_side_effects, serious_side_effects, drug_interactions,
  requires_prescription, pregnancy_category, breastfeeding_safe
) VALUES (
  'MED_ATOR',
  'Lipitor / Atorvastatina',
  'Atorvastatina Cálcica',
  'Atorvastatin Calcium',
  'hipolipemiantes',
  'estatinas',
  'Inibidor da HMG-CoA redutase',
  'Inibe a HMG-CoA redutase, enzima responsável pela síntese de colesterol no fígado',
  '[
    {"dosage":"10mg","form":"comprimido","package":"30 comprimidos"},
    {"dosage":"20mg","form":"comprimido","package":"30 comprimidos"},
    {"dosage":"40mg","form":"comprimido","package":"30 comprimidos"},
    {"dosage":"80mg","form":"comprimido","package":"30 comprimidos"}
  ]'::JSONB,
  ARRAY['Hipercolesterolemia', 'Prevenção cardiovascular', 'Dislipidemia mista'],
  ARRAY['Doença hepática ativa', 'Gestação', 'Lactação', 'Hipersensibilidade'],
  ARRAY['Mialgia', 'Cefaleia', 'Dor abdominal', 'Náusea', 'Constipação'],
  ARRAY['Rabdomiólise', 'Hepatotoxicidade', 'Diabetes mellitus de novo'],
  ARRAY['Fibratos (risco de rabdomiólise)', 'Niacina', 'Ciclosporina', 'Antifúngicos azólicos'],
  true,
  'X',
  false
);

-- ═══════════════════════════════════════════════════════════════
-- CATEGORIA: ANTI-HIPERTENSIVOS
-- ═══════════════════════════════════════════════════════════════

-- LOSARTANA
INSERT INTO medication_library (
  medication_code, commercial_name, generic_name, active_ingredient,
  category, subcategory, therapeutic_class,
  mechanism_of_action, presentation, indications, contraindications,
  common_side_effects, serious_side_effects,
  requires_prescription, pregnancy_category
) VALUES (
  'MED_LOSA',
  'Cozaar / Losartana',
  'Losartana Potássica',
  'Losartan Potassium',
  'anti_hipertensivos',
  'antagonistas_at1',
  'Bloqueador dos receptores de angiotensina II',
  'Bloqueia a ação da angiotensina II nos receptores AT1, promovendo vasodilatação e redução da pressão arterial',
  '[
    {"dosage":"25mg","form":"comprimido","package":"30 comprimidos"},
    {"dosage":"50mg","form":"comprimido","package":"30 comprimidos"},
    {"dosage":"100mg","form":"comprimido","package":"30 comprimidos"}
  ]'::JSONB,
  ARRAY['Hipertensão arterial', 'Nefropatia diabética', 'Insuficiência cardíaca'],
  ARRAY['Gestação', 'Hipersensibilidade', 'Estenose bilateral de artérias renais'],
  ARRAY['Tontura', 'Hipotensão ortostática', 'Fadiga', 'Hipercalemia'],
  ARRAY['Angioedema (raro)', 'Insuficiência renal aguda'],
  true,
  'D'
);

-- ═════════════════════════════════════════════════════════════════
-- CATEGORIA: HORMÔNIOS
-- ═══════════════════════════════════════════════════════════════

-- LEVOTIROXINA
INSERT INTO medication_library (
  medication_code, commercial_name, generic_name, active_ingredient,
  category, subcategory, therapeutic_class,
  mechanism_of_action, presentation, indications, contraindications,
  common_side_effects, requires_prescription, pregnancy_category
) VALUES (
  'MED_LEVO',
  'Puran T4 / Levotiroxina',
  'Levotiroxina Sódica',
  'Levothyroxine Sodium',
  'hormonios',
  'hormonios_tireoidianos',
  'Reposição de hormônio tireoidiano',
  'Suplementa ou substitui a tiroxina endógena, hormônio produzido pela glândula tireoide',
  '[
    {"dosage":"25mcg","form":"comprimido","package":"30 comprimidos"},
    {"dosage":"50mcg","form":"comprimido","package":"30 comprimidos"},
    {"dosage":"75mcg","form":"comprimido","package":"30 comprimidos"},
    {"dosage":"100mcg","form":"comprimido","package":"30 comprimidos"},
    {"dosage":"150mcg","form":"comprimido","package":"30 comprimidos"}
  ]'::JSONB,
  ARRAY['Hipotireoidismo', 'Tireoidite de Hashimoto', 'Pós-tireoidectomia'],
  ARRAY['Tireotoxicose não tratada', 'Insuficiência adrenal não tratada'],
  ARRAY['Palpitações', 'Tremores', 'Insônia', 'Perda de peso', 'Sudorese'],
  true,
  'A'
);

-- ═══════════════════════════════════════════════════════════════
-- INTERAÇÕES MEDICAMENTOSAS IMPORTANTES
-- ═══════════════════════════════════════════════════════════════

-- Monjaro + Insulina
INSERT INTO drug_interaction_alerts (
  medication_a_id, medication_b_id,
  interaction_type, severity, description, clinical_effects, recommendations
) SELECT
  (SELECT id FROM medication_library WHERE medication_code = 'MED_MONJ'),
  (SELECT id FROM medication_library WHERE medication_code = 'MED_METF'),
  'farmacodinamica',
  'leve',
  'Efeito aditivo no controle glicêmico',
  'Potencialização do efeito hipoglicemiante, geralmente benéfico',
  'Monitorar glicemia. Combinação frequentemente utilizada e segura.'
;

-- Atorvastatina + Fibratos
INSERT INTO drug_interaction_alerts (
  medication_a_id, medication_b_id,
  interaction_type, severity, description, clinical_effects, recommendations
) VALUES
  ((SELECT id FROM medication_library WHERE medication_code = 'MED_ATOR'),
   (SELECT id FROM medication_library WHERE medication_code = 'MED_ATOR'),
   'farmacodinamica',
   'grave',
   'Aumento significativo do risco de rabdomiólise quando combinado com fibratos',
   'Dor muscular, fraqueza, elevação de CPK, possível lesão renal',
   'Evitar combinação se possível. Se necessário, usar com cautela máxima, monitorar CPK regularmente.');

-- Metformina + Contraste Iodado
-- (Nota: contraste não está na biblioteca, mas documentar a interação)
