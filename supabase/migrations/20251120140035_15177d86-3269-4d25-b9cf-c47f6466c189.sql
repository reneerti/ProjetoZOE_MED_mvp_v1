-- Tabela de configuração de webhooks para notificações externas
CREATE TABLE IF NOT EXISTS public.ai_webhook_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type TEXT NOT NULL CHECK (webhook_type IN ('slack', 'discord')),
  webhook_url TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  alert_types TEXT[] NOT NULL DEFAULT ARRAY['critical', 'threshold_breach', 'anomaly'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de recomendações de otimização geradas por ML
CREATE TABLE IF NOT EXISTS public.ai_optimization_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('model_change', 'prompt_optimization', 'caching', 'rate_limiting', 'circuit_breaker')),
  current_metric_value NUMERIC NOT NULL,
  recommended_action TEXT NOT NULL,
  expected_improvement TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'dismissed')),
  reasoning TEXT NOT NULL,
  estimated_cost_savings NUMERIC,
  estimated_performance_gain NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
);

-- RLS policies para ai_webhook_config
ALTER TABLE public.ai_webhook_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage webhook config"
  ON public.ai_webhook_config
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies para ai_optimization_recommendations
ALTER TABLE public.ai_optimization_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view recommendations"
  ON public.ai_optimization_recommendations
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert recommendations"
  ON public.ai_optimization_recommendations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update recommendations"
  ON public.ai_optimization_recommendations
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Função para gerar recomendações de otimização baseadas em ML
CREATE OR REPLACE FUNCTION generate_ai_optimization_recommendations()
RETURNS TABLE(
  function_name TEXT,
  recommendation_type TEXT,
  current_metric_value NUMERIC,
  recommended_action TEXT,
  expected_improvement TEXT,
  priority TEXT,
  reasoning TEXT,
  estimated_cost_savings NUMERIC,
  estimated_performance_gain NUMERIC
) LANGUAGE plpgsql AS $$
BEGIN
  -- Recomendação 1: Funções com custo alto devem considerar mudança de modelo
  RETURN QUERY
  SELECT 
    l.function_name,
    'model_change'::TEXT as recommendation_type,
    AVG(l.estimated_cost_usd)::NUMERIC as current_metric_value,
    'Considere mudar de google/gemini-2.5-pro para google/gemini-2.5-flash para reduzir custos'::TEXT as recommended_action,
    'Redução estimada de 60% nos custos mantendo 90% da qualidade'::TEXT as expected_improvement,
    CASE 
      WHEN AVG(l.estimated_cost_usd) > 0.05 THEN 'critical'
      WHEN AVG(l.estimated_cost_usd) > 0.02 THEN 'high'
      ELSE 'medium'
    END::TEXT as priority,
    'Função apresenta custo médio por requisição acima do esperado. Modelos mais leves podem manter qualidade adequada.'::TEXT as reasoning,
    (AVG(l.estimated_cost_usd) * 0.6 * COUNT(*))::NUMERIC as estimated_cost_savings,
    NULL::NUMERIC as estimated_performance_gain
  FROM ai_usage_logs l
  WHERE l.created_at > now() - INTERVAL '7 days'
    AND l.provider = 'lovable_ai'
    AND l.success = true
  GROUP BY l.function_name
  HAVING AVG(l.estimated_cost_usd) > 0.01;

  -- Recomendação 2: Funções com tempo de resposta alto devem otimizar prompts
  RETURN QUERY
  SELECT 
    l.function_name,
    'prompt_optimization'::TEXT as recommendation_type,
    AVG(l.response_time_ms)::NUMERIC as current_metric_value,
    'Simplifique o prompt ou reduza o tamanho do contexto para melhorar tempo de resposta'::TEXT as recommended_action,
    'Redução estimada de 40% no tempo de resposta'::TEXT as expected_improvement,
    CASE 
      WHEN AVG(l.response_time_ms) > 15000 THEN 'high'
      WHEN AVG(l.response_time_ms) > 10000 THEN 'medium'
      ELSE 'low'
    END::TEXT as priority,
    'Tempo de resposta médio está acima do ideal. Prompts mais concisos podem acelerar processamento.'::TEXT as reasoning,
    NULL::NUMERIC as estimated_cost_savings,
    40::NUMERIC as estimated_performance_gain
  FROM ai_usage_logs l
  WHERE l.created_at > now() - INTERVAL '7 days'
    AND l.success = true
    AND l.response_time_ms IS NOT NULL
  GROUP BY l.function_name
  HAVING AVG(l.response_time_ms) > 8000;

  -- Recomendação 3: Funções com muitas requisições similares devem implementar cache
  RETURN QUERY
  SELECT 
    l.function_name,
    'caching'::TEXT as recommendation_type,
    COUNT(*)::NUMERIC as current_metric_value,
    'Implemente cache de respostas para requisições similares para reduzir chamadas de API'::TEXT as recommended_action,
    'Redução estimada de 50% nas chamadas de API e custos'::TEXT as expected_improvement,
    'high'::TEXT as priority,
    'Função recebe alto volume de requisições. Cache pode reduzir significativamente custos e tempo de resposta.'::TEXT as reasoning,
    (AVG(l.estimated_cost_usd) * COUNT(*) * 0.5)::NUMERIC as estimated_cost_savings,
    50::NUMERIC as estimated_performance_gain
  FROM ai_usage_logs l
  WHERE l.created_at > now() - INTERVAL '7 days'
    AND l.success = true
  GROUP BY l.function_name
  HAVING COUNT(*) > 100;

  -- Recomendação 4: Funções com alta taxa de falha devem ajustar circuit breaker
  RETURN QUERY
  SELECT 
    l.function_name,
    'circuit_breaker'::TEXT as recommendation_type,
    (COUNT(*) FILTER (WHERE NOT l.success) * 100.0 / COUNT(*))::NUMERIC as current_metric_value,
    'Ajuste os parâmetros do circuit breaker para proteger melhor contra falhas em cascata'::TEXT as recommended_action,
    'Melhoria na resiliência e redução de falhas consecutivas'::TEXT as expected_improvement,
    CASE 
      WHEN (COUNT(*) FILTER (WHERE NOT l.success) * 100.0 / COUNT(*)) > 10 THEN 'critical'
      WHEN (COUNT(*) FILTER (WHERE NOT l.success) * 100.0 / COUNT(*)) > 5 THEN 'high'
      ELSE 'medium'
    END::TEXT as priority,
    'Taxa de falha está elevada. Circuit breaker mais agressivo pode prevenir falhas em cascata.'::TEXT as reasoning,
    NULL::NUMERIC as estimated_cost_savings,
    NULL::NUMERIC as estimated_performance_gain
  FROM ai_usage_logs l
  WHERE l.created_at > now() - INTERVAL '7 days'
  GROUP BY l.function_name
  HAVING COUNT(*) > 10
    AND (COUNT(*) FILTER (WHERE NOT l.success) * 100.0 / COUNT(*)) > 3;
END;
$$;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_ai_webhook_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_webhook_config_updated_at
  BEFORE UPDATE ON public.ai_webhook_config
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_webhook_config_updated_at();