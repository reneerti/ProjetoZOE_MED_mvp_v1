-- Populate exam_categories with common medical test categories
INSERT INTO exam_categories (name, description, icon) VALUES
  ('Hematologia', 'Exames de sangue completo', '🩸'),
  ('Bioquímica', 'Perfil metabólico e função hepática', '🧪'),
  ('Hormônios', 'Perfil hormonal e tireóide', '⚗️'),
  ('Vitaminas', 'Dosagem de vitaminas e minerais', '💊'),
  ('Imunologia', 'Marcadores inflamatórios e imunológicos', '🛡️')
ON CONFLICT (id) DO NOTHING;

-- Populate exam_types with specific test types
INSERT INTO exam_types (name, description, category_id) 
SELECT 
  type_name,
  type_desc,
  (SELECT id FROM exam_categories WHERE name = cat_name LIMIT 1)
FROM (VALUES
  ('Hemograma Completo', 'Contagem completa de células sanguíneas', 'Hematologia'),
  ('Perfil Lipídico', 'Colesterol e triglicerídeos', 'Bioquímica'),
  ('Glicemia', 'Níveis de glicose no sangue', 'Bioquímica'),
  ('Função Hepática', 'TGO, TGP, GGT, Bilirrubinas', 'Bioquímica'),
  ('Função Renal', 'Creatinina, Ureia, TFG', 'Bioquímica'),
  ('Perfil Tireoidiano', 'TSH, T3, T4', 'Hormônios'),
  ('Vitamina D', 'Dosagem de 25-hidroxivitamina D', 'Vitaminas'),
  ('Vitamina B12', 'Dosagem de cobalamina', 'Vitaminas'),
  ('PCR', 'Proteína C Reativa', 'Imunologia')
) AS t(type_name, type_desc, cat_name)
ON CONFLICT (id) DO NOTHING;

-- Populate exam_parameters with reference ranges
INSERT INTO exam_parameters (parameter_name, unit, reference_min, reference_max, critical_low, critical_high, exam_type_id, description)
SELECT 
  param_name,
  param_unit,
  ref_min,
  ref_max,
  crit_low,
  crit_high,
  (SELECT id FROM exam_types WHERE name = type_name LIMIT 1),
  param_desc
FROM (VALUES
  -- Hemograma
  ('Hemoglobina', 'g/dL', 12.0, 16.0, 8.0, 18.0, 'Hemograma Completo', 'Proteína que transporta oxigênio'),
  ('Leucócitos', '/mm³', 4000, 11000, 2000, 20000, 'Hemograma Completo', 'Células de defesa'),
  ('Plaquetas', '/mm³', 150000, 400000, 50000, 1000000, 'Hemograma Completo', 'Células de coagulação'),
  ('Hematócrito', '%', 36.0, 48.0, 25.0, 60.0, 'Hemograma Completo', 'Percentual de células vermelhas'),
  
  -- Perfil Lipídico
  ('Colesterol Total', 'mg/dL', 0, 200, NULL, 240, 'Perfil Lipídico', 'Colesterol total no sangue'),
  ('HDL', 'mg/dL', 40, 999, NULL, NULL, 'Perfil Lipídico', 'Colesterol bom'),
  ('LDL', 'mg/dL', 0, 130, NULL, 160, 'Perfil Lipídico', 'Colesterol ruim'),
  ('Triglicerídeos', 'mg/dL', 0, 150, NULL, 500, 'Perfil Lipídico', 'Gorduras no sangue'),
  
  -- Glicemia
  ('Glicose em Jejum', 'mg/dL', 70, 100, 40, 250, 'Glicemia', 'Açúcar no sangue em jejum'),
  ('Hemoglobina Glicada', '%', 0, 5.6, NULL, 9.0, 'Glicemia', 'Média glicêmica 3 meses'),
  
  -- Função Hepática
  ('TGO/AST', 'U/L', 0, 40, NULL, 200, 'Função Hepática', 'Enzima hepática'),
  ('TGP/ALT', 'U/L', 0, 41, NULL, 200, 'Função Hepática', 'Enzima hepática'),
  ('GGT', 'U/L', 0, 55, NULL, 300, 'Função Hepática', 'Enzima hepática'),
  ('Bilirrubina Total', 'mg/dL', 0.3, 1.2, NULL, 5.0, 'Função Hepática', 'Produto da degradação da hemoglobina'),
  
  -- Função Renal
  ('Creatinina', 'mg/dL', 0.6, 1.2, NULL, 5.0, 'Função Renal', 'Marcador de função renal'),
  ('Ureia', 'mg/dL', 10, 50, NULL, 200, 'Função Renal', 'Produto do metabolismo proteico'),
  ('TFG', 'mL/min/1.73m²', 90, 999, NULL, NULL, 'Função Renal', 'Taxa de filtração glomerular'),
  
  -- Perfil Tireoidiano
  ('TSH', 'μUI/mL', 0.4, 4.0, 0.1, 10.0, 'Perfil Tireoidiano', 'Hormônio estimulante da tireoide'),
  ('T4 Livre', 'ng/dL', 0.8, 1.8, 0.3, 5.0, 'Perfil Tireoidiano', 'Tiroxina livre'),
  ('T3 Livre', 'pg/mL', 2.3, 4.2, 1.0, 10.0, 'Perfil Tireoidiano', 'Triiodotironina livre'),
  
  -- Vitaminas
  ('Vitamina D', 'ng/mL', 30, 100, 10, NULL, 'Vitamina D', 'Vitamina D (25-OH)'),
  ('Vitamina B12', 'pg/mL', 200, 900, 100, NULL, 'Vitamina B12', 'Cobalamina'),
  
  -- Imunologia
  ('PCR', 'mg/L', 0, 5, NULL, 200, 'PCR', 'Proteína C Reativa')
) AS p(param_name, param_unit, ref_min, ref_max, crit_low, crit_high, type_name, param_desc)
ON CONFLICT (id) DO NOTHING;