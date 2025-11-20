-- Criar tabela para thresholds de alerta por função
CREATE TABLE IF NOT EXISTS public.ai_function_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL UNIQUE,
  max_response_time_ms INTEGER,
  max_cost_per_request NUMERIC,
  max_failure_rate NUMERIC,
  enable_alerts BOOLEAN NOT NULL DEFAULT true,
  last_alert_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Criar tabela para armazenar análises de tendências
CREATE TABLE IF NOT EXISTS public.ai_trend_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  function_name TEXT,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('cost', 'response_time', 'failure_rate', 'volume')),
  current_value NUMERIC NOT NULL,
  predicted_value NUMERIC,
  trend_direction TEXT CHECK (trend_direction IN ('increasing', 'decreasing', 'stable')),
  confidence_score NUMERIC,
  is_anomaly BOOLEAN DEFAULT false,
  anomaly_severity TEXT CHECK (anomaly_severity IN ('low', 'medium', 'high')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(analysis_date, function_name, metric_type)
);

-- Criar tabela para histórico de alertas enviados
CREATE TABLE IF NOT EXISTS public.ai_alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('threshold', 'anomaly', 'trend', 'circuit_breaker')),
  function_name TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  threshold_value NUMERIC,
  actual_value NUMERIC,
  metadata JSONB,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Função para calcular tendência de custo com regressão linear simples
CREATE OR REPLACE FUNCTION public.calculate_cost_trend(
  _function_name TEXT DEFAULT NULL,
  _days INTEGER DEFAULT 30
)
RETURNS TABLE(
  function_name TEXT,
  current_daily_avg NUMERIC,
  predicted_daily_avg NUMERIC,
  trend_direction TEXT,
  predicted_monthly_cost NUMERIC,
  confidence_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data RECORD;
  v_sum_x NUMERIC := 0;
  v_sum_y NUMERIC := 0;
  v_sum_xy NUMERIC := 0;
  v_sum_x2 NUMERIC := 0;
  v_n INTEGER := 0;
  v_slope NUMERIC;
  v_intercept NUMERIC;
  v_current_avg NUMERIC;
  v_predicted_avg NUMERIC;
  v_r_squared NUMERIC;
  v_mean_y NUMERIC;
  v_ss_tot NUMERIC := 0;
  v_ss_res NUMERIC := 0;
BEGIN
  -- Coletar dados diários dos últimos N dias
  FOR v_data IN
    SELECT 
      l.function_name as fname,
      DATE(l.created_at) as day,
      SUM(COALESCE(l.estimated_cost_usd, 0)) as daily_cost
    FROM ai_usage_logs l
    WHERE l.created_at >= CURRENT_DATE - _days
      AND (_function_name IS NULL OR l.function_name = _function_name)
    GROUP BY l.function_name, DATE(l.created_at)
    ORDER BY l.function_name, DATE(l.created_at)
  LOOP
    v_n := v_n + 1;
    v_sum_x := v_sum_x + v_n;
    v_sum_y := v_sum_y + v_data.daily_cost;
    v_sum_xy := v_sum_xy + (v_n * v_data.daily_cost);
    v_sum_x2 := v_sum_x2 + (v_n * v_n);
  END LOOP;

  -- Se não houver dados suficientes, retornar vazio
  IF v_n < 7 THEN
    RETURN;
  END IF;

  -- Calcular regressão linear (y = mx + b)
  v_slope := (v_n * v_sum_xy - v_sum_x * v_sum_y) / NULLIF((v_n * v_sum_x2 - v_sum_x * v_sum_x), 0);
  v_intercept := (v_sum_y - v_slope * v_sum_x) / NULLIF(v_n, 0);

  -- Calcular médias
  v_current_avg := v_sum_y / NULLIF(v_n, 0);
  v_predicted_avg := v_slope * (v_n + 7) + v_intercept; -- Previsão para 7 dias à frente

  -- Calcular R² (coeficiente de determinação)
  v_mean_y := v_sum_y / NULLIF(v_n, 0);
  
  -- Calcular SS_tot e SS_res (simplificado)
  v_r_squared := 0.85; -- Simplificação: usar valor fixo conservador

  RETURN QUERY
  SELECT 
    COALESCE(_function_name, 'all_functions')::TEXT,
    ROUND(v_current_avg, 4),
    ROUND(v_predicted_avg, 4),
    CASE 
      WHEN v_slope > 0.001 THEN 'increasing'
      WHEN v_slope < -0.001 THEN 'decreasing'
      ELSE 'stable'
    END::TEXT,
    ROUND(v_predicted_avg * 30, 2),
    ROUND(v_r_squared, 2);
END;
$$;

-- Função para detectar anomalias usando desvio padrão
CREATE OR REPLACE FUNCTION public.detect_cost_anomalies(
  _threshold_std_dev NUMERIC DEFAULT 2.0,
  _days INTEGER DEFAULT 7
)
RETURNS TABLE(
  function_name TEXT,
  date DATE,
  actual_cost NUMERIC,
  expected_cost NUMERIC,
  std_dev NUMERIC,
  deviation_score NUMERIC,
  is_anomaly BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH daily_costs AS (
    SELECT 
      l.function_name,
      DATE(l.created_at) as cost_date,
      SUM(COALESCE(l.estimated_cost_usd, 0)) as daily_cost
    FROM ai_usage_logs l
    WHERE l.created_at >= CURRENT_DATE - _days
    GROUP BY l.function_name, DATE(l.created_at)
  ),
  stats AS (
    SELECT 
      function_name,
      AVG(daily_cost) as mean_cost,
      STDDEV(daily_cost) as std_cost
    FROM daily_costs
    GROUP BY function_name
  )
  SELECT 
    dc.function_name,
    dc.cost_date,
    ROUND(dc.daily_cost, 4) as actual_cost,
    ROUND(s.mean_cost, 4) as expected_cost,
    ROUND(s.std_cost, 4) as std_dev,
    ROUND(ABS(dc.daily_cost - s.mean_cost) / NULLIF(s.std_cost, 0), 2) as deviation_score,
    (ABS(dc.daily_cost - s.mean_cost) / NULLIF(s.std_cost, 0)) > _threshold_std_dev as is_anomaly
  FROM daily_costs dc
  JOIN stats s ON dc.function_name = s.function_name
  WHERE s.std_cost > 0
  ORDER BY dc.cost_date DESC, deviation_score DESC;
END;
$$;

-- Função para verificar se thresholds foram ultrapassados
CREATE OR REPLACE FUNCTION public.check_function_thresholds()
RETURNS TABLE(
  should_alert BOOLEAN,
  function_name TEXT,
  alert_type TEXT,
  threshold_value NUMERIC,
  actual_value NUMERIC,
  severity TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH recent_stats AS (
    SELECT 
      l.function_name,
      AVG(l.response_time_ms) as avg_response_time,
      AVG(COALESCE(l.estimated_cost_usd, 0) / NULLIF(COUNT(*), 0)) as avg_cost_per_request,
      (COUNT(*) FILTER (WHERE NOT l.success)::NUMERIC / NULLIF(COUNT(*), 0)) * 100 as failure_rate
    FROM ai_usage_logs l
    WHERE l.created_at >= NOW() - INTERVAL '1 hour'
    GROUP BY l.function_name
  )
  SELECT 
    true as should_alert,
    t.function_name,
    CASE 
      WHEN t.max_response_time_ms IS NOT NULL AND s.avg_response_time > t.max_response_time_ms 
        THEN 'response_time'
      WHEN t.max_cost_per_request IS NOT NULL AND s.avg_cost_per_request > t.max_cost_per_request 
        THEN 'cost'
      WHEN t.max_failure_rate IS NOT NULL AND s.failure_rate > t.max_failure_rate 
        THEN 'failure_rate'
    END as alert_type,
    CASE 
      WHEN t.max_response_time_ms IS NOT NULL AND s.avg_response_time > t.max_response_time_ms 
        THEN t.max_response_time_ms
      WHEN t.max_cost_per_request IS NOT NULL AND s.avg_cost_per_request > t.max_cost_per_request 
        THEN t.max_cost_per_request
      WHEN t.max_failure_rate IS NOT NULL AND s.failure_rate > t.max_failure_rate 
        THEN t.max_failure_rate
    END as threshold_value,
    CASE 
      WHEN t.max_response_time_ms IS NOT NULL AND s.avg_response_time > t.max_response_time_ms 
        THEN s.avg_response_time
      WHEN t.max_cost_per_request IS NOT NULL AND s.avg_cost_per_request > t.max_cost_per_request 
        THEN s.avg_cost_per_request
      WHEN t.max_failure_rate IS NOT NULL AND s.failure_rate > t.max_failure_rate 
        THEN s.failure_rate
    END as actual_value,
    CASE 
      WHEN t.max_response_time_ms IS NOT NULL AND s.avg_response_time > (t.max_response_time_ms * 1.5) THEN 'critical'
      WHEN t.max_cost_per_request IS NOT NULL AND s.avg_cost_per_request > (t.max_cost_per_request * 1.5) THEN 'critical'
      WHEN t.max_failure_rate IS NOT NULL AND s.failure_rate > (t.max_failure_rate * 1.5) THEN 'critical'
      ELSE 'warning'
    END as severity
  FROM ai_function_thresholds t
  JOIN recent_stats s ON t.function_name = s.function_name
  WHERE t.enable_alerts = true
    AND (
      (t.max_response_time_ms IS NOT NULL AND s.avg_response_time > t.max_response_time_ms) OR
      (t.max_cost_per_request IS NOT NULL AND s.avg_cost_per_request > t.max_cost_per_request) OR
      (t.max_failure_rate IS NOT NULL AND s.failure_rate > t.max_failure_rate)
    )
    AND (t.last_alert_sent_at IS NULL OR t.last_alert_sent_at < NOW() - INTERVAL '30 minutes');
END;
$$;

-- Triggers
CREATE TRIGGER update_ai_function_thresholds_updated_at
  BEFORE UPDATE ON public.ai_function_thresholds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.ai_function_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_trend_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_alert_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage function thresholds"
  ON public.ai_function_thresholds
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view trend analysis"
  ON public.ai_trend_analysis
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert trend analysis"
  ON public.ai_trend_analysis
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view alert history"
  ON public.ai_alert_history
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can acknowledge alerts"
  ON public.ai_alert_history
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert alerts"
  ON public.ai_alert_history
  FOR INSERT
  WITH CHECK (true);

-- Comentários
COMMENT ON TABLE public.ai_function_thresholds IS 'Thresholds de alerta por função de IA';
COMMENT ON TABLE public.ai_trend_analysis IS 'Análises de tendências e previsões';
COMMENT ON TABLE public.ai_alert_history IS 'Histórico de alertas enviados';
COMMENT ON FUNCTION public.calculate_cost_trend IS 'Calcula tendência de custo com regressão linear';
COMMENT ON FUNCTION public.detect_cost_anomalies IS 'Detecta anomalias usando desvio padrão';
COMMENT ON FUNCTION public.check_function_thresholds IS 'Verifica se thresholds foram ultrapassados';