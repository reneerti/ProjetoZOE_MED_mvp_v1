-- ═══════════════════════════════════════════════════════════════
-- Rastreamento de Uso de APIs
-- Contador de requisições e custos por API
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Qual API foi usada
  configuration_id UUID REFERENCES api_configurations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  provider TEXT NOT NULL,

  -- Contexto da requisição
  user_id UUID REFERENCES auth.users(id),
  function_name TEXT, -- Qual edge function chamou
  operation TEXT, -- 'ocr', 'analyze', 'convert_pdf', etc

  -- Métricas
  success BOOLEAN NOT NULL,
  response_time_ms INTEGER,
  tokens_used INTEGER,

  -- Custo estimado (em USD)
  estimated_cost_usd DECIMAL(10, 6) DEFAULT 0,

  -- Erro (se houver)
  error_message TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX idx_api_usage_config ON api_usage_logs(configuration_id);
CREATE INDEX idx_api_usage_provider ON api_usage_logs(provider);
CREATE INDEX idx_api_usage_date ON api_usage_logs(created_at DESC);
CREATE INDEX idx_api_usage_user ON api_usage_logs(user_id);
CREATE INDEX idx_api_usage_success ON api_usage_logs(success);

-- Particionamento por mês (para performance)
-- CREATE INDEX idx_api_usage_month ON api_usage_logs(DATE_TRUNC('month', created_at));

-- RLS (apenas admins)
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view API usage logs"
  ON api_usage_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- View Agregada de Uso por Provedor
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW api_usage_summary AS
SELECT
  configuration_id,
  category,
  provider,
  DATE_TRUNC('day', created_at) AS usage_date,

  -- Contadores
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE success = true) AS successful_requests,
  COUNT(*) FILTER (WHERE success = false) AS failed_requests,

  -- Métricas de performance
  AVG(response_time_ms) FILTER (WHERE success = true) AS avg_response_time_ms,
  MAX(response_time_ms) FILTER (WHERE success = true) AS max_response_time_ms,
  MIN(response_time_ms) FILTER (WHERE success = true) AS min_response_time_ms,

  -- Tokens e custos
  SUM(tokens_used) AS total_tokens,
  SUM(estimated_cost_usd) AS total_cost_usd,

  -- Taxa de sucesso
  ROUND(
    (COUNT(*) FILTER (WHERE success = true)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS success_rate_percent

FROM api_usage_logs
GROUP BY configuration_id, category, provider, DATE_TRUNC('day', created_at);

-- RLS para a view
ALTER VIEW api_usage_summary SET (security_invoker = on);

-- ═══════════════════════════════════════════════════════════════
-- View de Custos Mensais
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW api_monthly_costs AS
SELECT
  DATE_TRUNC('month', created_at) AS month,
  category,
  provider,

  COUNT(*) AS total_requests,
  SUM(tokens_used) AS total_tokens,
  SUM(estimated_cost_usd) AS total_cost_usd,

  -- Estimativa de custo médio por requisição
  AVG(estimated_cost_usd) AS avg_cost_per_request

FROM api_usage_logs
WHERE success = true
GROUP BY DATE_TRUNC('month', created_at), category, provider
ORDER BY month DESC, total_cost_usd DESC;

ALTER VIEW api_monthly_costs SET (security_invoker = on);

-- ═══════════════════════════════════════════════════════════════
-- Função para registrar uso de API
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION log_api_usage(
  p_configuration_id UUID,
  p_category TEXT,
  p_provider TEXT,
  p_user_id UUID,
  p_function_name TEXT,
  p_operation TEXT,
  p_success BOOLEAN,
  p_response_time_ms INTEGER,
  p_tokens_used INTEGER DEFAULT NULL,
  p_estimated_cost_usd DECIMAL DEFAULT 0,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO api_usage_logs (
    configuration_id,
    category,
    provider,
    user_id,
    function_name,
    operation,
    success,
    response_time_ms,
    tokens_used,
    estimated_cost_usd,
    error_message
  ) VALUES (
    p_configuration_id,
    p_category,
    p_provider,
    p_user_id,
    p_function_name,
    p_operation,
    p_success,
    p_response_time_ms,
    p_tokens_used,
    p_estimated_cost_usd,
    p_error_message
  )
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- Função para obter estatísticas de uso
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_api_usage_stats(
  p_days INTEGER DEFAULT 30,
  p_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  provider TEXT,
  total_requests BIGINT,
  successful_requests BIGINT,
  failed_requests BIGINT,
  success_rate NUMERIC,
  total_tokens BIGINT,
  total_cost_usd NUMERIC,
  avg_response_time_ms NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.provider,
    COUNT(*) AS total_requests,
    COUNT(*) FILTER (WHERE l.success = true) AS successful_requests,
    COUNT(*) FILTER (WHERE l.success = false) AS failed_requests,
    ROUND(
      (COUNT(*) FILTER (WHERE l.success = true)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS success_rate,
    COALESCE(SUM(l.tokens_used), 0) AS total_tokens,
    COALESCE(SUM(l.estimated_cost_usd), 0) AS total_cost_usd,
    ROUND(AVG(l.response_time_ms) FILTER (WHERE l.success = true), 2) AS avg_response_time_ms
  FROM api_usage_logs l
  WHERE
    l.created_at >= NOW() - (p_days || ' days')::INTERVAL
    AND (p_category IS NULL OR l.category = p_category)
  GROUP BY l.provider
  ORDER BY total_requests DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- Tabela de Limites de Custo
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS api_cost_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  category TEXT NOT NULL,
  provider TEXT,

  -- Limites
  daily_limit_usd DECIMAL(10, 2),
  monthly_limit_usd DECIMAL(10, 2),

  -- Alertas
  alert_threshold_percent INTEGER DEFAULT 80, -- Alertar quando atingir 80%

  -- Ações quando limite atingido
  auto_disable BOOLEAN DEFAULT false, -- Desabilitar automaticamente

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(category, provider)
);

ALTER TABLE api_cost_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cost limits"
  ON api_cost_limits
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- Função para verificar limites de custo
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION check_api_cost_limit(
  p_category TEXT,
  p_provider TEXT
)
RETURNS JSONB AS $$
DECLARE
  daily_spent DECIMAL;
  monthly_spent DECIMAL;
  limits RECORD;
  result JSONB;
BEGIN
  -- Buscar limites configurados
  SELECT * INTO limits
  FROM api_cost_limits
  WHERE category = p_category
    AND (provider = p_provider OR provider IS NULL)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'message', 'No limits configured'
    );
  END IF;

  -- Calcular gastos do dia
  SELECT COALESCE(SUM(estimated_cost_usd), 0) INTO daily_spent
  FROM api_usage_logs
  WHERE category = p_category
    AND provider = p_provider
    AND created_at >= CURRENT_DATE;

  -- Calcular gastos do mês
  SELECT COALESCE(SUM(estimated_cost_usd), 0) INTO monthly_spent
  FROM api_usage_logs
  WHERE category = p_category
    AND provider = p_provider
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE);

  -- Verificar limites
  IF limits.daily_limit_usd IS NOT NULL AND daily_spent >= limits.daily_limit_usd THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'message', 'Daily cost limit exceeded',
      'limit_type', 'daily',
      'spent', daily_spent,
      'limit', limits.daily_limit_usd
    );
  END IF;

  IF limits.monthly_limit_usd IS NOT NULL AND monthly_spent >= limits.monthly_limit_usd THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'message', 'Monthly cost limit exceeded',
      'limit_type', 'monthly',
      'spent', monthly_spent,
      'limit', limits.monthly_limit_usd
    );
  END IF;

  -- Verificar alertas
  IF limits.daily_limit_usd IS NOT NULL THEN
    IF (daily_spent / limits.daily_limit_usd * 100) >= limits.alert_threshold_percent THEN
      result := jsonb_build_object(
        'allowed', true,
        'warning', true,
        'message', 'Approaching daily cost limit',
        'spent', daily_spent,
        'limit', limits.daily_limit_usd,
        'percent', ROUND(daily_spent / limits.daily_limit_usd * 100, 2)
      );
      RETURN result;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'daily_spent', daily_spent,
    'monthly_spent', monthly_spent
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE api_usage_logs IS 'Registro de todas as chamadas de API para rastreamento de uso e custos';
COMMENT ON FUNCTION log_api_usage IS 'Registra o uso de uma API com métricas de performance e custo';
COMMENT ON FUNCTION get_api_usage_stats IS 'Retorna estatísticas agregadas de uso de APIs';
COMMENT ON FUNCTION check_api_cost_limit IS 'Verifica se os limites de custo foram atingidos';
