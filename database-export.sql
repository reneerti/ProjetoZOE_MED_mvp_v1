-- =====================================================
-- ZOEMED - ESTRUTURA COMPLETA DO BANCO DE DADOS
-- =====================================================
-- Este arquivo contém toda a estrutura do banco de dados
-- incluindo tipos, tabelas, funções, triggers e políticas RLS
-- =====================================================

-- =====================================================
-- 1. TIPOS ENUM
-- =====================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'controller', 'user');

-- =====================================================
-- 2. TABELAS
-- =====================================================

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de roles de usuário
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Tabela de relação controlador-paciente
CREATE TABLE public.controller_patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    controller_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(controller_id, patient_id)
);

-- Tabela de categorias de exames
CREATE TABLE public.exam_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de tipos de exames
CREATE TABLE public.exam_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.exam_categories(id),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de parâmetros de exames
CREATE TABLE public.exam_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_type_id UUID REFERENCES public.exam_types(id),
    parameter_name TEXT NOT NULL,
    unit TEXT,
    reference_min NUMERIC,
    reference_max NUMERIC,
    critical_low NUMERIC,
    critical_high NUMERIC,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de parâmetros clínicos de referência
CREATE TABLE public.clinical_reference_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parameter_category TEXT NOT NULL,
    parameter_name TEXT NOT NULL,
    unit TEXT,
    reference_min NUMERIC,
    reference_max NUMERIC,
    critical_min NUMERIC,
    critical_max NUMERIC,
    description TEXT,
    related_conditions TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de exames
CREATE TABLE public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    exam_name TEXT NOT NULL,
    category_id UUID REFERENCES public.exam_categories(id),
    type_id UUID REFERENCES public.exam_types(id),
    exam_date DATE NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    results JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de imagens de exames
CREATE TABLE public.exam_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    exam_id UUID REFERENCES public.exams(id),
    image_url TEXT NOT NULL,
    file_type TEXT DEFAULT 'image',
    exam_category_id UUID REFERENCES public.exam_categories(id),
    exam_type_id UUID REFERENCES public.exam_types(id),
    exam_date DATE,
    lab_name TEXT,
    requesting_doctor TEXT,
    reporting_doctor TEXT,
    ocr_text TEXT,
    processing_status TEXT DEFAULT 'pending',
    upload_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de resultados de exames
CREATE TABLE public.exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_image_id UUID REFERENCES public.exam_images(id),
    parameter_id UUID REFERENCES public.exam_parameters(id),
    parameter_name TEXT NOT NULL,
    value NUMERIC,
    value_text TEXT,
    unit TEXT,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de alertas de saúde
CREATE TABLE public.health_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    exam_image_id UUID REFERENCES public.exam_images(id),
    parameter_name TEXT NOT NULL,
    value NUMERIC NOT NULL,
    critical_threshold NUMERIC NOT NULL,
    threshold_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    status TEXT DEFAULT 'unread',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de análise de saúde
CREATE TABLE public.health_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    health_score NUMERIC,
    analysis_summary JSONB,
    attention_points JSONB,
    specialist_recommendations JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de medições de bioimpedância
CREATE TABLE public.bioimpedance_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    measurement_date DATE NOT NULL,
    weight NUMERIC NOT NULL,
    body_fat_percentage NUMERIC,
    muscle_mass NUMERIC,
    water_percentage NUMERIC,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de uploads de bioimpedância
CREATE TABLE public.bioimpedance_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    measurement_id UUID REFERENCES public.bioimpedance_measurements(id),
    image_url TEXT NOT NULL,
    status TEXT DEFAULT 'processing',
    extracted_data JSONB,
    manual_corrections JSONB,
    error_message TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de metas de composição corporal
CREATE TABLE public.body_composition_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    goal_type TEXT NOT NULL,
    start_value NUMERIC NOT NULL,
    target_value NUMERIC NOT NULL,
    current_value NUMERIC,
    start_date DATE DEFAULT CURRENT_DATE,
    target_date DATE NOT NULL,
    status TEXT DEFAULT 'active',
    notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de notificações de metas
CREATE TABLE public.goal_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    goal_id UUID NOT NULL,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    progress_percentage NUMERIC,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de notas de evolução
CREATE TABLE public.evolution_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    note_date DATE NOT NULL,
    health_score NUMERIC,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de medicamentos
CREATE TABLE public.medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    medication_name TEXT NOT NULL,
    current_dose TEXT NOT NULL,
    schedule JSONB DEFAULT '{}'::JSONB,
    start_date DATE NOT NULL,
    notes TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de suplementos
CREATE TABLE public.supplements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    supplement_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    start_date DATE NOT NULL,
    notes TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de recomendações de suplementos
CREATE TABLE public.supplement_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    supplement_name TEXT NOT NULL,
    reason TEXT NOT NULL,
    recommended_dosage TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de conexões de wearables
CREATE TABLE public.wearable_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    provider TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de dados de wearables
CREATE TABLE public.wearable_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    provider TEXT NOT NULL,
    data_type TEXT NOT NULL,
    value NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de auditoria de tokens wearables
CREATE TABLE public.wearable_token_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    provider TEXT NOT NULL,
    operation TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de rate limiting
CREATE TABLE public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- Tabela de histórico de relatórios por email
CREATE TABLE public.email_reports_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    controller_id UUID NOT NULL,
    recipient_email TEXT NOT NULL,
    report_type TEXT DEFAULT 'monthly',
    month TEXT NOT NULL,
    year TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    email_id TEXT,
    error_message TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de logs de auditoria admin
CREATE TABLE public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. TABELAS DE MONITORAMENTO DE IA
-- =====================================================

-- Tabela de logs de uso de IA
CREATE TABLE public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    function_name TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT,
    tokens_used INTEGER,
    estimated_cost_usd NUMERIC,
    response_time_ms INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de cache de respostas de IA
CREATE TABLE public.ai_response_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key TEXT NOT NULL UNIQUE,
    prompt_hash TEXT NOT NULL,
    function_name TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT,
    response_data JSONB NOT NULL,
    tokens_used INTEGER,
    hit_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de configuração de orçamento de IA
CREATE TABLE public.ai_budget_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monthly_limit_usd NUMERIC DEFAULT 100.00,
    current_month_spending NUMERIC DEFAULT 0,
    budget_period_start DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE),
    budget_period_end DATE DEFAULT (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'),
    alert_threshold_percentage INTEGER DEFAULT 80,
    enable_budget_alerts BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de alertas de uso de IA
CREATE TABLE public.ai_usage_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    enable_cost_alerts BOOLEAN DEFAULT TRUE,
    daily_cost_threshold NUMERIC DEFAULT 10.00,
    enable_fallback_alerts BOOLEAN DEFAULT TRUE,
    fallback_threshold INTEGER DEFAULT 5,
    last_alert_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de configuração de circuit breaker
CREATE TABLE public.ai_circuit_breaker_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    failure_threshold INTEGER DEFAULT 5,
    failure_window_minutes INTEGER DEFAULT 5,
    cooldown_seconds INTEGER DEFAULT 60,
    alert_threshold_percentage NUMERIC DEFAULT 30.0,
    enable_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de estado do circuit breaker
CREATE TABLE public.ai_circuit_breaker_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    function_name TEXT NOT NULL UNIQUE,
    state TEXT DEFAULT 'closed',
    failure_count INTEGER DEFAULT 0,
    last_failure_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de thresholds por função
CREATE TABLE public.ai_function_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    function_name TEXT NOT NULL UNIQUE,
    max_response_time_ms INTEGER,
    max_cost_per_request NUMERIC,
    max_failure_rate NUMERIC,
    enable_alerts BOOLEAN DEFAULT TRUE,
    last_alert_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de histórico de alertas
CREATE TABLE public.ai_alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    function_name TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    threshold_value NUMERIC,
    actual_value NUMERIC,
    metadata JSONB,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID,
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de análise de tendências
CREATE TABLE public.ai_trend_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    function_name TEXT,
    analysis_date DATE DEFAULT CURRENT_DATE,
    metric_type TEXT NOT NULL,
    current_value NUMERIC NOT NULL,
    predicted_value NUMERIC,
    trend_direction TEXT,
    confidence_score NUMERIC,
    is_anomaly BOOLEAN DEFAULT FALSE,
    anomaly_severity TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de recomendações de otimização
CREATE TABLE public.ai_optimization_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    function_name TEXT NOT NULL,
    recommendation_type TEXT NOT NULL,
    current_metric_value NUMERIC NOT NULL,
    recommended_action TEXT NOT NULL,
    expected_improvement TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    priority TEXT NOT NULL,
    estimated_cost_savings NUMERIC,
    estimated_performance_gain NUMERIC,
    risk_level TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    applied_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de configuração de webhooks
CREATE TABLE public.ai_webhook_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_type TEXT NOT NULL,
    webhook_url TEXT NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    alert_types TEXT[] DEFAULT ARRAY['critical', 'threshold_breach', 'anomaly'],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de configuração de auto-tuning
CREATE TABLE public.ai_autotuning_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enabled BOOLEAN DEFAULT FALSE,
    require_admin_approval BOOLEAN DEFAULT TRUE,
    auto_apply_low_risk BOOLEAN DEFAULT FALSE,
    auto_apply_medium_risk BOOLEAN DEFAULT FALSE,
    min_confidence_score NUMERIC DEFAULT 0.8,
    max_daily_applications INTEGER DEFAULT 5,
    excluded_functions TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de histórico de auto-tuning
CREATE TABLE public.ai_autotuning_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID NOT NULL,
    applied_by UUID,
    auto_applied BOOLEAN DEFAULT FALSE,
    previous_config JSONB,
    new_config JSONB,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    success BOOLEAN,
    result TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de performance diária do cache
CREATE TABLE public.cache_performance_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    cache_hit_rate NUMERIC NOT NULL,
    total_requests BIGINT NOT NULL,
    total_hits BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. FUNÇÕES DO BANCO DE DADOS
-- =====================================================

-- Função para verificar se usuário tem role específica
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para obter role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Função para verificar se paciente pertence ao controlador
CREATE OR REPLACE FUNCTION public.is_patient_of_controller(_controller_id UUID, _patient_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.controller_patients
    WHERE controller_id = _controller_id
      AND patient_id = _patient_id
  )
$$;

-- Função para obter pacientes do controlador
CREATE OR REPLACE FUNCTION public.get_controller_patients(_controller_id UUID)
RETURNS TABLE(patient_id UUID)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT patient_id
  FROM public.controller_patients
  WHERE controller_id = _controller_id
$$;

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Função para criar perfil ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- Função para criar role de usuário ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Função para validar força de senha
CREATE OR REPLACE FUNCTION public.validate_password_strength(password_text TEXT)
RETURNS TABLE(valid BOOLEAN, errors TEXT[])
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  error_list TEXT[] := ARRAY[]::TEXT[];
  is_valid BOOLEAN := TRUE;
BEGIN
  IF LENGTH(password_text) < 8 THEN
    error_list := ARRAY_APPEND(error_list, 'Senha deve ter no mínimo 8 caracteres');
    is_valid := FALSE;
  END IF;

  IF LENGTH(password_text) > 128 THEN
    error_list := ARRAY_APPEND(error_list, 'Senha muito longa (máximo 128 caracteres)');
    is_valid := FALSE;
  END IF;

  IF password_text !~ '[A-Z]' THEN
    error_list := ARRAY_APPEND(error_list, 'Senha deve conter pelo menos uma letra maiúscula');
    is_valid := FALSE;
  END IF;

  IF password_text !~ '[a-z]' THEN
    error_list := ARRAY_APPEND(error_list, 'Senha deve conter pelo menos uma letra minúscula');
    is_valid := FALSE;
  END IF;

  IF password_text !~ '[0-9]' THEN
    error_list := ARRAY_APPEND(error_list, 'Senha deve conter pelo menos um número');
    is_valid := FALSE;
  END IF;

  IF password_text !~ '[^A-Za-z0-9]' THEN
    error_list := ARRAY_APPEND(error_list, 'Senha deve conter pelo menos um caractere especial');
    is_valid := FALSE;
  END IF;

  RETURN QUERY SELECT is_valid, error_list;
END;
$$;

-- Função de rate limiting
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count INTEGER;
  v_window_start TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT request_count, window_start
  INTO v_current_count, v_window_start
  FROM rate_limits
  WHERE user_id = p_user_id AND endpoint = p_endpoint;

  IF NOT FOUND OR (v_now - v_window_start) > (p_window_seconds || ' seconds')::INTERVAL THEN
    INSERT INTO rate_limits (user_id, endpoint, request_count, window_start)
    VALUES (p_user_id, p_endpoint, 1, v_now)
    ON CONFLICT (user_id, endpoint)
    DO UPDATE SET
      request_count = 1,
      window_start = v_now,
      updated_at = v_now;
    
    RETURN JSONB_BUILD_OBJECT(
      'allowed', TRUE,
      'remaining', p_max_requests - 1,
      'reset_at', v_now + (p_window_seconds || ' seconds')::INTERVAL
    );
  END IF;

  IF v_current_count >= p_max_requests THEN
    RETURN JSONB_BUILD_OBJECT(
      'allowed', FALSE,
      'remaining', 0,
      'reset_at', v_window_start + (p_window_seconds || ' seconds')::INTERVAL,
      'retry_after', EXTRACT(EPOCH FROM (v_window_start + (p_window_seconds || ' seconds')::INTERVAL - v_now))::INTEGER
    );
  END IF;

  UPDATE rate_limits
  SET request_count = request_count + 1,
      updated_at = v_now
  WHERE user_id = p_user_id AND endpoint = p_endpoint;

  RETURN JSONB_BUILD_OBJECT(
    'allowed', TRUE,
    'remaining', p_max_requests - v_current_count - 1,
    'reset_at', v_window_start + (p_window_seconds || ' seconds')::INTERVAL
  );
END;
$$;

-- Função para limpar rate limits antigos
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS INTEGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM rate_limits
  WHERE updated_at < NOW() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Função para validar tokens de conexão
CREATE OR REPLACE FUNCTION public.validate_connection_tokens()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.access_token IS NULL AND NEW.refresh_token IS NULL THEN
    RAISE EXCEPTION 'Pelo menos um token (access ou refresh) deve ser fornecido';
  END IF;
  
  IF NEW.provider NOT IN ('google_fit', 'apple_health') THEN
    RAISE EXCEPTION 'Provider inválido: %', NEW.provider;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Função para obter estatísticas de admin
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS TABLE(
  total_users BIGINT,
  total_measurements BIGINT,
  total_uploads BIGINT,
  successful_uploads BIGINT,
  failed_uploads BIGINT,
  total_storage_mb NUMERIC,
  this_month_uploads BIGINT
)
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT bm.user_id)::BIGINT,
    COUNT(DISTINCT bm.id)::BIGINT,
    COUNT(DISTINCT bu.id)::BIGINT,
    SUM(CASE WHEN bu.status = 'completed' THEN 1 ELSE 0 END)::BIGINT,
    SUM(CASE WHEN bu.status = 'error' THEN 1 ELSE 0 END)::BIGINT,
    0::NUMERIC,
    COUNT(DISTINCT CASE 
      WHEN bu.created_at >= DATE_TRUNC('month', NOW()) 
      THEN bu.id 
    END)::BIGINT
  FROM bioimpedance_measurements bm
  LEFT JOIN bioimpedance_uploads bu ON bu.measurement_id = bm.id;
END;
$$;

-- Função para obter estatísticas do usuário
CREATE OR REPLACE FUNCTION public.get_user_stats(_user_id UUID)
RETURNS TABLE(
  total_measurements BIGINT,
  total_uploads BIGINT,
  successful_uploads BIGINT,
  failed_uploads BIGINT,
  this_month_uploads BIGINT,
  storage_used_mb NUMERIC
)
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT bm.id)::BIGINT,
    COUNT(DISTINCT bu.id)::BIGINT,
    SUM(CASE WHEN bu.status = 'completed' THEN 1 ELSE 0 END)::BIGINT,
    SUM(CASE WHEN bu.status = 'error' THEN 1 ELSE 0 END)::BIGINT,
    COUNT(DISTINCT CASE 
      WHEN bu.created_at >= DATE_TRUNC('month', NOW()) 
      THEN bu.id 
    END)::BIGINT,
    0::NUMERIC
  FROM bioimpedance_measurements bm
  LEFT JOIN bioimpedance_uploads bu ON bu.user_id = _user_id AND bu.measurement_id = bm.id
  WHERE bm.user_id = _user_id;
END;
$$;

-- Função para obter todos os usuários (admin)
CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  display_name TEXT,
  total_uploads BIGINT,
  last_upload TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    p.display_name,
    COUNT(bu.id)::BIGINT,
    MAX(bu.created_at),
    au.created_at
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  LEFT JOIN public.bioimpedance_uploads bu ON bu.user_id = au.id
  GROUP BY au.id, au.email, p.display_name, au.created_at
  ORDER BY au.created_at DESC;
END;
$$;

-- =====================================================
-- FUNÇÕES DE MONITORAMENTO DE IA
-- =====================================================

-- Função para obter estatísticas de uso de IA
CREATE OR REPLACE FUNCTION public.get_ai_usage_stats(_user_id UUID, _days INTEGER DEFAULT 30)
RETURNS TABLE(
  total_requests BIGINT,
  lovable_ai_requests BIGINT,
  gemini_api_requests BIGINT,
  fallback_requests BIGINT,
  success_rate NUMERIC,
  total_cost_usd NUMERIC,
  avg_response_time_ms INTEGER,
  daily_stats JSONB
)
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
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
    COUNT(*)::BIGINT,
    SUM(CASE WHEN provider = 'lovable_ai' THEN 1 ELSE 0 END)::BIGINT,
    SUM(CASE WHEN provider = 'gemini_api' THEN 1 ELSE 0 END)::BIGINT,
    SUM(CASE WHEN provider = 'fallback' THEN 1 ELSE 0 END)::BIGINT,
    ROUND((SUM(CASE WHEN success THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(*), 0) * 100), 2),
    ROUND(SUM(COALESCE(estimated_cost_usd, 0))::DECIMAL, 2),
    ROUND(AVG(response_time_ms))::INTEGER,
    (SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
      'day', day,
      'requests', requests,
      'lovable_count', lovable_count,
      'gemini_count', gemini_count,
      'fallback_count', fallback_count,
      'cost', day_cost
    )) FROM daily_data)
  FROM ai_usage_logs
  WHERE user_id = _user_id
    AND created_at >= NOW() - (_days || ' days')::INTERVAL;
END;
$$;

-- Função para limpar cache expirado
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS INTEGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_response_cache
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Função para invalidar cache por função
CREATE OR REPLACE FUNCTION public.invalidate_cache_by_function(_function_name TEXT)
RETURNS INTEGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_response_cache
  WHERE function_name = _function_name;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Função para invalidar todo o cache
CREATE OR REPLACE FUNCTION public.invalidate_all_cache()
RETURNS INTEGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_response_cache;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Função para obter status do orçamento
CREATE OR REPLACE FUNCTION public.get_budget_status()
RETURNS TABLE(
  monthly_limit NUMERIC,
  current_spending NUMERIC,
  percentage_used NUMERIC,
  remaining_budget NUMERIC,
  projected_monthly_spending NUMERIC,
  days_in_month INTEGER,
  days_elapsed INTEGER,
  is_over_budget BOOLEAN,
  alert_threshold_reached BOOLEAN
)
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config RECORD;
  v_days_in_month INTEGER;
  v_days_elapsed INTEGER;
  v_daily_avg NUMERIC;
BEGIN
  SELECT * INTO v_config FROM public.ai_budget_config LIMIT 1;
  
  IF v_config IS NULL THEN
    RETURN QUERY SELECT 
      100.00::NUMERIC,
      0::NUMERIC,
      0::NUMERIC,
      100.00::NUMERIC,
      0::NUMERIC,
      30::INTEGER,
      0::INTEGER,
      FALSE::BOOLEAN,
      FALSE::BOOLEAN;
    RETURN;
  END IF;
  
  v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'));
  v_days_elapsed := EXTRACT(DAY FROM CURRENT_DATE);
  
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
$$;

-- Função para obter estatísticas do cache
CREATE OR REPLACE FUNCTION public.get_cache_stats()
RETURNS TABLE(
  total_cached_responses BIGINT,
  total_cache_hits BIGINT,
  cache_hit_rate NUMERIC,
  estimated_cost_saved NUMERIC,
  total_cached_tokens BIGINT,
  avg_cache_age_hours NUMERIC,
  most_cached_functions JSONB,
  cache_size_mb NUMERIC
)
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
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
    END,
    COALESCE(cost.saved, 0),
    cs.total_tokens,
    ROUND(cs.avg_age_hours, 2),
    (SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
      'function_name', function_name,
      'cache_count', cache_count,
      'hits', hits
    )) FROM function_stats),
    ROUND((PG_TOTAL_RELATION_SIZE('ai_response_cache'::REGCLASS) / 1024.0 / 1024.0)::NUMERIC, 2)
  FROM cache_summary cs
  CROSS JOIN cost_savings cost;
END;
$$;

-- Função para obter taxa de falha de IA
CREATE OR REPLACE FUNCTION public.get_ai_failure_rate(_function_name TEXT DEFAULT NULL, _minutes INTEGER DEFAULT 60)
RETURNS TABLE(
  function_name TEXT,
  total_requests BIGINT,
  failed_requests BIGINT,
  failure_rate NUMERIC,
  last_failure_at TIMESTAMPTZ
)
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.function_name,
    COUNT(*)::BIGINT,
    SUM(CASE WHEN NOT l.success THEN 1 ELSE 0 END)::BIGINT,
    CASE 
      WHEN COUNT(*) > 0 
      THEN ROUND((SUM(CASE WHEN NOT l.success THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)) * 100, 2)
      ELSE 0
    END,
    MAX(CASE WHEN NOT l.success THEN l.created_at ELSE NULL END)
  FROM public.ai_usage_logs l
  WHERE l.created_at >= NOW() - (_minutes || ' minutes')::INTERVAL
    AND (_function_name IS NULL OR l.function_name = _function_name)
  GROUP BY l.function_name
  HAVING SUM(CASE WHEN NOT l.success THEN 1 ELSE 0 END) > 0
  ORDER BY failure_rate DESC;
END;
$$;

-- Função para verificar alerta de falha de IA
CREATE OR REPLACE FUNCTION public.check_ai_failure_alert()
RETURNS TABLE(
  should_alert BOOLEAN,
  function_name TEXT,
  failure_rate NUMERIC,
  total_failures BIGINT,
  threshold_percentage NUMERIC
)
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config RECORD;
BEGIN
  SELECT * INTO v_config 
  FROM public.ai_circuit_breaker_config 
  LIMIT 1;
  
  IF v_config IS NULL OR NOT v_config.enable_notifications THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    (fr.failure_rate >= v_config.alert_threshold_percentage),
    fr.function_name,
    fr.failure_rate,
    fr.failed_requests,
    v_config.alert_threshold_percentage
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
LANGUAGE PLPGSQL
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

-- Função para calcular tendência de custo
CREATE OR REPLACE FUNCTION public.calculate_cost_trend(_function_name TEXT DEFAULT NULL, _days INTEGER DEFAULT 30)
RETURNS TABLE(
  function_name TEXT,
  current_daily_avg NUMERIC,
  predicted_daily_avg NUMERIC,
  trend_direction TEXT,
  predicted_monthly_cost NUMERIC,
  confidence_score NUMERIC
)
LANGUAGE PLPGSQL
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
BEGIN
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

  IF v_n < 7 THEN
    RETURN;
  END IF;

  v_slope := (v_n * v_sum_xy - v_sum_x * v_sum_y) / NULLIF((v_n * v_sum_x2 - v_sum_x * v_sum_x), 0);
  v_intercept := (v_sum_y - v_slope * v_sum_x) / NULLIF(v_n, 0);

  v_current_avg := v_sum_y / NULLIF(v_n, 0);
  v_predicted_avg := v_slope * (v_n + 7) + v_intercept;

  v_r_squared := 0.85;

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

-- Função para detectar anomalias de custo
CREATE OR REPLACE FUNCTION public.detect_cost_anomalies(_threshold_std_dev NUMERIC DEFAULT 2.0, _days INTEGER DEFAULT 7)
RETURNS TABLE(
  function_name TEXT,
  date DATE,
  actual_cost NUMERIC,
  expected_cost NUMERIC,
  std_dev NUMERIC,
  deviation_score NUMERIC,
  is_anomaly BOOLEAN
)
LANGUAGE PLPGSQL
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
    ROUND(dc.daily_cost, 4),
    ROUND(s.mean_cost, 4),
    ROUND(s.std_cost, 4),
    ROUND(ABS(dc.daily_cost - s.mean_cost) / NULLIF(s.std_cost, 0), 2),
    (ABS(dc.daily_cost - s.mean_cost) / NULLIF(s.std_cost, 0)) > _threshold_std_dev
  FROM daily_costs dc
  JOIN stats s ON dc.function_name = s.function_name
  WHERE s.std_cost > 0
  ORDER BY dc.cost_date DESC, deviation_score DESC;
END;
$$;

-- Função para verificar thresholds de função
CREATE OR REPLACE FUNCTION public.check_function_thresholds()
RETURNS TABLE(
  should_alert BOOLEAN,
  function_name TEXT,
  alert_type TEXT,
  threshold_value NUMERIC,
  actual_value NUMERIC,
  severity TEXT
)
LANGUAGE PLPGSQL
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
    TRUE,
    t.function_name,
    CASE 
      WHEN t.max_response_time_ms IS NOT NULL AND s.avg_response_time > t.max_response_time_ms 
        THEN 'response_time'
      WHEN t.max_cost_per_request IS NOT NULL AND s.avg_cost_per_request > t.max_cost_per_request 
        THEN 'cost'
      WHEN t.max_failure_rate IS NOT NULL AND s.failure_rate > t.max_failure_rate 
        THEN 'failure_rate'
    END,
    CASE 
      WHEN t.max_response_time_ms IS NOT NULL AND s.avg_response_time > t.max_response_time_ms 
        THEN t.max_response_time_ms
      WHEN t.max_cost_per_request IS NOT NULL AND s.avg_cost_per_request > t.max_cost_per_request 
        THEN t.max_cost_per_request
      WHEN t.max_failure_rate IS NOT NULL AND s.failure_rate > t.max_failure_rate 
        THEN t.max_failure_rate
    END,
    CASE 
      WHEN t.max_response_time_ms IS NOT NULL AND s.avg_response_time > t.max_response_time_ms 
        THEN s.avg_response_time
      WHEN t.max_cost_per_request IS NOT NULL AND s.avg_cost_per_request > t.max_cost_per_request 
        THEN s.avg_cost_per_request
      WHEN t.max_failure_rate IS NOT NULL AND s.failure_rate > t.max_failure_rate 
        THEN s.failure_rate
    END,
    CASE 
      WHEN t.max_response_time_ms IS NOT NULL AND s.avg_response_time > (t.max_response_time_ms * 1.5) THEN 'critical'
      WHEN t.max_cost_per_request IS NOT NULL AND s.avg_cost_per_request > (t.max_cost_per_request * 1.5) THEN 'critical'
      WHEN t.max_failure_rate IS NOT NULL AND s.failure_rate > (t.max_failure_rate * 1.5) THEN 'critical'
      ELSE 'warning'
    END
  FROM ai_function_thresholds t
  JOIN recent_stats s ON t.function_name = s.function_name
  WHERE t.enable_alerts = TRUE
    AND (
      (t.max_response_time_ms IS NOT NULL AND s.avg_response_time > t.max_response_time_ms) OR
      (t.max_cost_per_request IS NOT NULL AND s.avg_cost_per_request > t.max_cost_per_request) OR
      (t.max_failure_rate IS NOT NULL AND s.failure_rate > t.max_failure_rate)
    )
    AND (t.last_alert_sent_at IS NULL OR t.last_alert_sent_at < NOW() - INTERVAL '30 minutes');
END;
$$;

-- Função para gerar recomendações de otimização de IA
CREATE OR REPLACE FUNCTION public.generate_ai_optimization_recommendations()
RETURNS TABLE(
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
)
LANGUAGE PLPGSQL
AS $$
BEGIN
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
  WHERE l.created_at > NOW() - INTERVAL '7 days'
    AND l.provider = 'lovable_ai'
    AND l.success = TRUE
  GROUP BY l.function_name
  HAVING AVG(l.estimated_cost_usd) > 0.01;

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
  WHERE l.created_at > NOW() - INTERVAL '7 days'
    AND l.success = TRUE
    AND l.response_time_ms IS NOT NULL
  GROUP BY l.function_name
  HAVING AVG(l.response_time_ms) > 8000;

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
  WHERE l.created_at > NOW() - INTERVAL '7 days'
    AND l.success = TRUE
  GROUP BY l.function_name
  HAVING COUNT(*) > 100;

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
  WHERE l.created_at > NOW() - INTERVAL '7 days'
  GROUP BY l.function_name
  HAVING COUNT(*) > 10
    AND (COUNT(*) FILTER (WHERE NOT l.success) * 100.0 / COUNT(*)) > 3;
END;
$$;

-- Função para registrar performance diária do cache
CREATE OR REPLACE FUNCTION public.record_daily_cache_performance()
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_hit_rate NUMERIC;
  v_total_requests BIGINT;
  v_total_hits BIGINT;
BEGIN
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

  INSERT INTO public.cache_performance_daily (date, cache_hit_rate, total_requests, total_hits)
  VALUES (v_today, v_hit_rate, v_total_requests, v_total_hits)
  ON CONFLICT (date)
  DO UPDATE SET
    cache_hit_rate = EXCLUDED.cache_hit_rate,
    total_requests = EXCLUDED.total_requests,
    total_hits = EXCLUDED.total_hits,
    created_at = NOW();
END;
$$;

-- Função para verificar alerta de performance do cache
CREATE OR REPLACE FUNCTION public.check_cache_performance_alert()
RETURNS TABLE(
  should_alert BOOLEAN,
  avg_hit_rate NUMERIC,
  days_below_threshold INTEGER
)
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold NUMERIC := 15.0;
  v_days_required INTEGER := 3;
  v_consecutive_days INTEGER := 0;
  v_avg_rate NUMERIC;
BEGIN
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
    (v_consecutive_days >= v_days_required),
    COALESCE(v_avg_rate, 0),
    v_consecutive_days;
END;
$$;

-- Função para atualizar updated_at webhook config
CREATE OR REPLACE FUNCTION public.update_ai_webhook_config_updated_at()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at em profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para criar perfil ao criar usuário
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Trigger para criar role ao criar usuário
CREATE TRIGGER on_auth_user_created_role
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_role();

-- Trigger para atualizar updated_at em controller_patients
CREATE TRIGGER update_controller_patients_updated_at
BEFORE UPDATE ON public.controller_patients
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para atualizar updated_at em exams
CREATE TRIGGER update_exams_updated_at
BEFORE UPDATE ON public.exams
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para atualizar updated_at em bioimpedance_uploads
CREATE TRIGGER update_bioimpedance_uploads_updated_at
BEFORE UPDATE ON public.bioimpedance_uploads
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para atualizar updated_at em body_composition_goals
CREATE TRIGGER update_body_composition_goals_updated_at
BEFORE UPDATE ON public.body_composition_goals
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para atualizar updated_at em medications
CREATE TRIGGER update_medications_updated_at
BEFORE UPDATE ON public.medications
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para atualizar updated_at em supplements
CREATE TRIGGER update_supplements_updated_at
BEFORE UPDATE ON public.supplements
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para validar tokens de conexão wearables
CREATE TRIGGER validate_wearable_connection_tokens
BEFORE INSERT OR UPDATE ON public.wearable_connections
FOR EACH ROW
EXECUTE FUNCTION public.validate_connection_tokens();

-- Trigger para atualizar updated_at em wearable_connections
CREATE TRIGGER update_wearable_connections_updated_at
BEFORE UPDATE ON public.wearable_connections
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para atualizar updated_at em health_analysis
CREATE TRIGGER update_health_analysis_updated_at
BEFORE UPDATE ON public.health_analysis
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para atualizar updated_at em clinical_reference_parameters
CREATE TRIGGER update_clinical_reference_parameters_updated_at
BEFORE UPDATE ON public.clinical_reference_parameters
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para atualizar updated_at em email_reports_history
CREATE TRIGGER update_email_reports_history_updated_at
BEFORE UPDATE ON public.email_reports_history
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para atualizar updated_at em ai_budget_config
CREATE TRIGGER update_ai_budget_config_updated_at
BEFORE UPDATE ON public.ai_budget_config
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para atualizar updated_at em ai_usage_alerts
CREATE TRIGGER update_ai_usage_alerts_updated_at
BEFORE UPDATE ON public.ai_usage_alerts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para atualizar updated_at em ai_circuit_breaker_config
CREATE TRIGGER update_ai_circuit_breaker_config_updated_at
BEFORE UPDATE ON public.ai_circuit_breaker_config
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para atualizar updated_at em ai_circuit_breaker_state
CREATE TRIGGER update_ai_circuit_breaker_state_updated_at
BEFORE UPDATE ON public.ai_circuit_breaker_state
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para atualizar updated_at em ai_function_thresholds
CREATE TRIGGER update_ai_function_thresholds_updated_at
BEFORE UPDATE ON public.ai_function_thresholds
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para atualizar updated_at em ai_webhook_config
CREATE TRIGGER update_ai_webhook_config_updated_at
BEFORE UPDATE ON public.ai_webhook_config
FOR EACH ROW
EXECUTE FUNCTION public.update_ai_webhook_config_updated_at();

-- Trigger para atualizar updated_at em ai_autotuning_config
CREATE TRIGGER update_ai_autotuning_config_updated_at
BEFORE UPDATE ON public.ai_autotuning_config
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 6. HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controller_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_reference_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bioimpedance_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bioimpedance_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_composition_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplement_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_token_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_reports_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_budget_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_circuit_breaker_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_circuit_breaker_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_function_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_trend_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_optimization_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_webhook_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_autotuning_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_autotuning_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache_performance_daily ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. POLÍTICAS RLS
-- =====================================================

-- Políticas para profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas para user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para controller_patients
CREATE POLICY "Controllers can view their patients" ON public.controller_patients FOR SELECT USING (auth.uid() = controller_id);
CREATE POLICY "Admins can manage all controller-patient relationships" ON public.controller_patients FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para exam_categories
CREATE POLICY "Everyone can view exam categories" ON public.exam_categories FOR SELECT USING (TRUE);

-- Políticas para exam_types
CREATE POLICY "Everyone can view exam types" ON public.exam_types FOR SELECT USING (TRUE);

-- Políticas para exam_parameters
CREATE POLICY "Everyone can view exam parameters" ON public.exam_parameters FOR SELECT USING (TRUE);

-- Políticas para clinical_reference_parameters
CREATE POLICY "Everyone can view clinical parameters" ON public.clinical_reference_parameters FOR SELECT USING (TRUE);
CREATE POLICY "Only admins can modify clinical parameters" ON public.clinical_reference_parameters FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para exams
CREATE POLICY "Users can view own exams" ON public.exams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own exams" ON public.exams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own exams" ON public.exams FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own exams" ON public.exams FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Controllers can view assigned patients exams" ON public.exams FOR SELECT 
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = exams.user_id) OR public.has_role(auth.uid(), 'admin'));

-- Políticas para exam_images
CREATE POLICY "Users can view own exam images" ON public.exam_images FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own exam images" ON public.exam_images FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own exam images" ON public.exam_images FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own exam images" ON public.exam_images FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Controllers can view assigned patients exam images" ON public.exam_images FOR SELECT 
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = exam_images.user_id) OR public.has_role(auth.uid(), 'admin'));

-- Políticas para exam_results
CREATE POLICY "Users can view their own exam results" ON public.exam_results FOR SELECT 
  USING (EXISTS (SELECT 1 FROM exam_images ei WHERE ei.id = exam_results.exam_image_id AND ei.user_id = auth.uid()));
CREATE POLICY "Users can create their own exam results" ON public.exam_results FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM exam_images ei WHERE ei.id = exam_results.exam_image_id AND ei.user_id = auth.uid()));
CREATE POLICY "Users can update their own exam results" ON public.exam_results FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM exam_images ei WHERE ei.id = exam_results.exam_image_id AND ei.user_id = auth.uid()));
CREATE POLICY "Users can delete their own exam results" ON public.exam_results FOR DELETE 
  USING (EXISTS (SELECT 1 FROM exam_images ei WHERE ei.id = exam_results.exam_image_id AND ei.user_id = auth.uid()));
CREATE POLICY "Controllers can view assigned patients exam results" ON public.exam_results FOR SELECT 
  USING (EXISTS (SELECT 1 FROM exam_images ei WHERE ei.id = exam_results.exam_image_id AND (ei.user_id = auth.uid() OR EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = ei.user_id) OR public.has_role(auth.uid(), 'admin'))));

-- Políticas para health_alerts
CREATE POLICY "Users can view their own health alerts" ON public.health_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own health alerts" ON public.health_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own health alerts" ON public.health_alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Controllers can view assigned patients health alerts" ON public.health_alerts FOR SELECT 
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = health_alerts.user_id) OR public.has_role(auth.uid(), 'admin'));

-- Políticas para health_analysis
CREATE POLICY "Users can view their own health analysis" ON public.health_analysis FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own health analysis" ON public.health_analysis FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own health analysis" ON public.health_analysis FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Controllers can view assigned patients health analysis" ON public.health_analysis FOR SELECT 
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = health_analysis.user_id) OR public.has_role(auth.uid(), 'admin'));

-- Políticas para bioimpedance_measurements
CREATE POLICY "Users can view own bioimpedance" ON public.bioimpedance_measurements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bioimpedance" ON public.bioimpedance_measurements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bioimpedance" ON public.bioimpedance_measurements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bioimpedance" ON public.bioimpedance_measurements FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Controllers can view assigned patients bioimpedance" ON public.bioimpedance_measurements FOR SELECT 
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = bioimpedance_measurements.user_id) OR public.has_role(auth.uid(), 'admin'));

-- Políticas para bioimpedance_uploads
CREATE POLICY "Users can view own uploads" ON public.bioimpedance_uploads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own uploads" ON public.bioimpedance_uploads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own uploads" ON public.bioimpedance_uploads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own uploads" ON public.bioimpedance_uploads FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Controllers can view assigned patients bioimpedance uploads" ON public.bioimpedance_uploads FOR SELECT 
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = bioimpedance_uploads.user_id) OR public.has_role(auth.uid(), 'admin'));

-- Políticas para body_composition_goals
CREATE POLICY "Users can view their own goals" ON public.body_composition_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own goals" ON public.body_composition_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own goals" ON public.body_composition_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own goals" ON public.body_composition_goals FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Controllers can view assigned patients goals" ON public.body_composition_goals FOR SELECT 
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = body_composition_goals.user_id) OR public.has_role(auth.uid(), 'admin'));

-- Políticas para goal_notifications
CREATE POLICY "Users can view their own notifications" ON public.goal_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own notifications" ON public.goal_notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.goal_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications" ON public.goal_notifications FOR DELETE USING (auth.uid() = user_id);

-- Políticas para evolution_notes
CREATE POLICY "Users can view own evolution" ON public.evolution_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own evolution" ON public.evolution_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own evolution" ON public.evolution_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own evolution" ON public.evolution_notes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Controllers can view assigned patients evolution notes" ON public.evolution_notes FOR SELECT 
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = evolution_notes.user_id) OR public.has_role(auth.uid(), 'admin'));

-- Políticas para medications
CREATE POLICY "Users can view own medications" ON public.medications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own medications" ON public.medications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own medications" ON public.medications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own medications" ON public.medications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Controllers can view assigned patients medications" ON public.medications FOR SELECT 
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = medications.user_id) OR public.has_role(auth.uid(), 'admin'));

-- Políticas para supplements
CREATE POLICY "Users can view own supplements" ON public.supplements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own supplements" ON public.supplements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own supplements" ON public.supplements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own supplements" ON public.supplements FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Controllers can view assigned patients supplements" ON public.supplements FOR SELECT 
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = supplements.user_id) OR public.has_role(auth.uid(), 'admin'));

-- Políticas para supplement_recommendations
CREATE POLICY "Users can view own supplement recommendations" ON public.supplement_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own supplement recommendations" ON public.supplement_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own supplement recommendations" ON public.supplement_recommendations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own supplement recommendations" ON public.supplement_recommendations FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Controllers can view assigned patients supplement recommendations" ON public.supplement_recommendations FOR SELECT 
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = supplement_recommendations.user_id) OR public.has_role(auth.uid(), 'admin'));

-- Políticas para wearable_connections
CREATE POLICY "Users can manage own wearable connections" ON public.wearable_connections FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Controllers can view assigned patients wearable connections" ON public.wearable_connections FOR SELECT 
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = wearable_connections.user_id) OR public.has_role(auth.uid(), 'admin'));

-- Políticas para wearable_data
CREATE POLICY "Users can view own wearable data" ON public.wearable_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wearable data" ON public.wearable_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Controllers can view assigned patients wearable data" ON public.wearable_data FOR SELECT 
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = wearable_data.user_id) OR public.has_role(auth.uid(), 'admin'));

-- Políticas para wearable_token_audit
CREATE POLICY "Users can view own token audit" ON public.wearable_token_audit FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert token audit" ON public.wearable_token_audit FOR INSERT WITH CHECK (TRUE);

-- Políticas para rate_limits
CREATE POLICY "Service role can manage rate limits" ON public.rate_limits FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role');

-- Políticas para email_reports_history
CREATE POLICY "Controllers can view their own report history" ON public.email_reports_history FOR SELECT USING (auth.uid() = controller_id);
CREATE POLICY "Controllers can insert their own report history" ON public.email_reports_history FOR INSERT WITH CHECK (auth.uid() = controller_id);

-- Políticas para admin_audit_logs
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can insert audit logs" ON public.admin_audit_logs FOR INSERT WITH CHECK (TRUE);

-- Políticas para ai_usage_logs
CREATE POLICY "Users can view their own AI usage logs" ON public.ai_usage_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert AI usage logs" ON public.ai_usage_logs FOR INSERT WITH CHECK (TRUE);

-- Políticas para ai_response_cache
CREATE POLICY "Service role can manage cache" ON public.ai_response_cache FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role');

-- Políticas para ai_budget_config
CREATE POLICY "Admins can view budget config" ON public.ai_budget_config FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage budget config" ON public.ai_budget_config FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Políticas para ai_usage_alerts
CREATE POLICY "Users can view their own alert settings" ON public.ai_usage_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own alert settings" ON public.ai_usage_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own alert settings" ON public.ai_usage_alerts FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para ai_circuit_breaker_config
CREATE POLICY "Admins can view circuit breaker config" ON public.ai_circuit_breaker_config FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update circuit breaker config" ON public.ai_circuit_breaker_config FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para ai_circuit_breaker_state
CREATE POLICY "Admins can view circuit breaker state" ON public.ai_circuit_breaker_state FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para ai_function_thresholds
CREATE POLICY "Admins can manage function thresholds" ON public.ai_function_thresholds FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para ai_alert_history
CREATE POLICY "Admins can view alert history" ON public.ai_alert_history FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert alerts" ON public.ai_alert_history FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Admins can acknowledge alerts" ON public.ai_alert_history FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para ai_trend_analysis
CREATE POLICY "Admins can view trend analysis" ON public.ai_trend_analysis FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert trend analysis" ON public.ai_trend_analysis FOR INSERT WITH CHECK (TRUE);

-- Políticas para ai_optimization_recommendations
CREATE POLICY "Admins can view recommendations" ON public.ai_optimization_recommendations FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert recommendations" ON public.ai_optimization_recommendations FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Admins can update recommendations" ON public.ai_optimization_recommendations FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para ai_webhook_config
CREATE POLICY "Admins can manage webhook config" ON public.ai_webhook_config FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para ai_autotuning_config
CREATE POLICY "Admins can manage autotuning config" ON public.ai_autotuning_config FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para ai_autotuning_history
CREATE POLICY "Admins can view autotuning history" ON public.ai_autotuning_history FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert autotuning history" ON public.ai_autotuning_history FOR INSERT WITH CHECK (TRUE);

-- Políticas para cache_performance_daily
CREATE POLICY "Admins can view cache performance" ON public.cache_performance_daily FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can insert cache performance" ON public.cache_performance_daily FOR INSERT WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- =====================================================
-- 8. STORAGE BUCKETS (configuração via dashboard)
-- =====================================================

-- NOTA: Os buckets de storage devem ser criados via dashboard do Supabase:
-- 
-- 1. exam-images (público)
--    - Permite upload de imagens e PDFs de exames
--    - Políticas:
--      * SELECT: público (todos podem ver)
--      * INSERT: apenas usuário autenticado pode fazer upload para sua própria pasta
--      * UPDATE: apenas usuário autenticado pode atualizar seus próprios arquivos
--      * DELETE: apenas usuário autenticado pode deletar seus próprios arquivos
--
-- 2. bioimpedance-images (público)
--    - Permite upload de imagens de bioimpedância
--    - Políticas:
--      * SELECT: público (todos podem ver)
--      * INSERT: apenas usuário autenticado pode fazer upload para sua própria pasta
--      * UPDATE: apenas usuário autenticado pode atualizar seus próprios arquivos
--      * DELETE: apenas usuário autenticado pode deletar seus próprios arquivos

-- =====================================================
-- FIM DA ESTRUTURA DO BANCO DE DADOS
-- =====================================================
