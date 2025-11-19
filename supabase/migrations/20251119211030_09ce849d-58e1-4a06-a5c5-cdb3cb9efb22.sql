-- Create AI response cache table for intelligent caching
CREATE TABLE IF NOT EXISTS public.ai_response_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL,
  function_name TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  response_data JSONB NOT NULL,
  provider TEXT NOT NULL,
  model TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast cache lookups
CREATE INDEX IF NOT EXISTS idx_ai_response_cache_key ON public.ai_response_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_response_cache_expires ON public.ai_response_cache(expires_at);

-- Create AI budget configuration table
CREATE TABLE IF NOT EXISTS public.ai_budget_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  monthly_limit_usd NUMERIC NOT NULL DEFAULT 100.00,
  alert_threshold_percentage INTEGER NOT NULL DEFAULT 80,
  enable_budget_alerts BOOLEAN NOT NULL DEFAULT true,
  current_month_spending NUMERIC NOT NULL DEFAULT 0,
  budget_period_start DATE NOT NULL DEFAULT DATE_TRUNC('month', CURRENT_DATE),
  budget_period_end DATE NOT NULL DEFAULT (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS policies for ai_response_cache (system-only access)
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage cache"
ON public.ai_response_cache
FOR ALL
USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));

-- RLS policies for ai_budget_config (admin-only access)
ALTER TABLE public.ai_budget_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view budget config"
ON public.ai_budget_config
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage budget config"
ON public.ai_budget_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_response_cache
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get budget status with projections
CREATE OR REPLACE FUNCTION public.get_budget_status()
RETURNS TABLE (
  monthly_limit NUMERIC,
  current_spending NUMERIC,
  percentage_used NUMERIC,
  remaining_budget NUMERIC,
  projected_monthly_spending NUMERIC,
  days_in_month INTEGER,
  days_elapsed INTEGER,
  is_over_budget BOOLEAN,
  alert_threshold_reached BOOLEAN
) AS $$
DECLARE
  v_config RECORD;
  v_days_in_month INTEGER;
  v_days_elapsed INTEGER;
  v_daily_avg NUMERIC;
BEGIN
  -- Get current budget config
  SELECT * INTO v_config FROM public.ai_budget_config LIMIT 1;
  
  -- If no config exists, return defaults
  IF v_config IS NULL THEN
    RETURN QUERY SELECT 
      100.00::NUMERIC,
      0::NUMERIC,
      0::NUMERIC,
      100.00::NUMERIC,
      0::NUMERIC,
      30::INTEGER,
      0::INTEGER,
      false::BOOLEAN,
      false::BOOLEAN;
    RETURN;
  END IF;
  
  -- Calculate days
  v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'));
  v_days_elapsed := EXTRACT(DAY FROM CURRENT_DATE);
  
  -- Calculate daily average and projection
  IF v_days_elapsed > 0 THEN
    v_daily_avg := v_config.current_month_spending / v_days_elapsed;
  ELSE
    v_daily_avg := 0;
  END IF;
  
  RETURN QUERY SELECT
    v_config.monthly_limit_usd,
    v_config.current_month_spending,
    CASE 
      WHEN v_config.monthly_limit_usd > 0 
      THEN (v_config.current_month_spending / v_config.monthly_limit_usd * 100)
      ELSE 0
    END,
    v_config.monthly_limit_usd - v_config.current_month_spending,
    v_daily_avg * v_days_in_month,
    v_days_in_month,
    v_days_elapsed,
    v_config.current_month_spending > v_config.monthly_limit_usd,
    (v_config.current_month_spending / NULLIF(v_config.monthly_limit_usd, 0) * 100) >= v_config.alert_threshold_percentage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default budget config if not exists
INSERT INTO public.ai_budget_config (monthly_limit_usd, alert_threshold_percentage, enable_budget_alerts)
VALUES (100.00, 80, true)
ON CONFLICT DO NOTHING;