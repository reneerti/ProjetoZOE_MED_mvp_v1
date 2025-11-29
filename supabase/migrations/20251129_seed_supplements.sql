-- ═══════════════════════════════════════════════════════════════
-- SEEDS: SUPLEMENTOS COMUNS
-- Suplementos frequentemente utilizados
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- CATEGORIA: VITAMINAS
-- ═══════════════════════════════════════════════════════════════

-- VITAMINA D3
INSERT INTO supplement_library (
  supplement_code, name, category, subcategory,
  active_compounds, description, benefits,
  recommended_dosage_min, recommended_dosage_max, dosage_unit, upper_limit_safe,
  deficiency_symptoms, excess_symptoms, food_sources,
  absorption_enhancers, absorption_inhibitors,
  contraindications, best_time_to_take, take_with_food,
  pregnancy_safe, breastfeeding_safe
) VALUES (
  'SUP_VIT_D3',
  'Vitamina D3 (Colecalciferol)',
  'vitaminas',
  'vitaminas_liposoluveis',
  '[{"compound":"Colecalciferol","type":"Vitamina D3"}]'::JSONB,
  'Vitamina essencial para saúde óssea, imunidade e função muscular',
  ARRAY[
    'Saúde óssea e prevenção de osteoporose',
    'Função imunológica',
    'Saúde muscular',
    'Regulação do cálcio',
    'Melhora do humor',
    'Prevenção de doenças autoimunes'
  ],
  1000, 4000, 'UI', 10000,
  ARRAY[
    'Fadiga e fraqueza muscular',
    'Dores ósseas e articulares',
    'Depressão',
    'Infecções frequentes',
    'Baixa densidade óssea',
    'Queda de cabelo'
  ],
  ARRAY[
    'Hipercalcemia',
    'Náusea e vômitos',
    'Fraqueza',
    'Problemas renais'
  ],
  ARRAY[
    'Peixes gordurosos (salmão, atum)',
    'Gema de ovo',
    'Cogumelos (expostos ao sol)',
    'Alimentos fortificados'
  ],
  ARRAY['Gorduras saudáveis', 'Tomado com refeições'],
  ARRAY['Medicamentos para epilepsia', 'Orlistat'],
  ARRAY['Hipercalcemia', 'Sarcoidose', 'Hiperparatireoidismo'],
  'manhã',
  true,
  true,
  true
);

-- VITAMINA B12
INSERT INTO supplement_library (
  supplement_code, name, category, subcategory,
  active_compounds, description, benefits,
  recommended_dosage_min, recommended_dosage_max, dosage_unit, upper_limit_safe,
  deficiency_symptoms, food_sources,
  best_time_to_take, take_with_food,
  pregnancy_safe, breastfeeding_safe
) VALUES (
  'SUP_VIT_B12',
  'Vitamina B12 (Metilcobalamina)',
  'vitaminas',
  'vitaminas_complexo_b',
  '[{"compound":"Metilcobalamina","type":"Vitamina B12"}]'::JSONB,
  'Vitamina essencial para formação de células sanguíneas e função neurológica',
  ARRAY[
    'Formação de glóbulos vermelhos',
    'Função neurológica',
    'Síntese de DNA',
    'Produção de energia',
    'Saúde mental'
  ],
  500, 2000, 'mcg', 10000,
  ARRAY[
    'Anemia megaloblástica',
    'Fadiga extrema',
    'Formigamento nas mãos e pés',
    'Problemas de memória',
    'Depressão',
    'Glossite (língua inchada)'
  ],
  ARRAY[
    'Carnes (especialmente fígado)',
    'Peixes',
    'Ovos',
    'Laticínios',
    'Alimentos fortificados'
  ],
  'manhã',
  false,
  true,
  true
);

-- VITAMINA C
INSERT INTO supplement_library (
  supplement_code, name, category, subcategory,
  active_compounds, description, benefits,
  recommended_dosage_min, recommended_dosage_max, dosage_unit, upper_limit_safe,
  deficiency_symptoms, excess_symptoms, food_sources,
  best_time_to_take, take_with_food,
  pregnancy_safe, breastfeeding_safe
) VALUES (
  'SUP_VIT_C',
  'Vitamina C (Ácido Ascórbico)',
  'vitaminas',
  'vitaminas_hidrosoluveis',
  '[{"compound":"Ácido Ascórbico","type":"Vitamina C"}]'::JSONB,
  'Antioxidante essencial para imunidade e síntese de colágeno',
  ARRAY[
    'Função imunológica',
    'Antioxidante potente',
    'Síntese de colágeno',
    'Absorção de ferro',
    'Saúde da pele'
  ],
  500, 2000, 'mg', 2000,
  ARRAY[
    'Escorbuto (raro)',
    'Sangramento gengival',
    'Cicatrização lenta',
    'Fadiga',
    'Infecções frequentes'
  ],
  ARRAY[
    'Diarreia',
    'Náusea',
    'Cólicas abdominais',
    'Pedras nos rins (em doses muito altas)'
  ],
  ARRAY[
    'Frutas cítricas',
    'Pimentão',
    'Brócolis',
    'Morango',
    'Kiwi'
  ],
  'manhã ou tarde',
  true,
  true,
  true
);

-- ═══════════════════════════════════════════════════════════════
-- CATEGORIA: MINERAIS
-- ═══════════════════════════════════════════════════════════════

-- MAGNÉSIO
INSERT INTO supplement_library (
  supplement_code, name, category, subcategory,
  active_compounds, description, benefits,
  recommended_dosage_min, recommended_dosage_max, dosage_unit, upper_limit_safe,
  deficiency_symptoms, excess_symptoms, food_sources,
  best_time_to_take, take_with_food,
  pregnancy_safe, breastfeeding_safe
) VALUES (
  'SUP_MAG',
  'Magnésio (Quelato/Glicinato)',
  'minerais',
  'macrominerais',
  '[{"compound":"Magnésio Glicinato","type":"Magnésio"}]'::JSONB,
  'Mineral essencial para mais de 300 reações enzimáticas',
  ARRAY[
    'Função muscular e nervosa',
    'Regulação da pressão arterial',
    'Síntese proteica',
    'Controle glicêmico',
    'Saúde óssea',
    'Melhora da qualidade do sono'
  ],
  200, 400, 'mg', 350,
  ARRAY[
    'Cãibras musculares',
    'Fadiga',
    'Insônia',
    'Ansiedade',
    'Arritmias',
    'Constipação'
  ],
  ARRAY[
    'Diarreia',
    'Náusea',
    'Cólicas abdominais'
  ],
  ARRAY[
    'Folhas verdes escuras',
    'Nozes e sementes',
    'Grãos integrais',
    'Leguminosas',
    'Abacate'
  ],
  'noite',
  true,
  true,
  true
);

-- ZINCO
INSERT INTO supplement_library (
  supplement_code, name, category, subcategory,
  active_compounds, description, benefits,
  recommended_dosage_min, recommended_dosage_max, dosage_unit, upper_limit_safe,
  deficiency_symptoms, excess_symptoms, food_sources,
  absorption_enhancers, absorption_inhibitors,
  best_time_to_take, take_with_food,
  pregnancy_safe, breastfeeding_safe
) VALUES (
  'SUP_ZINC',
  'Zinco (Quelato)',
  'minerais',
  'oligoelementos',
  '[{"compound":"Zinco Quelato","type":"Zinco"}]'::JSONB,
  'Mineral essencial para imunidade e cicatrização',
  ARRAY[
    'Função imunológica',
    'Cicatrização de feridas',
    'Síntese de proteínas',
    'Saúde da pele',
    'Produção de testosterona',
    'Função cognitiva'
  ],
  15, 30, 'mg', 40,
  ARRAY[
    'Queda de cabelo',
    'Acne',
    'Infecções frequentes',
    'Perda de apetite',
    'Cicatrização lenta',
    'Alterações no paladar'
  ],
  ARRAY[
    'Náusea',
    'Vômitos',
    'Redução da absorção de cobre',
    'Redução do HDL'
  ],
  ARRAY[
    'Ostras',
    'Carne vermelha',
    'Aves',
    'Feijões',
    'Nozes'
  ],
  ARRAY['Proteína animal'],
  ARRAY['Fitatos (grãos)', 'Cálcio', 'Ferro'],
  'manhã',
  true,
  true,
  true
);

-- FERRO
INSERT INTO supplement_library (
  supplement_code, name, category, subcategory,
  active_compounds, description, benefits,
  recommended_dosage_min, recommended_dosage_max, dosage_unit, upper_limit_safe,
  deficiency_symptoms, excess_symptoms, food_sources,
  absorption_enhancers, absorption_inhibitors,
  contraindications, best_time_to_take, take_with_food,
  pregnancy_safe, breastfeeding_safe
) VALUES (
  'SUP_IRON',
  'Ferro (Quelato/Bisglicinato)',
  'minerais',
  'oligoelementos',
  '[{"compound":"Ferro Bisglicinato","type":"Ferro"}]'::JSONB,
  'Mineral essencial para transporte de oxigênio',
  ARRAY[
    'Transporte de oxigênio',
    'Formação de hemoglobina',
    'Produção de energia',
    'Função imunológica'
  ],
  18, 45, 'mg', 45,
  ARRAY[
    'Anemia ferropriva',
    'Fadiga extrema',
    'Palidez',
    'Falta de ar',
    'Unhas quebradiças',
    'Queda de cabelo'
  ],
  ARRAY[
    'Constipação',
    'Náusea',
    'Dor abdominal',
    'Fezes escuras',
    'Sobrecarga de ferro (hemocromatose)'
  ],
  ARRAY[
    'Carne vermelha',
    'Fígado',
    'Feijões',
    'Espinafre',
    'Lentilhas'
  ],
  ARRAY['Vitamina C', 'Tomado em jejum'],
  ARRAY['Cálcio', 'Chá', 'Café', 'Fitatos'],
  ARRAY['Hemocromatose', 'Talassemia'],
  'jejum ou manhã',
  false,
  true,
  true
);

-- ═══════════════════════════════════════════════════════════════
-- CATEGORIA: ÁCIDOS GRAXOS
-- ═══════════════════════════════════════════════════════════════

-- ÔMEGA 3
INSERT INTO supplement_library (
  supplement_code, name, category, subcategory,
  active_compounds, description, benefits,
  recommended_dosage_min, recommended_dosage_max, dosage_unit, upper_limit_safe,
  deficiency_symptoms, food_sources,
  contraindications, best_time_to_take, take_with_food,
  pregnancy_safe, breastfeeding_safe
) VALUES (
  'SUP_OMEGA3',
  'Ômega 3 (EPA + DHA)',
  'acidos_graxos',
  'omega3',
  '[{"compound":"EPA","amount":500,"unit":"mg"},{"compound":"DHA","amount":300,"unit":"mg"}]'::JSONB,
  'Ácidos graxos essenciais com efeitos anti-inflamatórios',
  ARRAY[
    'Saúde cardiovascular',
    'Redução de triglicerídeos',
    'Anti-inflamatório',
    'Função cerebral',
    'Saúde ocular',
    'Redução da depressão'
  ],
  1000, 3000, 'mg', 5000,
  ARRAY[
    'Pele seca',
    'Fadiga',
    'Problemas de memória',
    'Problemas cardiovasculares',
    'Depressão'
  ],
  ARRAY[
    'Peixes gordurosos (salmão, sardinha, atum)',
    'Sementes de chia',
    'Linhaça',
    'Nozes'
  ],
  ARRAY['Uso de anticoagulantes (monitorar)', 'Alergia a peixes'],
  'com refeições',
  true,
  true,
  true
);

-- ═══════════════════════════════════════════════════════════════
-- CATEGORIA: PROBIÓTICOS
-- ═══════════════════════════════════════════════════════════════

-- PROBIÓTICOS
INSERT INTO supplement_library (
  supplement_code, name, category, subcategory,
  active_compounds, description, benefits,
  recommended_dosage_min, recommended_dosage_max, dosage_unit,
  food_sources,
  best_time_to_take, take_with_food,
  pregnancy_safe, breastfeeding_safe
) VALUES (
  'SUP_PROBIO',
  'Probióticos (Multi-cepas)',
  'probioticos',
  'bacterias_beneficas',
  '[{"compound":"Lactobacillus acidophilus"},{"compound":"Bifidobacterium"},{"compound":"Lactobacillus rhamnosus"}]'::JSONB,
  'Bactérias benéficas para saúde intestinal',
  ARRAY[
    'Saúde intestinal',
    'Função imunológica',
    'Digestão',
    'Redução de inchaço',
    'Saúde mental (eixo intestino-cérebro)',
    'Prevenção de diarreia'
  ],
  10, 50, 'bilhões UFC',
  ARRAY[
    'Iogurte',
    'Kefir',
    'Kombucha',
    'Chucrute',
    'Kimchi',
    'Missô'
  ],
  'jejum ou antes de dormir',
  false,
  true,
  true
);

-- ═══════════════════════════════════════════════════════════════
-- CATEGORIA: AMINOÁCIDOS
-- ═══════════════════════════════════════════════════════════════

-- CREATINA
INSERT INTO supplement_library (
  supplement_code, name, category, subcategory,
  active_compounds, description, benefits,
  recommended_dosage_min, recommended_dosage_max, dosage_unit,
  food_sources,
  best_time_to_take, take_with_food,
  pregnancy_safe, breastfeeding_safe
) VALUES (
  'SUP_CREAT',
  'Creatina Monohidratada',
  'aminoacidos',
  'ergogenicos',
  '[{"compound":"Creatina Monohidratada","type":"Creatina"}]'::JSONB,
  'Aminoácido para performance física e ganho de massa muscular',
  ARRAY[
    'Aumento de força e potência',
    'Ganho de massa muscular',
    'Melhora da performance em exercícios de alta intensidade',
    'Função cognitiva',
    'Recuperação muscular'
  ],
  3, 5, 'g',
  ARRAY[
    'Carne vermelha',
    'Peixes'
  ],
  'pós-treino ou qualquer hora',
  true,
  false,
  false
);

-- WHEY PROTEIN
INSERT INTO supplement_library (
  supplement_code, name, category, subcategory,
  active_compounds, description, benefits,
  recommended_dosage_min, recommended_dosage_max, dosage_unit,
  food_sources,
  best_time_to_take, take_with_food,
  pregnancy_safe, breastfeeding_safe
) VALUES (
  'SUP_WHEY',
  'Whey Protein (Proteína do Soro do Leite)',
  'aminoacidos',
  'proteinas',
  '[{"compound":"Whey Protein Isolado","type":"Proteína"}]'::JSONB,
  'Proteína de rápida absorção para síntese muscular',
  ARRAY[
    'Síntese proteica muscular',
    'Recuperação pós-treino',
    'Manutenção da massa magra',
    'Saciedade',
    'Suporte ao sistema imunológico'
  ],
  20, 40, 'g',
  ARRAY[
    'Leite',
    'Queijos',
    'Iogurte'
  ],
  'pós-treino ou entre refeições',
  false,
  true,
  true
);

-- ═══════════════════════════════════════════════════════════════
-- CATEGORIA: FITOTERÁPICOS
-- ═══════════════════════════════════════════════════════════════

-- CURCUMA (Açafrão)
INSERT INTO supplement_library (
  supplement_code, name, category, subcategory,
  active_compounds, description, benefits,
  recommended_dosage_min, recommended_dosage_max, dosage_unit,
  absorption_enhancers,
  best_time_to_take, take_with_food,
  pregnancy_safe, breastfeeding_safe
) VALUES (
  'SUP_CURC',
  'Cúrcuma (Curcumina)',
  'fitoterapicos',
  'anti_inflamatorios',
  '[{"compound":"Curcumina","type":"Curcuminóide"}]'::JSONB,
  'Anti-inflamatório natural potente',
  ARRAY[
    'Anti-inflamatório potente',
    'Antioxidante',
    'Saúde articular',
    'Função cerebral',
    'Saúde cardiovascular',
    'Digestão'
  ],
  500, 2000, 'mg',
  ARRAY['Piperina (pimenta preta)', 'Gorduras'],
  'com refeições',
  true,
  false,
  false
);

-- ═══════════════════════════════════════════════════════════════
-- INTERAÇÕES SUPLEMENTO-MEDICAMENTO
-- ═══════════════════════════════════════════════════════════════

-- Vitamina D + Estatinas (efeito benéfico)
INSERT INTO supplement_drug_interactions (
  supplement_id, medication_id,
  interaction_type, severity, description, clinical_effects, recommendations
) VALUES (
  (SELECT id FROM supplement_library WHERE supplement_code = 'SUP_VIT_D3'),
  (SELECT id FROM medication_library WHERE medication_code = 'MED_ATOR'),
  'potencializacao',
  'leve',
  'Vitamina D pode ajudar a reduzir mialgias causadas por estatinas',
  'Potencial redução dos efeitos colaterais musculares das estatinas',
  'Combinação geralmente benéfica. Monitorar níveis de vitamina D.'
);

-- Ferro + Levotiroxina (redução de absorção)
INSERT INTO supplement_drug_interactions (
  supplement_id, medication_id,
  interaction_type, severity, description, clinical_effects, recommendations
) VALUES (
  (SELECT id FROM supplement_library WHERE supplement_code = 'SUP_IRON'),
  (SELECT id FROM medication_library WHERE medication_code = 'MED_LEVO'),
  'reducao_absorcao',
  'moderada',
  'Ferro reduz significativamente a absorção de levotiroxina',
  'Redução da eficácia do hormônio tireoidiano, podendo levar a sintomas de hipotireoidismo',
  'CRÍTICO: Espaçar em no mínimo 4 horas. Idealmente, tomar levotiroxina em jejum pela manhã e ferro à tarde/noite.'
);

-- Magnésio + Metformina (interação benéfica)
INSERT INTO supplement_drug_interactions (
  supplement_id, medication_id,
  interaction_type, severity, description, clinical_effects, recommendations
) VALUES (
  (SELECT id FROM supplement_library WHERE supplement_code = 'SUP_MAG'),
  (SELECT id FROM medication_library WHERE medication_code = 'MED_METF'),
  'potencializacao',
  'leve',
  'Metformina pode reduzir níveis de magnésio; suplementação é benéfica',
  'Melhora do controle glicêmico e prevenção de deficiência de magnésio',
  'Suplementação de magnésio recomendada em usuários de longo prazo de metformina.'
);

-- Ômega 3 + Anticoagulantes
INSERT INTO supplement_drug_interactions (
  supplement_id, medication_id,
  interaction_type, severity, description, clinical_effects, recommendations
) VALUES (
  (SELECT id FROM supplement_library WHERE supplement_code = 'SUP_OMEGA3'),
  (SELECT id FROM medication_library WHERE medication_code = 'MED_ATOR'),
  'sinergica',
  'leve',
  'Ômega 3 e estatinas têm efeito sinérgico na redução de triglicerídeos',
  'Melhora adicional do perfil lipídico',
  'Combinação benéfica. Monitorar perfil lipídico.'
);
