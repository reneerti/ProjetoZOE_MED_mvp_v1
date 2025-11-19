-- Function to get cache statistics
CREATE OR REPLACE FUNCTION public.get_cache_stats()
RETURNS TABLE (
  total_cached_responses BIGINT,
  total_cache_hits BIGINT,
  cache_hit_rate NUMERIC,
  estimated_cost_saved NUMERIC,
  total_cached_tokens BIGINT,
  avg_cache_age_hours NUMERIC,
  most_cached_functions JSONB,
  cache_size_mb NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH cache_summary AS (
    SELECT 
      COUNT(*)::BIGINT as total_responses,
      SUM(hit_count)::BIGINT as total_hits,
      SUM(tokens_used)::BIGINT as total_tokens,
      AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600)::NUMERIC as avg_age_hours
    FROM public.ai_response_cache
    WHERE expires_at > NOW()
  ),
  function_stats AS (
    SELECT 
      function_name,
      COUNT(*) as cache_count,
      SUM(hit_count) as hits
    FROM public.ai_response_cache
    WHERE expires_at > NOW()
    GROUP BY function_name
    ORDER BY hits DESC
    LIMIT 10
  ),
  cost_savings AS (
    SELECT 
      -- Each cache hit saves approximately $0.001 (average API call cost)
      SUM(hit_count * 0.001)::NUMERIC as saved
    FROM public.ai_response_cache
    WHERE expires_at > NOW()
  )
  SELECT 
    cs.total_responses,
    cs.total_hits,
    CASE 
      WHEN cs.total_responses > 0 
      THEN ROUND((cs.total_hits::NUMERIC / (cs.total_responses + cs.total_hits)) * 100, 2)
      ELSE 0
    END as hit_rate,
    COALESCE(cost.saved, 0) as cost_saved,
    cs.total_tokens,
    ROUND(cs.avg_age_hours, 2) as avg_age_hours,
    (SELECT jsonb_agg(jsonb_build_object(
      'function_name', function_name,
      'cache_count', cache_count,
      'hits', hits
    )) FROM function_stats) as most_cached,
    -- Estimate cache size in MB (rough estimate based on response_data JSONB size)
    ROUND((pg_total_relation_size('ai_response_cache'::regclass) / 1024.0 / 1024.0)::NUMERIC, 2) as cache_size_mb
  FROM cache_summary cs
  CROSS JOIN cost_savings cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Schedule daily cache cleanup at 3 AM UTC
SELECT cron.schedule(
  'cleanup-expired-ai-cache',
  '0 3 * * *',  -- At 3:00 AM every day
  $$
  SELECT public.cleanup_expired_cache();
  $$
);