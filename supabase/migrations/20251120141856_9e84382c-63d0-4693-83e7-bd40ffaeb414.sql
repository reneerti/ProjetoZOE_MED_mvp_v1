-- Adicionar coluna risk_level à tabela ai_optimization_recommendations
ALTER TABLE public.ai_optimization_recommendations 
ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high'));

-- Dropar a função existente
DROP FUNCTION IF EXISTS public.generate_ai_optimization_recommendations();

-- Recriar a função de geração de recomendações com risk_level
CREATE FUNCTION public.generate_ai_optimization_recommendations()
RETURNS TABLE (
  function_name TEXT,
  recommendation_type TEXT,
  current_metric_value NUMERIC,
  recommended_action TEXT,
  expected_improvement TEXT,
  priority TEXT,
  reasoning TEXT,
  estimated_cost_savings NUMERIC,
  estimated_performance_gain NUMERIC,
  risk_level TEXT
) LANGUAGE plpgsql AS $$
BEGIN
  -- Recomendação 1: Funções com custo alto devem considerar mudança de modelo (RISCO MÉDIO)
  RETURN QUERY
  SELECT 
    l.function_name,
    'model_change'::TEXT,
    AVG(l.estimated_cost_usd)::NUMERIC,
    'Considere mudar de google/gemini-2.5-pro para google/gemini-2.5-flash para reduzir custos'::TEXT,
    'Redução estimada de 60% nos custos mantendo 90% da qualidade'::TEXT,
    CASE 
      WHEN AVG(l.estimated_cost_usd) > 0.05 THEN 'critical'
      WHEN AVG(l.estimated_cost_usd) > 0.02 THEN 'high'
      ELSE 'medium'
    END::TEXT,
    'Função apresenta custo médio por requisição acima do esperado. Modelos mais leves podem manter qualidade adequada.'::TEXT,
    (AVG(l.estimated_cost_usd) * 0.6 * COUNT(*))::NUMERIC,
    NULL::NUMERIC,
    'medium'::TEXT
  FROM ai_usage_logs l
  WHERE l.created_at > now() - INTERVAL '7 days'
    AND l.provider = 'lovable_ai'
    AND l.success = true
  GROUP BY l.function_name
  HAVING AVG(l.estimated_cost_usd) > 0.01;

  -- Recomendação 2: Funções com tempo de resposta alto (RISCO BAIXO)
  RETURN QUERY
  SELECT 
    l.function_name,
    'prompt_optimization'::TEXT,
    AVG(l.response_time_ms)::NUMERIC,
    'Simplifique o prompt ou reduza o tamanho do contexto para melhorar tempo de resposta'::TEXT,
    'Redução estimada de 40% no tempo de resposta'::TEXT,
    CASE 
      WHEN AVG(l.response_time_ms) > 15000 THEN 'high'
      WHEN AVG(l.response_time_ms) > 10000 THEN 'medium'
      ELSE 'low'
    END::TEXT,
    'Tempo de resposta médio está acima do ideal. Prompts mais concisos podem acelerar processamento.'::TEXT,
    NULL::NUMERIC,
    40::NUMERIC,
    'low'::TEXT
  FROM ai_usage_logs l
  WHERE l.created_at > now() - INTERVAL '7 days'
    AND l.success = true
    AND l.response_time_ms IS NOT NULL
  GROUP BY l.function_name
  HAVING AVG(l.response_time_ms) > 8000;

  -- Recomendação 3: Implementar cache (RISCO BAIXO)
  RETURN QUERY
  SELECT 
    l.function_name,
    'caching'::TEXT,
    COUNT(*)::NUMERIC,
    'Implemente cache de respostas para requisições similares para reduzir chamadas de API'::TEXT,
    'Redução estimada de 50% nas chamadas de API e custos'::TEXT,
    'high'::TEXT,
    'Função recebe alto volume de requisições. Cache pode reduzir significativamente custos e tempo de resposta.'::TEXT,
    (AVG(l.estimated_cost_usd) * COUNT(*) * 0.5)::NUMERIC,
    50::NUMERIC,
    'low'::TEXT
  FROM ai_usage_logs l
  WHERE l.created_at > now() - INTERVAL '7 days'
    AND l.success = true
  GROUP BY l.function_name
  HAVING COUNT(*) > 100;

  -- Recomendação 4: Ajustar circuit breaker (RISCO ALTO)
  RETURN QUERY
  SELECT 
    l.function_name,
    'circuit_breaker'::TEXT,
    (COUNT(*) FILTER (WHERE NOT l.success) * 100.0 / COUNT(*))::NUMERIC,
    'Ajuste os parâmetros do circuit breaker para proteger melhor contra falhas em cascata'::TEXT,
    'Melhoria na resiliência e redução de falhas consecutivas'::TEXT,
    CASE 
      WHEN (COUNT(*) FILTER (WHERE NOT l.success) * 100.0 / COUNT(*)) > 10 THEN 'critical'
      WHEN (COUNT(*) FILTER (WHERE NOT l.success) * 100.0 / COUNT(*)) > 5 THEN 'high'
      ELSE 'medium'
    END::TEXT,
    'Taxa de falha está elevada. Circuit breaker mais agressivo pode prevenir falhas em cascata.'::TEXT,
    NULL::NUMERIC,
    NULL::NUMERIC,
    'high'::TEXT
  FROM ai_usage_logs l
  WHERE l.created_at > now() - INTERVAL '7 days'
  GROUP BY l.function_name
  HAVING COUNT(*) > 10
    AND (COUNT(*) FILTER (WHERE NOT l.success) * 100.0 / COUNT(*)) > 3;
END;
$$;