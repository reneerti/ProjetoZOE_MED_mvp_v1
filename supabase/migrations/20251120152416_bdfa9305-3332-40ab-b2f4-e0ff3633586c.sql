-- Criar tabela de parâmetros de referência clínica expandida
CREATE TABLE IF NOT EXISTS public.clinical_reference_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter_name TEXT NOT NULL,
  parameter_category TEXT NOT NULL, -- 'glicemia', 'lipidograma', 'hepatica', 'vitaminas', 'hemograma', etc
  reference_min NUMERIC,
  reference_max NUMERIC,
  critical_min NUMERIC,
  critical_max NUMERIC,
  unit TEXT,
  description TEXT,
  related_conditions TEXT[], -- condições relacionadas para agrupamento
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_clinical_params_name ON public.clinical_reference_parameters(parameter_name);
CREATE INDEX IF NOT EXISTS idx_clinical_params_category ON public.clinical_reference_parameters(parameter_category);

-- RLS Policies
ALTER TABLE public.clinical_reference_parameters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view clinical parameters"
  ON public.clinical_reference_parameters FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify clinical parameters"
  ON public.clinical_reference_parameters FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Popular com parâmetros básicos
INSERT INTO public.clinical_reference_parameters (parameter_name, parameter_category, reference_min, reference_max, critical_min, critical_max, unit, description, related_conditions) VALUES
-- Glicemia e Insulina
('Glicose em Jejum', 'glicemia', 70, 99, 50, 125, 'mg/dL', 'Glicose plasmática em jejum', ARRAY['diabetes', 'pre-diabetes', 'sindrome_metabolica']),
('Insulina Basal', 'glicemia', 2.6, 24.9, 1, 35, 'μUI/mL', 'Insulina em jejum', ARRAY['resistencia_insulina', 'sindrome_metabolica']),
('HOMA-IR', 'glicemia', 0, 2.7, 0, 5, '', 'Índice de resistência à insulina', ARRAY['resistencia_insulina', 'sindrome_metabolica', 'diabetes']),
('HbA1c', 'glicemia', 4, 5.6, 0, 8, '%', 'Hemoglobina glicada', ARRAY['diabetes', 'pre-diabetes']),

-- Lipidograma
('Colesterol Total', 'lipidograma', 0, 200, 0, 240, 'mg/dL', 'Colesterol total', ARRAY['dislipidemia', 'risco_cardiovascular']),
('HDL', 'lipidograma', 40, 999, 30, 999, 'mg/dL', 'HDL colesterol (bom)', ARRAY['dislipidemia', 'risco_cardiovascular']),
('LDL', 'lipidograma', 0, 130, 0, 160, 'mg/dL', 'LDL colesterol (ruim)', ARRAY['dislipidemia', 'risco_cardiovascular']),
('Triglicerídeos', 'lipidograma', 0, 150, 0, 200, 'mg/dL', 'Triglicerídeos', ARRAY['dislipidemia', 'sindrome_metabolica']),

-- Função Hepática
('TGO', 'hepatica', 0, 40, 0, 60, 'U/L', 'Transaminase oxalacética (AST)', ARRAY['esteatose_hepatica', 'hepatopatia']),
('TGP', 'hepatica', 0, 41, 0, 61, 'U/L', 'Transaminase pirúvica (ALT)', ARRAY['esteatose_hepatica', 'hepatopatia']),
('GGT', 'hepatica', 0, 50, 0, 70, 'U/L', 'Gama glutamil transferase', ARRAY['esteatose_hepatica', 'hepatopatia']),

-- Vitaminas
('Vitamina B12', 'vitaminas', 200, 900, 150, 1000, 'pg/mL', 'Vitamina B12 (cobalamina)', ARRAY['deficiencia_vitaminica', 'anemia']),
('Ácido Fólico', 'vitaminas', 3, 17, 2, 20, 'ng/mL', 'Ácido fólico (vitamina B9)', ARRAY['deficiencia_vitaminica', 'anemia']),
('Vitamina D', 'vitaminas', 30, 100, 20, 150, 'ng/mL', 'Vitamina D (25-hidroxi)', ARRAY['deficiencia_vitaminica', 'saude_ossea']),
('Vitamina C', 'vitaminas', 0.4, 2, 0.2, 3, 'mg/dL', 'Ácido ascórbico', ARRAY['deficiencia_vitaminica']),

-- Hemograma/Ferro
('Ferro Sérico', 'hemograma', 60, 150, 40, 180, 'μg/dL', 'Ferro no sangue', ARRAY['anemia', 'deficiencia_ferro']),
('Ferritina', 'hemograma', 30, 400, 15, 500, 'ng/mL', 'Reserva de ferro', ARRAY['anemia', 'deficiencia_ferro']),
('VCM', 'hemograma', 80, 100, 70, 110, 'fL', 'Volume corpuscular médio', ARRAY['anemia', 'microcitose']),
('HCM', 'hemograma', 27, 32, 24, 35, 'pg', 'Hemoglobina corpuscular média', ARRAY['anemia', 'microcitose']);

COMMENT ON TABLE public.clinical_reference_parameters IS 'Base de dados de parâmetros clínicos e laboratoriais com valores de referência para análise automatizada';