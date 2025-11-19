-- Tabela para rastrear uso de AI providers
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  function_name TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('lovable_ai', 'gemini_api', 'fallback')),
  model TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  response_time_ms INTEGER,
  estimated_cost_usd DECIMAL(10, 6),
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index para queries rápidas
CREATE INDEX idx_ai_usage_logs_user_id ON public.ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_logs_provider ON public.ai_usage_logs(provider);

-- RLS Policies
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI usage logs"
  ON public.ai_usage_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert AI usage logs"
  ON public.ai_usage_logs
  FOR INSERT
  WITH CHECK (true);

-- Tabela para configurações de alertas de AI
CREATE TABLE IF NOT EXISTS public.ai_usage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  fallback_threshold INTEGER NOT NULL DEFAULT 5, -- Alertar após X usos de fallback
  daily_cost_threshold DECIMAL(10, 2) DEFAULT 10.00,
  enable_fallback_alerts BOOLEAN NOT NULL DEFAULT true,
  enable_cost_alerts BOOLEAN NOT NULL DEFAULT true,
  last_alert_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.ai_usage_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own alert settings"
  ON public.ai_usage_alerts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alert settings"
  ON public.ai_usage_alerts
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alert settings"
  ON public.ai_usage_alerts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Função para obter estatísticas de uso de AI
CREATE OR REPLACE FUNCTION public.get_ai_usage_stats(_user_id UUID, _days INTEGER DEFAULT 30)
RETURNS TABLE(
  total_requests BIGINT,
  lovable_ai_requests BIGINT,
  gemini_api_requests BIGINT,
  fallback_requests BIGINT,
  success_rate DECIMAL(5, 2),
  total_cost_usd DECIMAL(10, 2),
  avg_response_time_ms INTEGER,
  daily_stats JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH daily_data AS (
    SELECT 
      DATE(created_at) as day,
      COUNT(*) as requests,
      SUM(CASE WHEN provider = 'lovable_ai' THEN 1 ELSE 0 END) as lovable_count,
      SUM(CASE WHEN provider = 'gemini_api' THEN 1 ELSE 0 END) as gemini_count,
      SUM(CASE WHEN provider = 'fallback' THEN 1 ELSE 0 END) as fallback_count,
      SUM(COALESCE(estimated_cost_usd, 0)) as day_cost
    FROM ai_usage_logs
    WHERE user_id = _user_id
      AND created_at >= NOW() - (_days || ' days')::INTERVAL
    GROUP BY DATE(created_at)
    ORDER BY day DESC
  )
  SELECT 
    COUNT(*)::BIGINT as total_requests,
    SUM(CASE WHEN provider = 'lovable_ai' THEN 1 ELSE 0 END)::BIGINT as lovable_ai_requests,
    SUM(CASE WHEN provider = 'gemini_api' THEN 1 ELSE 0 END)::BIGINT as gemini_api_requests,
    SUM(CASE WHEN provider = 'fallback' THEN 1 ELSE 0 END)::BIGINT as fallback_requests,
    ROUND((SUM(CASE WHEN success THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(*), 0) * 100), 2) as success_rate,
    ROUND(SUM(COALESCE(estimated_cost_usd, 0))::DECIMAL, 2) as total_cost_usd,
    ROUND(AVG(response_time_ms))::INTEGER as avg_response_time_ms,
    (SELECT jsonb_agg(jsonb_build_object(
      'day', day,
      'requests', requests,
      'lovable_count', lovable_count,
      'gemini_count', gemini_count,
      'fallback_count', fallback_count,
      'cost', day_cost
    )) FROM daily_data) as daily_stats
  FROM ai_usage_logs
  WHERE user_id = _user_id
    AND created_at >= NOW() - (_days || ' days')::INTERVAL;
END;
$$;

-- Trigger para updated_at
CREATE TRIGGER update_ai_usage_alerts_updated_at
  BEFORE UPDATE ON public.ai_usage_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();