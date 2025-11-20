-- Criar tabela para configuração de circuit breaker
CREATE TABLE IF NOT EXISTS public.ai_circuit_breaker_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  failure_threshold INTEGER NOT NULL DEFAULT 5,
  failure_window_minutes INTEGER NOT NULL DEFAULT 5,
  cooldown_seconds INTEGER NOT NULL DEFAULT 60,
  alert_threshold_percentage NUMERIC NOT NULL DEFAULT 30.0,
  enable_notifications BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Criar tabela para rastrear estado do circuit breaker
CREATE TABLE IF NOT EXISTS public.ai_circuit_breaker_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL DEFAULT 'closed' CHECK (state IN ('closed', 'open', 'half_open')),
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir configuração padrão
INSERT INTO public.ai_circuit_breaker_config (id)
VALUES ('00000000-0000-0000-0000-000000000000')
ON CONFLICT DO NOTHING;

-- Função para obter taxa de falhas recente
CREATE OR REPLACE FUNCTION public.get_ai_failure_rate(
  _function_name TEXT DEFAULT NULL,
  _minutes INTEGER DEFAULT 60
)
RETURNS TABLE(
  function_name TEXT,
  total_requests BIGINT,
  failed_requests BIGINT,
  failure_rate NUMERIC,
  last_failure_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.function_name,
    COUNT(*)::BIGINT as total_requests,
    SUM(CASE WHEN NOT l.success THEN 1 ELSE 0 END)::BIGINT as failed_requests,
    CASE 
      WHEN COUNT(*) > 0 
      THEN ROUND((SUM(CASE WHEN NOT l.success THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)) * 100, 2)
      ELSE 0
    END as failure_rate,
    MAX(CASE WHEN NOT l.success THEN l.created_at ELSE NULL END) as last_failure_at
  FROM public.ai_usage_logs l
  WHERE l.created_at >= NOW() - (_minutes || ' minutes')::INTERVAL
    AND (_function_name IS NULL OR l.function_name = _function_name)
  GROUP BY l.function_name
  HAVING SUM(CASE WHEN NOT l.success THEN 1 ELSE 0 END) > 0
  ORDER BY failure_rate DESC;
END;
$$;

-- Função para verificar se circuit breaker deve alertar
CREATE OR REPLACE FUNCTION public.check_ai_failure_alert()
RETURNS TABLE(
  should_alert BOOLEAN,
  function_name TEXT,
  failure_rate NUMERIC,
  total_failures BIGINT,
  threshold_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config RECORD;
BEGIN
  -- Obter configuração
  SELECT * INTO v_config 
  FROM public.ai_circuit_breaker_config 
  LIMIT 1;
  
  IF v_config IS NULL OR NOT v_config.enable_notifications THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    (fr.failure_rate >= v_config.alert_threshold_percentage) as should_alert,
    fr.function_name,
    fr.failure_rate,
    fr.failed_requests as total_failures,
    v_config.alert_threshold_percentage as threshold_percentage
  FROM public.get_ai_failure_rate(NULL, v_config.failure_window_minutes) fr
  WHERE fr.failure_rate >= v_config.alert_threshold_percentage;
END;
$$;

-- Função para registrar estado do circuit breaker
CREATE OR REPLACE FUNCTION public.record_circuit_breaker_state(
  _function_name TEXT,
  _new_state TEXT,
  _failure_count INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ai_circuit_breaker_state (
    function_name,
    state,
    failure_count,
    last_failure_at,
    opened_at,
    updated_at
  )
  VALUES (
    _function_name,
    _new_state,
    _failure_count,
    CASE WHEN _new_state = 'open' THEN NOW() ELSE NULL END,
    CASE WHEN _new_state = 'open' THEN NOW() ELSE NULL END,
    NOW()
  )
  ON CONFLICT (function_name)
  DO UPDATE SET
    state = EXCLUDED.state,
    failure_count = EXCLUDED.failure_count,
    last_failure_at = CASE 
      WHEN EXCLUDED.state = 'open' THEN NOW() 
      ELSE ai_circuit_breaker_state.last_failure_at 
    END,
    opened_at = CASE 
      WHEN EXCLUDED.state = 'open' THEN NOW() 
      ELSE ai_circuit_breaker_state.opened_at 
    END,
    last_success_at = CASE 
      WHEN EXCLUDED.state = 'closed' THEN NOW() 
      ELSE ai_circuit_breaker_state.last_success_at 
    END,
    updated_at = NOW();
END;
$$;

-- Trigger para atualizar updated_at
CREATE OR REPLACE TRIGGER update_ai_circuit_breaker_config_updated_at
  BEFORE UPDATE ON public.ai_circuit_breaker_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_ai_circuit_breaker_state_updated_at
  BEFORE UPDATE ON public.ai_circuit_breaker_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.ai_circuit_breaker_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_circuit_breaker_state ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas admins podem ver/editar
CREATE POLICY "Admins can view circuit breaker config"
  ON public.ai_circuit_breaker_config
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update circuit breaker config"
  ON public.ai_circuit_breaker_config
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view circuit breaker state"
  ON public.ai_circuit_breaker_state
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Comentários
COMMENT ON TABLE public.ai_circuit_breaker_config IS 'Configuração do circuit breaker para chamadas de IA';
COMMENT ON TABLE public.ai_circuit_breaker_state IS 'Estado atual do circuit breaker por função';
COMMENT ON FUNCTION public.get_ai_failure_rate IS 'Retorna taxa de falhas de IA por função';
COMMENT ON FUNCTION public.check_ai_failure_alert IS 'Verifica se deve alertar admins sobre falhas de IA';
COMMENT ON FUNCTION public.record_circuit_breaker_state IS 'Registra mudança de estado do circuit breaker';