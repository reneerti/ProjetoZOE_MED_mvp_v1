-- ═══════════════════════════════════════════════════════════════
-- Tabela de Configurações de APIs
-- Armazena API keys e configurações de serviços de forma criptografada
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS api_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Categoria e provedor
  category TEXT NOT NULL, -- 'ocr', 'pdf', 'ai', 'database'
  provider TEXT NOT NULL, -- 'ocr_space', 'groq', 'postgres', etc
  priority INTEGER NOT NULL DEFAULT 1, -- 1 = principal, 2 = redundância

  -- Configurações (criptografadas)
  config_data JSONB NOT NULL, -- {api_key, endpoint, etc}

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMPTZ,
  last_test_status TEXT, -- 'success', 'failed'
  last_test_message TEXT,

  -- Metadados
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(category, provider)
);

-- Índices
CREATE INDEX idx_api_configurations_category ON api_configurations(category);
CREATE INDEX idx_api_configurations_active ON api_configurations(is_active);
CREATE INDEX idx_api_configurations_priority ON api_configurations(category, priority);

-- RLS (apenas admins podem acessar)
ALTER TABLE api_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage API configurations"
  ON api_configurations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- Histórico de Alterações de Configurações
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS api_configuration_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id UUID REFERENCES api_configurations(id) ON DELETE CASCADE,

  -- O que mudou
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'tested'
  changes JSONB, -- Registro do que foi alterado

  -- Resultado (para testes)
  test_result JSONB,

  -- Quem fez
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_config_history_config ON api_configuration_history(configuration_id);
CREATE INDEX idx_api_config_history_date ON api_configuration_history(changed_at DESC);

-- RLS
ALTER TABLE api_configuration_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view configuration history"
  ON api_configuration_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- Função para atualizar updated_at
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_api_configuration_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_api_configuration_timestamp
  BEFORE UPDATE ON api_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_api_configuration_timestamp();

-- ═══════════════════════════════════════════════════════════════
-- Seed inicial com configurações padrão
-- ═══════════════════════════════════════════════════════════════

INSERT INTO api_configurations (category, provider, priority, config_data, is_active) VALUES
  -- OCR
  ('ocr', 'ocr_space', 1, '{"api_key": null, "endpoint": "https://api.ocr.space/parse/image", "engine": 2}'::jsonb, false),
  ('ocr', 'google_vision', 2, '{"api_key": null, "endpoint": "https://vision.googleapis.com/v1/images:annotate"}'::jsonb, false),
  ('ocr', 'azure_vision', 3, '{"api_key": null, "endpoint": null}'::jsonb, false),

  -- PDF
  ('pdf', 'pdf_co', 1, '{"api_key": null, "endpoint": "https://api.pdf.co/v1/pdf/convert/to/png"}'::jsonb, false),
  ('pdf', 'convert_api', 2, '{"api_key": null, "endpoint": "https://v2.convertapi.com/convert/pdf/to/png"}'::jsonb, false),
  ('pdf', 'cloudconvert', 3, '{"api_key": null, "endpoint": "https://api.cloudconvert.com/v2/jobs"}'::jsonb, false),

  -- IA
  ('ai', 'groq', 1, '{"api_key": null, "endpoint": "https://api.groq.com/openai/v1/chat/completions", "model": "llama-3.3-70b-versatile"}'::jsonb, false),
  ('ai', 'google_ai', 2, '{"api_key": null, "endpoint": "https://generativelanguage.googleapis.com/v1beta/models", "model": "gemini-2.0-flash-exp"}'::jsonb, false),
  ('ai', 'together_ai', 3, '{"api_key": null, "endpoint": "https://api.together.xyz/v1/chat/completions", "model": "meta-llama/Llama-3.3-70B-Instruct-Turbo"}'::jsonb, false),
  ('ai', 'openrouter', 4, '{"api_key": null, "endpoint": "https://openrouter.ai/api/v1/chat/completions", "model": "google/gemini-2.0-flash-exp:free"}'::jsonb, false),
  ('ai', 'huggingface', 5, '{"api_key": null, "endpoint": "https://api-inference.huggingface.co/models", "model": "microsoft/Phi-3-mini-4k-instruct"}'::jsonb, false),

  -- Banco de Dados Externo (opcional)
  ('database', 'postgres', 1, '{"host": null, "port": 5432, "database": null, "username": null, "password": null, "ssl": true}'::jsonb, false)
ON CONFLICT (category, provider) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- Função helper para buscar configuração ativa
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_active_api_config(p_category TEXT, p_priority INTEGER DEFAULT 1)
RETURNS JSONB AS $$
DECLARE
  config JSONB;
BEGIN
  SELECT config_data INTO config
  FROM api_configurations
  WHERE category = p_category
    AND is_active = true
    AND priority = p_priority
  ORDER BY priority ASC
  LIMIT 1;

  RETURN config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE api_configurations IS 'Configurações centralizadas de APIs e serviços externos';
COMMENT ON FUNCTION get_active_api_config IS 'Retorna configuração ativa para uma categoria (OCR, IA, etc)';
