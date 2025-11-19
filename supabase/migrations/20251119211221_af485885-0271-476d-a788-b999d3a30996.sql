-- Fix search_path for cleanup_expired_cache function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix search_path for get_budget_status function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;