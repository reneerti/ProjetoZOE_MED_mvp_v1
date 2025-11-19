-- Function to manually invalidate cache by function name
CREATE OR REPLACE FUNCTION public.invalidate_cache_by_function(
  _function_name TEXT
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_response_cache
  WHERE function_name = _function_name;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to invalidate all cache
CREATE OR REPLACE FUNCTION public.invalidate_all_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_response_cache;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Table to track daily cache performance for alerting
CREATE TABLE IF NOT EXISTS public.cache_performance_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  cache_hit_rate NUMERIC NOT NULL,
  total_requests BIGINT NOT NULL,
  total_hits BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on cache_performance_daily
ALTER TABLE public.cache_performance_daily ENABLE ROW LEVEL SECURITY;

-- Admin can view cache performance
CREATE POLICY "Admins can view cache performance"
ON public.cache_performance_daily
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert daily stats
CREATE POLICY "Service role can insert cache performance"
ON public.cache_performance_daily
FOR INSERT
WITH CHECK (((auth.jwt() ->> 'role'::text) = 'service_role'::text));

-- Function to record daily cache performance
CREATE OR REPLACE FUNCTION public.record_daily_cache_performance()
RETURNS VOID AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_hit_rate NUMERIC;
  v_total_requests BIGINT;
  v_total_hits BIGINT;
BEGIN
  -- Get today's cache stats
  SELECT 
    CASE 
      WHEN COUNT(*) > 0 
      THEN ROUND((SUM(hit_count)::NUMERIC / (COUNT(*) + SUM(hit_count))) * 100, 2)
      ELSE 0
    END,
    COUNT(*),
    SUM(hit_count)
  INTO v_hit_rate, v_total_requests, v_total_hits
  FROM public.ai_response_cache
  WHERE DATE(created_at) = v_today;

  -- Insert or update today's performance
  INSERT INTO public.cache_performance_daily (date, cache_hit_rate, total_requests, total_hits)
  VALUES (v_today, v_hit_rate, v_total_requests, v_total_hits)
  ON CONFLICT (date)
  DO UPDATE SET
    cache_hit_rate = EXCLUDED.cache_hit_rate,
    total_requests = EXCLUDED.total_requests,
    total_hits = EXCLUDED.total_hits,
    created_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if alert should be triggered
CREATE OR REPLACE FUNCTION public.check_cache_performance_alert()
RETURNS TABLE (
  should_alert BOOLEAN,
  avg_hit_rate NUMERIC,
  days_below_threshold INTEGER
) AS $$
DECLARE
  v_threshold NUMERIC := 15.0;
  v_days_required INTEGER := 3;
  v_consecutive_days INTEGER := 0;
  v_avg_rate NUMERIC;
BEGIN
  -- Check last 3 days for consecutive low performance
  WITH last_days AS (
    SELECT cache_hit_rate, date
    FROM public.cache_performance_daily
    WHERE date >= CURRENT_DATE - INTERVAL '3 days'
    ORDER BY date DESC
    LIMIT 3
  )
  SELECT 
    COUNT(*) FILTER (WHERE cache_hit_rate < v_threshold),
    AVG(cache_hit_rate)
  INTO v_consecutive_days, v_avg_rate
  FROM last_days;

  RETURN QUERY SELECT
    (v_consecutive_days >= v_days_required) as should_alert,
    COALESCE(v_avg_rate, 0) as avg_hit_rate,
    v_consecutive_days as days_below_threshold;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Schedule daily cache performance recording at 11:59 PM UTC
SELECT cron.schedule(
  'record-daily-cache-performance',
  '59 23 * * *',
  'SELECT public.record_daily_cache_performance();'
);