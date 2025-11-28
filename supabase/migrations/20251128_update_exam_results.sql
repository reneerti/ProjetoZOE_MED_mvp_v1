-- ═══════════════════════════════════════════════════════════════
-- Atualização da tabela exam_results
-- Adiciona vínculos com a biblioteca de exames
-- ═══════════════════════════════════════════════════════════════

-- Adicionar colunas para vincular com a biblioteca de exames
ALTER TABLE exam_results
  ADD COLUMN IF NOT EXISTS parameter_code TEXT,
  ADD COLUMN IF NOT EXISTS exam_library_parameter_id UUID REFERENCES exam_library_parameters(id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_exam_results_parameter_code
  ON exam_results(parameter_code);

CREATE INDEX IF NOT EXISTS idx_exam_results_library_param
  ON exam_results(exam_library_parameter_id);

-- Comentários
COMMENT ON COLUMN exam_results.parameter_code IS 'Código do parâmetro da biblioteca (ex: HEM_RBC, LIP_COL)';
COMMENT ON COLUMN exam_results.exam_library_parameter_id IS 'Referência ao parâmetro na biblioteca de exames';

-- ═══════════════════════════════════════════════════════════════
-- Adicionar coluna exam_image_id em identified_diagnoses
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE identified_diagnoses
  ADD COLUMN IF NOT EXISTS exam_image_id UUID REFERENCES exam_images(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_identified_diagnoses_exam_image
  ON identified_diagnoses(exam_image_id);

COMMENT ON COLUMN identified_diagnoses.exam_image_id IS 'Exame que gerou o diagnóstico';
