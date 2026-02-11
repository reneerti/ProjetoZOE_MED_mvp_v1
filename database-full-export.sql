-- =====================================================
-- ZOEMED - EXPORTAÇÃO COMPLETA DO BANCO DE DADOS
-- Gerado em: 2026-02-11
-- =====================================================

-- =====================================================
-- 1. ENUM TYPES
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'controller');

-- =====================================================
-- 2. TABELAS
-- =====================================================

-- profiles
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  display_name text,
  avatar_url text
);

-- user_roles
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, role)
);

-- controller_patients
CREATE TABLE public.controller_patients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  controller_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- subscription_plans
CREATE TABLE public.subscription_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  max_exams_per_month integer,
  modules_enabled jsonb NOT NULL DEFAULT '{"exams": true, "goals": false, "evolution": false, "medications": false, "supplements": false, "bioimpedance": false}'::jsonb,
  price_monthly numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL
);

-- user_subscriptions
CREATE TABLE public.user_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  exams_used_this_month integer NOT NULL DEFAULT 0,
  current_period_start date NOT NULL DEFAULT CURRENT_DATE,
  current_period_end date NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- exam_categories
CREATE TABLE public.exam_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now(),
  name text NOT NULL,
  description text,
  icon text
);

-- exam_types
CREATE TABLE public.exam_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid REFERENCES public.exam_categories(id),
  created_at timestamp with time zone DEFAULT now(),
  name text NOT NULL,
  description text
);

-- exam_parameters
CREATE TABLE public.exam_parameters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_type_id uuid REFERENCES public.exam_types(id),
  reference_min numeric,
  reference_max numeric,
  critical_low numeric,
  critical_high numeric,
  created_at timestamp with time zone DEFAULT now(),
  parameter_name text NOT NULL,
  unit text,
  description text
);

-- exams
CREATE TABLE public.exams (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  exam_date date NOT NULL,
  results jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  category_id uuid REFERENCES public.exam_categories(id),
  type_id uuid REFERENCES public.exam_types(id),
  exam_name text NOT NULL,
  status text NOT NULL,
  notes text
);

-- exam_images
CREATE TABLE public.exam_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id uuid REFERENCES public.exams(id),
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  exam_type_id uuid REFERENCES public.exam_types(id),
  exam_category_id uuid REFERENCES public.exam_categories(id),
  exam_date date,
  upload_date timestamp with time zone DEFAULT now(),
  image_url text NOT NULL,
  ocr_text text,
  processing_status text DEFAULT 'pending'::text,
  lab_name text,
  requesting_doctor text,
  reporting_doctor text,
  file_type text DEFAULT 'image'::text
);

-- exam_results
CREATE TABLE public.exam_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_image_id uuid REFERENCES public.exam_images(id),
  parameter_id uuid REFERENCES public.exam_parameters(id),
  value numeric,
  created_at timestamp with time zone DEFAULT now(),
  parameter_name text NOT NULL,
  value_text text,
  unit text,
  status text
);

-- clinical_reference_parameters
CREATE TABLE public.clinical_reference_parameters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_min numeric,
  reference_max numeric,
  critical_min numeric,
  critical_max numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  parameter_name text NOT NULL,
  parameter_category text NOT NULL,
  description text,
  related_conditions text[],
  unit text
);

-- health_alerts
CREATE TABLE public.health_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  exam_image_id uuid REFERENCES public.exam_images(id),
  value numeric NOT NULL,
  critical_threshold numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read_at timestamp with time zone,
  parameter_name text NOT NULL,
  threshold_type text NOT NULL,
  severity text NOT NULL,
  status text NOT NULL DEFAULT 'unread'::text
);

-- health_analysis
CREATE TABLE public.health_analysis (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  health_score numeric,
  analysis_summary jsonb,
  attention_points jsonb,
  specialist_recommendations jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- evolution_notes
CREATE TABLE public.evolution_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  note_date date NOT NULL,
  health_score numeric,
  created_at timestamp with time zone DEFAULT now(),
  notes text
);

-- bioimpedance_measurements
CREATE TABLE public.bioimpedance_measurements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  measurement_date date NOT NULL,
  weight numeric NOT NULL,
  body_fat_percentage numeric,
  muscle_mass numeric,
  water_percentage numeric,
  created_at timestamp with time zone DEFAULT now(),
  notes text
);

-- bioimpedance_uploads
CREATE TABLE public.bioimpedance_uploads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  extracted_data jsonb,
  manual_corrections jsonb,
  measurement_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  image_url text NOT NULL,
  status text NOT NULL DEFAULT 'processing'::text,
  error_message text
);

-- medications
CREATE TABLE public.medications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  start_date date NOT NULL,
  schedule jsonb DEFAULT '{}'::jsonb,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  medication_name text NOT NULL,
  current_dose text NOT NULL,
  notes text
);

-- supplements
CREATE TABLE public.supplements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date,
  active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  supplement_name text NOT NULL,
  supplement_type text NOT NULL,
  current_dose text NOT NULL,
  unit text NOT NULL,
  frequency text NOT NULL,
  time_of_day text,
  notes text
);

-- supplement_logs
CREATE TABLE public.supplement_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplement_id uuid NOT NULL REFERENCES public.supplements(id),
  user_id uuid NOT NULL,
  taken_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  dose_taken text NOT NULL,
  notes text
);

-- supplement_recommendations
CREATE TABLE public.supplement_recommendations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  based_on_exam_id uuid REFERENCES public.exam_images(id),
  based_on_bioimpedance_id uuid REFERENCES public.bioimpedance_measurements(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  supplement_name text NOT NULL,
  recommended_dose text NOT NULL,
  reasoning text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text
);

-- body_composition_goals
CREATE TABLE public.body_composition_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  target_value numeric NOT NULL,
  start_value numeric NOT NULL,
  current_value numeric,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  target_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  goal_type text NOT NULL,
  status text NOT NULL DEFAULT 'active'::text,
  notes text
);

-- goal_notifications
CREATE TABLE public.goal_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  goal_id uuid NOT NULL REFERENCES public.body_composition_goals(id),
  progress_percentage numeric,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL
);

-- wearable_connections
CREATE TABLE public.wearable_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  token_expires_at timestamp with time zone,
  connected_at timestamp with time zone NOT NULL DEFAULT now(),
  last_sync_at timestamp with time zone,
  sync_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  tokens_encrypted boolean DEFAULT false,
  last_token_rotation timestamp with time zone,
  rotation_count integer DEFAULT 0,
  provider text NOT NULL,
  access_token text,
  refresh_token text,
  scopes text[]
);

-- wearable_data
CREATE TABLE public.wearable_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL,
  steps integer,
  heart_rate integer,
  sleep_hours numeric,
  calories integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  source text NOT NULL
);

-- wearable_token_audit
CREATE TABLE public.wearable_token_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  action text NOT NULL,
  ip_address text,
  user_agent text
);

-- oauth_token_audit
CREATE TABLE public.oauth_token_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb,
  provider text NOT NULL,
  action text NOT NULL,
  ip_address text,
  user_agent text
);

-- push_subscriptions
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  keys jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  endpoint text NOT NULL
);

-- email_reports_history
CREATE TABLE public.email_reports_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  controller_id uuid NOT NULL,
  sent_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  recipient_email text NOT NULL,
  report_type text NOT NULL DEFAULT 'monthly'::text,
  month text NOT NULL,
  year text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  email_id text,
  error_message text
);

-- admin_audit_logs
CREATE TABLE public.admin_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  action text NOT NULL,
  entity_type text NOT NULL,
  ip_address text,
  user_agent text
);

-- system_config
CREATE TABLE public.system_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  config_value jsonb NOT NULL,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  description text,
  config_key text NOT NULL
);

-- rate_limits
CREATE TABLE public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  endpoint text NOT NULL,
  UNIQUE(user_id, endpoint)
);

-- ai_usage_logs
CREATE TABLE public.ai_usage_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  success boolean NOT NULL DEFAULT true,
  response_time_ms integer,
  estimated_cost_usd numeric,
  tokens_used integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  provider text NOT NULL,
  model text,
  error_message text
);

-- ai_usage_alerts
CREATE TABLE public.ai_usage_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  fallback_threshold integer NOT NULL DEFAULT 5,
  daily_cost_threshold numeric DEFAULT 10.00,
  enable_fallback_alerts boolean NOT NULL DEFAULT true,
  enable_cost_alerts boolean NOT NULL DEFAULT true,
  last_alert_sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ai_response_cache
CREATE TABLE public.ai_response_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  response_data jsonb NOT NULL,
  tokens_used integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  hit_count integer NOT NULL DEFAULT 0,
  last_accessed_at timestamp with time zone NOT NULL DEFAULT now(),
  function_name text NOT NULL,
  prompt_hash text NOT NULL,
  provider text NOT NULL,
  model text,
  cache_key text NOT NULL
);

-- ai_budget_config
CREATE TABLE public.ai_budget_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  monthly_limit_usd numeric NOT NULL DEFAULT 100.00,
  alert_threshold_percentage integer NOT NULL DEFAULT 80,
  enable_budget_alerts boolean NOT NULL DEFAULT true,
  current_month_spending numeric NOT NULL DEFAULT 0,
  budget_period_start date NOT NULL DEFAULT date_trunc('month', CURRENT_DATE::timestamp with time zone),
  budget_period_end date NOT NULL DEFAULT (date_trunc('month', CURRENT_DATE::timestamp with time zone) + '1 mon -1 days'::interval),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ai_circuit_breaker_config
CREATE TABLE public.ai_circuit_breaker_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  failure_threshold integer NOT NULL DEFAULT 5,
  failure_window_minutes integer NOT NULL DEFAULT 5,
  cooldown_seconds integer NOT NULL DEFAULT 60,
  alert_threshold_percentage numeric NOT NULL DEFAULT 30.0,
  enable_notifications boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ai_circuit_breaker_state
CREATE TABLE public.ai_circuit_breaker_state (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  failure_count integer NOT NULL DEFAULT 0,
  last_failure_at timestamp with time zone,
  opened_at timestamp with time zone,
  last_success_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  function_name text NOT NULL UNIQUE,
  state text NOT NULL DEFAULT 'closed'::text
);

-- ai_function_thresholds
CREATE TABLE public.ai_function_thresholds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  max_response_time_ms integer,
  max_cost_per_request numeric,
  max_failure_rate numeric,
  enable_alerts boolean NOT NULL DEFAULT true,
  last_alert_sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  function_name text NOT NULL
);

-- ai_webhook_config
CREATE TABLE public.ai_webhook_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  webhook_type text NOT NULL,
  webhook_url text NOT NULL,
  alert_types text[] NOT NULL DEFAULT ARRAY['critical'::text, 'threshold_breach'::text, 'anomaly'::text]
);

-- ai_trend_analysis
CREATE TABLE public.ai_trend_analysis (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_date date NOT NULL DEFAULT CURRENT_DATE,
  current_value numeric NOT NULL,
  predicted_value numeric,
  confidence_score numeric,
  is_anomaly boolean DEFAULT false,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  function_name text,
  metric_type text NOT NULL,
  trend_direction text,
  anomaly_severity text
);

-- ai_alert_history
CREATE TABLE public.ai_alert_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  threshold_value numeric,
  actual_value numeric,
  metadata jsonb,
  acknowledged boolean DEFAULT false,
  acknowledged_at timestamp with time zone,
  acknowledged_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  title text NOT NULL,
  message text NOT NULL,
  alert_type text NOT NULL,
  function_name text NOT NULL,
  severity text NOT NULL
);

-- ai_optimization_recommendations
CREATE TABLE public.ai_optimization_recommendations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  current_metric_value numeric NOT NULL,
  estimated_cost_savings numeric,
  estimated_performance_gain numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  applied_at timestamp with time zone,
  dismissed_at timestamp with time zone,
  risk_level text DEFAULT 'medium'::text,
  function_name text NOT NULL,
  recommendation_type text NOT NULL,
  recommended_action text NOT NULL,
  expected_improvement text NOT NULL,
  priority text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  reasoning text NOT NULL
);

-- ai_autotuning_config
CREATE TABLE public.ai_autotuning_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  auto_apply_low_risk boolean NOT NULL DEFAULT false,
  auto_apply_medium_risk boolean NOT NULL DEFAULT false,
  require_admin_approval boolean NOT NULL DEFAULT true,
  min_confidence_score numeric NOT NULL DEFAULT 0.8,
  max_daily_applications integer NOT NULL DEFAULT 5,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  excluded_functions text[] DEFAULT ARRAY[]::text[]
);

-- ai_autotuning_history
CREATE TABLE public.ai_autotuning_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recommendation_id uuid NOT NULL REFERENCES public.ai_optimization_recommendations(id),
  applied_at timestamp with time zone NOT NULL DEFAULT now(),
  applied_by uuid,
  auto_applied boolean NOT NULL DEFAULT false,
  previous_config jsonb,
  new_config jsonb,
  success boolean,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  result text
);

-- cache_performance_daily
CREATE TABLE public.cache_performance_daily (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL UNIQUE,
  cache_hit_rate numeric NOT NULL,
  total_requests bigint NOT NULL,
  total_hits bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controller_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_reference_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bioimpedance_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bioimpedance_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplement_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_composition_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_token_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_token_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_reports_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_budget_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_circuit_breaker_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_circuit_breaker_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_function_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_webhook_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_trend_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_optimization_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_autotuning_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_autotuning_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache_performance_daily ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================

-- profiles
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- user_roles
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert their own role (test only)" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own role (test only)" ON public.user_roles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- controller_patients
CREATE POLICY "Admins can manage all controller-patient relationships" ON public.controller_patients FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Controllers can view their patients" ON public.controller_patients FOR SELECT USING (auth.uid() = controller_id);

-- subscription_plans
CREATE POLICY "Everyone can view plans" ON public.subscription_plans FOR SELECT USING (true);
CREATE POLICY "Only admins can manage plans" ON public.subscription_plans FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- user_subscriptions
CREATE POLICY "Admins can manage subscriptions" ON public.user_subscriptions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all subscriptions" ON public.user_subscriptions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view their own subscription" ON public.user_subscriptions FOR SELECT USING (auth.uid() = user_id);

-- exam_categories
CREATE POLICY "Everyone can view exam categories" ON public.exam_categories FOR SELECT USING (true);

-- exam_types
CREATE POLICY "Everyone can view exam types" ON public.exam_types FOR SELECT USING (true);

-- exam_parameters
CREATE POLICY "Everyone can view exam parameters" ON public.exam_parameters FOR SELECT USING (true);

-- exams
CREATE POLICY "Controllers can view assigned patients exams" ON public.exams FOR SELECT USING ((auth.uid() = user_id) OR (EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = exams.user_id)) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create their own exams" ON public.exams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own exams" ON public.exams FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own exams" ON public.exams FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own exams" ON public.exams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own exams" ON public.exams FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own exams" ON public.exams FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own exams" ON public.exams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own exams" ON public.exams FOR SELECT USING (auth.uid() = user_id);

-- exam_images
CREATE POLICY "Controllers can view assigned patients exam images" ON public.exam_images FOR SELECT USING ((auth.uid() = user_id) OR (EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = exam_images.user_id)) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create their own exam images" ON public.exam_images FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own exam images" ON public.exam_images FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own exam images" ON public.exam_images FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own exam images" ON public.exam_images FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own exam images" ON public.exam_images FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own exam images" ON public.exam_images FOR SELECT USING (auth.uid() = user_id);

-- exam_results
CREATE POLICY "Controllers can view assigned patients exam results" ON public.exam_results FOR SELECT USING (EXISTS (SELECT 1 FROM exam_images ei WHERE ei.id = exam_results.exam_image_id AND (ei.user_id = auth.uid() OR EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = ei.user_id) OR has_role(auth.uid(), 'admin'::app_role))));
CREATE POLICY "Users can create their own exam results" ON public.exam_results FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM exam_images ei WHERE ei.id = exam_results.exam_image_id AND ei.user_id = auth.uid()));
CREATE POLICY "Users can delete their own exam results" ON public.exam_results FOR DELETE USING (EXISTS (SELECT 1 FROM exam_images ei WHERE ei.id = exam_results.exam_image_id AND ei.user_id = auth.uid()));
CREATE POLICY "Users can update their own exam results" ON public.exam_results FOR UPDATE USING (EXISTS (SELECT 1 FROM exam_images ei WHERE ei.id = exam_results.exam_image_id AND ei.user_id = auth.uid()));
CREATE POLICY "Users can view their own exam results" ON public.exam_results FOR SELECT USING (EXISTS (SELECT 1 FROM exam_images ei WHERE ei.id = exam_results.exam_image_id AND ei.user_id = auth.uid()));

-- clinical_reference_parameters
CREATE POLICY "Everyone can view clinical parameters" ON public.clinical_reference_parameters FOR SELECT USING (true);
CREATE POLICY "Only admins can modify clinical parameters" ON public.clinical_reference_parameters FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- health_alerts
CREATE POLICY "Controllers can view assigned patients health alerts" ON public.health_alerts FOR SELECT USING ((auth.uid() = user_id) OR (EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = health_alerts.user_id)) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert their own health alerts" ON public.health_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own health alerts" ON public.health_alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own health alerts" ON public.health_alerts FOR SELECT USING (auth.uid() = user_id);

-- health_analysis
CREATE POLICY "Controllers can view assigned patients health analysis" ON public.health_analysis FOR SELECT USING ((auth.uid() = user_id) OR (EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = health_analysis.user_id)) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create their own health analysis" ON public.health_analysis FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own health analysis" ON public.health_analysis FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own health analysis" ON public.health_analysis FOR SELECT USING (auth.uid() = user_id);

-- evolution_notes
CREATE POLICY "Controllers can view assigned patients evolution notes" ON public.evolution_notes FOR SELECT USING ((auth.uid() = user_id) OR (EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = evolution_notes.user_id)) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create their own evolution notes" ON public.evolution_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own evolution" ON public.evolution_notes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own evolution notes" ON public.evolution_notes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own evolution" ON public.evolution_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own evolution" ON public.evolution_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own evolution notes" ON public.evolution_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own evolution" ON public.evolution_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own evolution notes" ON public.evolution_notes FOR SELECT USING (auth.uid() = user_id);

-- bioimpedance_measurements
CREATE POLICY "Controllers can view assigned patients bioimpedance" ON public.bioimpedance_measurements FOR SELECT USING ((auth.uid() = user_id) OR (EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = bioimpedance_measurements.user_id)) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create their own bioimpedance measurements" ON public.bioimpedance_measurements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bioimpedance" ON public.bioimpedance_measurements FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bioimpedance measurements" ON public.bioimpedance_measurements FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bioimpedance" ON public.bioimpedance_measurements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bioimpedance" ON public.bioimpedance_measurements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own bioimpedance measurements" ON public.bioimpedance_measurements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own bioimpedance" ON public.bioimpedance_measurements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own bioimpedance measurements" ON public.bioimpedance_measurements FOR SELECT USING (auth.uid() = user_id);

-- bioimpedance_uploads
CREATE POLICY "Controllers can view assigned patients bioimpedance uploads" ON public.bioimpedance_uploads FOR SELECT USING ((auth.uid() = user_id) OR (EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = bioimpedance_uploads.user_id)) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create own uploads" ON public.bioimpedance_uploads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own uploads" ON public.bioimpedance_uploads FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own uploads" ON public.bioimpedance_uploads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own uploads" ON public.bioimpedance_uploads FOR SELECT USING (auth.uid() = user_id);

-- medications
CREATE POLICY "Controllers can view assigned patients medications" ON public.medications FOR SELECT USING ((auth.uid() = user_id) OR (EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = medications.user_id)) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create their own medications" ON public.medications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own medications" ON public.medications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own medications" ON public.medications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own medications" ON public.medications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own medications" ON public.medications FOR SELECT USING (auth.uid() = user_id);

-- supplements
CREATE POLICY "Controllers can view assigned patients supplements" ON public.supplements FOR SELECT USING ((auth.uid() = user_id) OR (EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = supplements.user_id)) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create their own supplements" ON public.supplements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own supplements" ON public.supplements FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own supplements" ON public.supplements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own supplements" ON public.supplements FOR SELECT USING (auth.uid() = user_id);

-- supplement_logs
CREATE POLICY "Users can create their own supplement logs" ON public.supplement_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own supplement logs" ON public.supplement_logs FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own supplement logs" ON public.supplement_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own supplement logs" ON public.supplement_logs FOR SELECT USING (auth.uid() = user_id);

-- supplement_recommendations
CREATE POLICY "Controllers can view assigned patients supplement recommendatio" ON public.supplement_recommendations FOR SELECT USING ((auth.uid() = user_id) OR (EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = supplement_recommendations.user_id)) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create their own recommendations" ON public.supplement_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own recommendations" ON public.supplement_recommendations FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own recommendations" ON public.supplement_recommendations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own recommendations" ON public.supplement_recommendations FOR SELECT USING (auth.uid() = user_id);

-- body_composition_goals
CREATE POLICY "Controllers can view assigned patients goals" ON public.body_composition_goals FOR SELECT USING ((auth.uid() = user_id) OR (EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = body_composition_goals.user_id)) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create their own goals" ON public.body_composition_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own goals" ON public.body_composition_goals FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own goals" ON public.body_composition_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own goals" ON public.body_composition_goals FOR SELECT USING (auth.uid() = user_id);

-- goal_notifications
CREATE POLICY "Users can create their own notifications" ON public.goal_notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications" ON public.goal_notifications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.goal_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own notifications" ON public.goal_notifications FOR SELECT USING (auth.uid() = user_id);

-- wearable_connections
CREATE POLICY "Controllers can view assigned patients wearable connections" ON public.wearable_connections FOR SELECT USING ((auth.uid() = user_id) OR (EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = wearable_connections.user_id)) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create their own wearable connections" ON public.wearable_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own wearable connections" ON public.wearable_connections FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own wearable connections" ON public.wearable_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own wearable connections" ON public.wearable_connections FOR SELECT USING (auth.uid() = user_id);

-- wearable_data
CREATE POLICY "Controllers can view assigned patients wearable data" ON public.wearable_data FOR SELECT USING ((auth.uid() = user_id) OR (EXISTS (SELECT 1 FROM controller_patients cp WHERE cp.controller_id = auth.uid() AND cp.patient_id = wearable_data.user_id)) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete their own wearable data" ON public.wearable_data FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own wearable data" ON public.wearable_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own wearable data" ON public.wearable_data FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own wearable data" ON public.wearable_data FOR SELECT USING (auth.uid() = user_id);

-- wearable_token_audit
CREATE POLICY "Service role can manage audit logs" ON public.wearable_token_audit FOR ALL USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- oauth_token_audit
CREATE POLICY "Service role can insert audit logs" ON public.oauth_token_audit FOR INSERT WITH CHECK ((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'service_role'::text);
CREATE POLICY "Users can view own audit logs" ON public.oauth_token_audit FOR SELECT USING (auth.uid() = user_id);

-- push_subscriptions
CREATE POLICY "Users can manage their own push subscriptions" ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- email_reports_history
CREATE POLICY "Controllers can insert their own report history" ON public.email_reports_history FOR INSERT WITH CHECK (auth.uid() = controller_id);
CREATE POLICY "Controllers can view their own report history" ON public.email_reports_history FOR SELECT USING (auth.uid() = controller_id);

-- admin_audit_logs
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role can insert audit logs" ON public.admin_audit_logs FOR INSERT WITH CHECK (true);

-- system_config
CREATE POLICY "Admins can manage system config" ON public.system_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- rate_limits
CREATE POLICY "Users can view own rate limits" ON public.rate_limits FOR SELECT USING (auth.uid() = user_id);

-- ai_usage_logs
CREATE POLICY "System can insert AI usage logs" ON public.ai_usage_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their own AI usage logs" ON public.ai_usage_logs FOR SELECT USING (auth.uid() = user_id);

-- ai_usage_alerts
CREATE POLICY "Users can insert their own alert settings" ON public.ai_usage_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own alert settings" ON public.ai_usage_alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own alert settings" ON public.ai_usage_alerts FOR SELECT USING (auth.uid() = user_id);

-- ai_response_cache
CREATE POLICY "Service role can manage cache" ON public.ai_response_cache FOR ALL USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- ai_budget_config
CREATE POLICY "Admins can manage budget config" ON public.ai_budget_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view budget config" ON public.ai_budget_config FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- ai_circuit_breaker_config
CREATE POLICY "Admins can update circuit breaker config" ON public.ai_circuit_breaker_config FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view circuit breaker config" ON public.ai_circuit_breaker_config FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- ai_circuit_breaker_state
CREATE POLICY "Admins can view circuit breaker state" ON public.ai_circuit_breaker_state FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- ai_webhook_config
CREATE POLICY "Admins can manage webhook config" ON public.ai_webhook_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- ai_function_thresholds
CREATE POLICY "Admins can manage function thresholds" ON public.ai_function_thresholds FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- ai_trend_analysis
CREATE POLICY "Admins can view trend analysis" ON public.ai_trend_analysis FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can insert trend analysis" ON public.ai_trend_analysis FOR INSERT WITH CHECK (true);

-- ai_alert_history
CREATE POLICY "Admins can acknowledge alerts" ON public.ai_alert_history FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view alert history" ON public.ai_alert_history FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can insert alerts" ON public.ai_alert_history FOR INSERT WITH CHECK (true);

-- ai_optimization_recommendations
CREATE POLICY "Admins can update recommendations" ON public.ai_optimization_recommendations FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view recommendations" ON public.ai_optimization_recommendations FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can insert recommendations" ON public.ai_optimization_recommendations FOR INSERT WITH CHECK (true);

-- ai_autotuning_config
CREATE POLICY "Admins can manage autotuning config" ON public.ai_autotuning_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- ai_autotuning_history
CREATE POLICY "Admins can view autotuning history" ON public.ai_autotuning_history FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can insert autotuning history" ON public.ai_autotuning_history FOR INSERT WITH CHECK (true);

-- cache_performance_daily
CREATE POLICY "Admins can view cache performance" ON public.cache_performance_daily FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role can insert cache performance" ON public.cache_performance_daily FOR INSERT WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- =====================================================
-- 5. DATABASE FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_controller_patients(_controller_id uuid)
RETURNS TABLE(patient_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT patient_id FROM public.controller_patients WHERE controller_id = _controller_id
$$;

CREATE OR REPLACE FUNCTION public.is_patient_of_controller(_controller_id uuid, _patient_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.controller_patients WHERE controller_id = _controller_id AND patient_id = _patient_id
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_ai_webhook_config_updated_at()
RETURNS trigger LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_connection_tokens()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'pg_temp'
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

CREATE OR REPLACE FUNCTION public.validate_password_strength(password_text text)
RETURNS TABLE(valid boolean, errors text[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  error_list TEXT[] := ARRAY[]::TEXT[];
  is_valid BOOLEAN := TRUE;
BEGIN
  IF LENGTH(password_text) < 3 THEN
    error_list := array_append(error_list, 'Senha deve ter no mínimo 3 caracteres');
    is_valid := FALSE;
  END IF;
  IF LENGTH(password_text) > 128 THEN
    error_list := array_append(error_list, 'Senha muito longa (máximo 128 caracteres)');
    is_valid := FALSE;
  END IF;
  IF password_text !~ '^[0-9]+$' THEN
    error_list := array_append(error_list, 'Senha deve conter apenas números');
    is_valid := FALSE;
  END IF;
  RETURN QUERY SELECT is_valid, error_list;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_user_id uuid, p_endpoint text, p_max_requests integer, p_window_seconds integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_current_count INTEGER;
  v_window_start TIMESTAMPTZ;
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT request_count, window_start INTO v_current_count, v_window_start
  FROM rate_limits WHERE user_id = p_user_id AND endpoint = p_endpoint;
  IF NOT FOUND OR (v_now - v_window_start) > (p_window_seconds || ' seconds')::INTERVAL THEN
    INSERT INTO rate_limits (user_id, endpoint, request_count, window_start)
    VALUES (p_user_id, p_endpoint, 1, v_now)
    ON CONFLICT (user_id, endpoint) DO UPDATE SET request_count = 1, window_start = v_now, updated_at = v_now;
    RETURN jsonb_build_object('allowed', true, 'remaining', p_max_requests - 1, 'reset_at', v_now + (p_window_seconds || ' seconds')::INTERVAL);
  END IF;
  IF v_current_count >= p_max_requests THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'reset_at', v_window_start + (p_window_seconds || ' seconds')::INTERVAL, 'retry_after', EXTRACT(EPOCH FROM (v_window_start + (p_window_seconds || ' seconds')::INTERVAL - v_now))::INTEGER);
  END IF;
  UPDATE rate_limits SET request_count = request_count + 1, updated_at = v_now WHERE user_id = p_user_id AND endpoint = p_endpoint;
  RETURN jsonb_build_object('allowed', true, 'remaining', p_max_requests - v_current_count - 1, 'reset_at', v_window_start + (p_window_seconds || ' seconds')::INTERVAL);
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE v_deleted INTEGER;
BEGIN
  DELETE FROM rate_limits WHERE updated_at < now() - INTERVAL '1 hour';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS TABLE(total_users bigint, total_measurements bigint, total_uploads bigint, successful_uploads bigint, failed_uploads bigint, total_storage_mb numeric, this_month_uploads bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(DISTINCT bm.user_id)::BIGINT, COUNT(DISTINCT bm.id)::BIGINT, COUNT(DISTINCT bu.id)::BIGINT,
    SUM(CASE WHEN bu.status = 'completed' THEN 1 ELSE 0 END)::BIGINT,
    SUM(CASE WHEN bu.status = 'error' THEN 1 ELSE 0 END)::BIGINT, 0::NUMERIC,
    COUNT(DISTINCT CASE WHEN bu.created_at >= date_trunc('month', now()) THEN bu.id END)::BIGINT
  FROM bioimpedance_measurements bm LEFT JOIN bioimpedance_uploads bu ON bu.measurement_id = bm.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS TABLE(user_id uuid, email text, display_name text, total_uploads bigint, last_upload timestamp with time zone, created_at timestamp with time zone)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'auth'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;
  RETURN QUERY
  SELECT au.id, au.email, p.display_name, COUNT(bu.id)::BIGINT, MAX(bu.created_at), au.created_at
  FROM auth.users au LEFT JOIN public.profiles p ON p.id = au.id LEFT JOIN public.bioimpedance_uploads bu ON bu.user_id = au.id
  GROUP BY au.id, au.email, p.display_name, au.created_at ORDER BY au.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_stats(_user_id uuid)
RETURNS TABLE(total_measurements bigint, total_uploads bigint, successful_uploads bigint, failed_uploads bigint, this_month_uploads bigint, storage_used_mb numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(DISTINCT bm.id)::BIGINT, COUNT(DISTINCT bu.id)::BIGINT,
    SUM(CASE WHEN bu.status = 'completed' THEN 1 ELSE 0 END)::BIGINT,
    SUM(CASE WHEN bu.status = 'error' THEN 1 ELSE 0 END)::BIGINT,
    COUNT(DISTINCT CASE WHEN bu.created_at >= date_trunc('month', now()) THEN bu.id END)::BIGINT, 0::NUMERIC
  FROM bioimpedance_measurements bm LEFT JOIN bioimpedance_uploads bu ON bu.user_id = _user_id AND bu.measurement_id = bm.id
  WHERE bm.user_id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ai_usage_stats(_user_id uuid, _days integer DEFAULT 30)
RETURNS TABLE(total_requests bigint, lovable_ai_requests bigint, gemini_api_requests bigint, fallback_requests bigint, success_rate numeric, total_cost_usd numeric, avg_response_time_ms integer, daily_stats jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH daily_data AS (
    SELECT DATE(created_at) as day, COUNT(*) as requests,
      SUM(CASE WHEN provider = 'lovable_ai' THEN 1 ELSE 0 END) as lovable_count,
      SUM(CASE WHEN provider = 'gemini_api' THEN 1 ELSE 0 END) as gemini_count,
      SUM(CASE WHEN provider = 'fallback' THEN 1 ELSE 0 END) as fallback_count,
      SUM(COALESCE(estimated_cost_usd, 0)) as day_cost
    FROM ai_usage_logs WHERE user_id = _user_id AND created_at >= NOW() - (_days || ' days')::INTERVAL
    GROUP BY DATE(created_at) ORDER BY day DESC
  )
  SELECT COUNT(*)::BIGINT, SUM(CASE WHEN provider = 'lovable_ai' THEN 1 ELSE 0 END)::BIGINT,
    SUM(CASE WHEN provider = 'gemini_api' THEN 1 ELSE 0 END)::BIGINT,
    SUM(CASE WHEN provider = 'fallback' THEN 1 ELSE 0 END)::BIGINT,
    ROUND((SUM(CASE WHEN success THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(*), 0) * 100), 2),
    ROUND(SUM(COALESCE(estimated_cost_usd, 0))::DECIMAL, 2),
    ROUND(AVG(response_time_ms))::INTEGER,
    (SELECT jsonb_agg(jsonb_build_object('day', day, 'requests', requests, 'lovable_count', lovable_count, 'gemini_count', gemini_count, 'fallback_count', fallback_count, 'cost', day_cost)) FROM daily_data)
  FROM ai_usage_logs WHERE user_id = _user_id AND created_at >= NOW() - (_days || ' days')::INTERVAL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ai_failure_rate(_function_name text DEFAULT NULL, _minutes integer DEFAULT 60)
RETURNS TABLE(function_name text, total_requests bigint, failed_requests bigint, failure_rate numeric, last_failure_at timestamp with time zone)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT l.function_name, COUNT(*)::BIGINT,
    SUM(CASE WHEN NOT l.success THEN 1 ELSE 0 END)::BIGINT,
    CASE WHEN COUNT(*) > 0 THEN ROUND((SUM(CASE WHEN NOT l.success THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)) * 100, 2) ELSE 0 END,
    MAX(CASE WHEN NOT l.success THEN l.created_at ELSE NULL END)
  FROM public.ai_usage_logs l
  WHERE l.created_at >= NOW() - (_minutes || ' minutes')::INTERVAL AND (_function_name IS NULL OR l.function_name = _function_name)
  GROUP BY l.function_name HAVING SUM(CASE WHEN NOT l.success THEN 1 ELSE 0 END) > 0
  ORDER BY failure_rate DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_ai_failure_alert()
RETURNS TABLE(should_alert boolean, function_name text, failure_rate numeric, total_failures bigint, threshold_percentage numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE v_config RECORD;
BEGIN
  SELECT * INTO v_config FROM public.ai_circuit_breaker_config LIMIT 1;
  IF v_config IS NULL OR NOT v_config.enable_notifications THEN RETURN; END IF;
  RETURN QUERY
  SELECT (fr.failure_rate >= v_config.alert_threshold_percentage), fr.function_name, fr.failure_rate,
    fr.failed_requests, v_config.alert_threshold_percentage
  FROM public.get_ai_failure_rate(NULL, v_config.failure_window_minutes) fr
  WHERE fr.failure_rate >= v_config.alert_threshold_percentage;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_circuit_breaker_state(_function_name text, _new_state text, _failure_count integer DEFAULT 0)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.ai_circuit_breaker_state (function_name, state, failure_count, last_failure_at, opened_at, updated_at)
  VALUES (_function_name, _new_state, _failure_count,
    CASE WHEN _new_state = 'open' THEN NOW() ELSE NULL END,
    CASE WHEN _new_state = 'open' THEN NOW() ELSE NULL END, NOW())
  ON CONFLICT (function_name) DO UPDATE SET
    state = EXCLUDED.state, failure_count = EXCLUDED.failure_count,
    last_failure_at = CASE WHEN EXCLUDED.state = 'open' THEN NOW() ELSE ai_circuit_breaker_state.last_failure_at END,
    opened_at = CASE WHEN EXCLUDED.state = 'open' THEN NOW() ELSE ai_circuit_breaker_state.opened_at END,
    last_success_at = CASE WHEN EXCLUDED.state = 'closed' THEN NOW() ELSE ai_circuit_breaker_state.last_success_at END,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_cost_trend(_function_name text DEFAULT NULL, _days integer DEFAULT 30)
RETURNS TABLE(function_name text, current_daily_avg numeric, predicted_daily_avg numeric, trend_direction text, predicted_monthly_cost numeric, confidence_score numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_data RECORD; v_sum_x NUMERIC := 0; v_sum_y NUMERIC := 0; v_sum_xy NUMERIC := 0; v_sum_x2 NUMERIC := 0;
  v_n INTEGER := 0; v_slope NUMERIC; v_intercept NUMERIC; v_current_avg NUMERIC; v_predicted_avg NUMERIC; v_r_squared NUMERIC;
BEGIN
  FOR v_data IN
    SELECT l.function_name as fname, DATE(l.created_at) as day, SUM(COALESCE(l.estimated_cost_usd, 0)) as daily_cost
    FROM ai_usage_logs l WHERE l.created_at >= CURRENT_DATE - _days AND (_function_name IS NULL OR l.function_name = _function_name)
    GROUP BY l.function_name, DATE(l.created_at) ORDER BY l.function_name, DATE(l.created_at)
  LOOP
    v_n := v_n + 1; v_sum_x := v_sum_x + v_n; v_sum_y := v_sum_y + v_data.daily_cost;
    v_sum_xy := v_sum_xy + (v_n * v_data.daily_cost); v_sum_x2 := v_sum_x2 + (v_n * v_n);
  END LOOP;
  IF v_n < 7 THEN RETURN; END IF;
  v_slope := (v_n * v_sum_xy - v_sum_x * v_sum_y) / NULLIF((v_n * v_sum_x2 - v_sum_x * v_sum_x), 0);
  v_intercept := (v_sum_y - v_slope * v_sum_x) / NULLIF(v_n, 0);
  v_current_avg := v_sum_y / NULLIF(v_n, 0);
  v_predicted_avg := v_slope * (v_n + 7) + v_intercept;
  v_r_squared := 0.85;
  RETURN QUERY SELECT COALESCE(_function_name, 'all_functions')::TEXT, ROUND(v_current_avg, 4), ROUND(v_predicted_avg, 4),
    CASE WHEN v_slope > 0.001 THEN 'increasing' WHEN v_slope < -0.001 THEN 'decreasing' ELSE 'stable' END::TEXT,
    ROUND(v_predicted_avg * 30, 2), ROUND(v_r_squared, 2);
END;
$$;

CREATE OR REPLACE FUNCTION public.detect_cost_anomalies(_threshold_std_dev numeric DEFAULT 2.0, _days integer DEFAULT 7)
RETURNS TABLE(function_name text, date date, actual_cost numeric, expected_cost numeric, std_dev numeric, deviation_score numeric, is_anomaly boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH daily_costs AS (
    SELECT l.function_name, DATE(l.created_at) as cost_date, SUM(COALESCE(l.estimated_cost_usd, 0)) as daily_cost
    FROM ai_usage_logs l WHERE l.created_at >= CURRENT_DATE - _days GROUP BY l.function_name, DATE(l.created_at)
  ), stats AS (
    SELECT function_name, AVG(daily_cost) as mean_cost, STDDEV(daily_cost) as std_cost FROM daily_costs GROUP BY function_name
  )
  SELECT dc.function_name, dc.cost_date, ROUND(dc.daily_cost, 4), ROUND(s.mean_cost, 4), ROUND(s.std_cost, 4),
    ROUND(ABS(dc.daily_cost - s.mean_cost) / NULLIF(s.std_cost, 0), 2),
    (ABS(dc.daily_cost - s.mean_cost) / NULLIF(s.std_cost, 0)) > _threshold_std_dev
  FROM daily_costs dc JOIN stats s ON dc.function_name = s.function_name WHERE s.std_cost > 0
  ORDER BY dc.cost_date DESC, deviation_score DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_function_thresholds()
RETURNS TABLE(should_alert boolean, function_name text, alert_type text, threshold_value numeric, actual_value numeric, severity text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH recent_stats AS (
    SELECT l.function_name, AVG(l.response_time_ms) as avg_response_time,
      AVG(COALESCE(l.estimated_cost_usd, 0) / NULLIF(COUNT(*), 0)) as avg_cost_per_request,
      (COUNT(*) FILTER (WHERE NOT l.success)::NUMERIC / NULLIF(COUNT(*), 0)) * 100 as failure_rate
    FROM ai_usage_logs l WHERE l.created_at >= NOW() - INTERVAL '1 hour' GROUP BY l.function_name
  )
  SELECT true,  t.function_name,
    CASE WHEN t.max_response_time_ms IS NOT NULL AND s.avg_response_time > t.max_response_time_ms THEN 'response_time'
      WHEN t.max_cost_per_request IS NOT NULL AND s.avg_cost_per_request > t.max_cost_per_request THEN 'cost'
      WHEN t.max_failure_rate IS NOT NULL AND s.failure_rate > t.max_failure_rate THEN 'failure_rate' END,
    CASE WHEN t.max_response_time_ms IS NOT NULL AND s.avg_response_time > t.max_response_time_ms THEN t.max_response_time_ms
      WHEN t.max_cost_per_request IS NOT NULL AND s.avg_cost_per_request > t.max_cost_per_request THEN t.max_cost_per_request
      WHEN t.max_failure_rate IS NOT NULL AND s.failure_rate > t.max_failure_rate THEN t.max_failure_rate END,
    CASE WHEN t.max_response_time_ms IS NOT NULL AND s.avg_response_time > t.max_response_time_ms THEN s.avg_response_time
      WHEN t.max_cost_per_request IS NOT NULL AND s.avg_cost_per_request > t.max_cost_per_request THEN s.avg_cost_per_request
      WHEN t.max_failure_rate IS NOT NULL AND s.failure_rate > t.max_failure_rate THEN s.failure_rate END,
    CASE WHEN t.max_response_time_ms IS NOT NULL AND s.avg_response_time > (t.max_response_time_ms * 1.5) THEN 'critical'
      WHEN t.max_cost_per_request IS NOT NULL AND s.avg_cost_per_request > (t.max_cost_per_request * 1.5) THEN 'critical'
      WHEN t.max_failure_rate IS NOT NULL AND s.failure_rate > (t.max_failure_rate * 1.5) THEN 'critical' ELSE 'warning' END
  FROM ai_function_thresholds t JOIN recent_stats s ON t.function_name = s.function_name
  WHERE t.enable_alerts = true AND (
    (t.max_response_time_ms IS NOT NULL AND s.avg_response_time > t.max_response_time_ms) OR
    (t.max_cost_per_request IS NOT NULL AND s.avg_cost_per_request > t.max_cost_per_request) OR
    (t.max_failure_rate IS NOT NULL AND s.failure_rate > t.max_failure_rate)
  ) AND (t.last_alert_sent_at IS NULL OR t.last_alert_sent_at < NOW() - INTERVAL '30 minutes');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_ai_optimization_recommendations()
RETURNS TABLE(function_name text, recommendation_type text, current_metric_value numeric, recommended_action text, expected_improvement text, priority text, reasoning text, estimated_cost_savings numeric, estimated_performance_gain numeric, risk_level text)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT l.function_name, 'model_change'::TEXT, AVG(l.estimated_cost_usd)::NUMERIC,
    'Considere mudar de google/gemini-2.5-pro para google/gemini-2.5-flash para reduzir custos'::TEXT,
    'Redução estimada de 60% nos custos mantendo 90% da qualidade'::TEXT,
    CASE WHEN AVG(l.estimated_cost_usd) > 0.05 THEN 'critical' WHEN AVG(l.estimated_cost_usd) > 0.02 THEN 'high' ELSE 'medium' END::TEXT,
    'Função apresenta custo médio por requisição acima do esperado.'::TEXT,
    (AVG(l.estimated_cost_usd) * 0.6 * COUNT(*))::NUMERIC, NULL::NUMERIC, 'medium'::TEXT
  FROM ai_usage_logs l WHERE l.created_at > now() - INTERVAL '7 days' AND l.provider = 'lovable_ai' AND l.success = true
  GROUP BY l.function_name HAVING AVG(l.estimated_cost_usd) > 0.01;

  RETURN QUERY
  SELECT l.function_name, 'prompt_optimization'::TEXT, AVG(l.response_time_ms)::NUMERIC,
    'Simplifique o prompt ou reduza o tamanho do contexto'::TEXT,
    'Redução estimada de 40% no tempo de resposta'::TEXT,
    CASE WHEN AVG(l.response_time_ms) > 15000 THEN 'high' WHEN AVG(l.response_time_ms) > 10000 THEN 'medium' ELSE 'low' END::TEXT,
    'Tempo de resposta médio está acima do ideal.'::TEXT, NULL::NUMERIC, 40::NUMERIC, 'low'::TEXT
  FROM ai_usage_logs l WHERE l.created_at > now() - INTERVAL '7 days' AND l.success = true AND l.response_time_ms IS NOT NULL
  GROUP BY l.function_name HAVING AVG(l.response_time_ms) > 8000;

  RETURN QUERY
  SELECT l.function_name, 'caching'::TEXT, COUNT(*)::NUMERIC,
    'Implemente cache de respostas para requisições similares'::TEXT,
    'Redução estimada de 50% nas chamadas de API e custos'::TEXT, 'high'::TEXT,
    'Função recebe alto volume de requisições.'::TEXT,
    (AVG(l.estimated_cost_usd) * COUNT(*) * 0.5)::NUMERIC, 50::NUMERIC, 'low'::TEXT
  FROM ai_usage_logs l WHERE l.created_at > now() - INTERVAL '7 days' AND l.success = true
  GROUP BY l.function_name HAVING COUNT(*) > 100;

  RETURN QUERY
  SELECT l.function_name, 'circuit_breaker'::TEXT,
    (COUNT(*) FILTER (WHERE NOT l.success) * 100.0 / COUNT(*))::NUMERIC,
    'Ajuste os parâmetros do circuit breaker'::TEXT,
    'Melhoria na resiliência e redução de falhas consecutivas'::TEXT,
    CASE WHEN (COUNT(*) FILTER (WHERE NOT l.success) * 100.0 / COUNT(*)) > 10 THEN 'critical'
      WHEN (COUNT(*) FILTER (WHERE NOT l.success) * 100.0 / COUNT(*)) > 5 THEN 'high' ELSE 'medium' END::TEXT,
    'Taxa de falha está elevada.'::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'high'::TEXT
  FROM ai_usage_logs l WHERE l.created_at > now() - INTERVAL '7 days'
  GROUP BY l.function_name HAVING COUNT(*) > 10 AND (COUNT(*) FILTER (WHERE NOT l.success) * 100.0 / COUNT(*)) > 3;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_budget_status()
RETURNS TABLE(monthly_limit numeric, current_spending numeric, percentage_used numeric, remaining_budget numeric, projected_monthly_spending numeric, days_in_month integer, days_elapsed integer, is_over_budget boolean, alert_threshold_reached boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE v_config RECORD; v_days_in_month INTEGER; v_days_elapsed INTEGER; v_daily_avg NUMERIC;
BEGIN
  SELECT * INTO v_config FROM public.ai_budget_config LIMIT 1;
  IF v_config IS NULL THEN
    RETURN QUERY SELECT 100.00::NUMERIC, 0::NUMERIC, 0::NUMERIC, 100.00::NUMERIC, 0::NUMERIC, 30::INTEGER, 0::INTEGER, false::BOOLEAN, false::BOOLEAN;
    RETURN;
  END IF;
  v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'));
  v_days_elapsed := EXTRACT(DAY FROM CURRENT_DATE);
  IF v_days_elapsed > 0 THEN v_daily_avg := v_config.current_month_spending / v_days_elapsed; ELSE v_daily_avg := 0; END IF;
  RETURN QUERY SELECT v_config.monthly_limit_usd, v_config.current_month_spending,
    CASE WHEN v_config.monthly_limit_usd > 0 THEN (v_config.current_month_spending / v_config.monthly_limit_usd * 100) ELSE 0 END,
    v_config.monthly_limit_usd - v_config.current_month_spending, v_daily_avg * v_days_in_month, v_days_in_month, v_days_elapsed,
    v_config.current_month_spending > v_config.monthly_limit_usd,
    (v_config.current_month_spending / NULLIF(v_config.monthly_limit_usd, 0) * 100) >= v_config.alert_threshold_percentage;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_cache_stats()
RETURNS TABLE(total_cached_responses bigint, total_cache_hits bigint, cache_hit_rate numeric, estimated_cost_saved numeric, total_cached_tokens bigint, avg_cache_age_hours numeric, most_cached_functions jsonb, cache_size_mb numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH cache_summary AS (
    SELECT COUNT(*)::BIGINT as total_responses, SUM(hit_count)::BIGINT as total_hits, SUM(tokens_used)::BIGINT as total_tokens,
      AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600)::NUMERIC as avg_age_hours
    FROM public.ai_response_cache WHERE expires_at > NOW()
  ), function_stats AS (
    SELECT function_name, COUNT(*) as cache_count, SUM(hit_count) as hits
    FROM public.ai_response_cache WHERE expires_at > NOW() GROUP BY function_name ORDER BY hits DESC LIMIT 10
  ), cost_savings AS (
    SELECT SUM(hit_count * 0.001)::NUMERIC as saved FROM public.ai_response_cache WHERE expires_at > NOW()
  )
  SELECT cs.total_responses, cs.total_hits,
    CASE WHEN cs.total_responses > 0 THEN ROUND((cs.total_hits::NUMERIC / (cs.total_responses + cs.total_hits)) * 100, 2) ELSE 0 END,
    COALESCE(cost.saved, 0), cs.total_tokens, ROUND(cs.avg_age_hours, 2),
    (SELECT jsonb_agg(jsonb_build_object('function_name', function_name, 'cache_count', cache_count, 'hits', hits)) FROM function_stats),
    ROUND((pg_total_relation_size('ai_response_cache'::regclass) / 1024.0 / 1024.0)::NUMERIC, 2)
  FROM cache_summary cs CROSS JOIN cost_savings cost;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_response_cache WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.invalidate_cache_by_function(_function_name text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_response_cache WHERE function_name = _function_name;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.invalidate_all_cache()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_response_cache;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_daily_cache_performance()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE v_today DATE := CURRENT_DATE; v_hit_rate NUMERIC; v_total_requests BIGINT; v_total_hits BIGINT;
BEGIN
  SELECT CASE WHEN COUNT(*) > 0 THEN ROUND((SUM(hit_count)::NUMERIC / (COUNT(*) + SUM(hit_count))) * 100, 2) ELSE 0 END,
    COUNT(*), SUM(hit_count) INTO v_hit_rate, v_total_requests, v_total_hits
  FROM public.ai_response_cache WHERE DATE(created_at) = v_today;
  INSERT INTO public.cache_performance_daily (date, cache_hit_rate, total_requests, total_hits)
  VALUES (v_today, v_hit_rate, v_total_requests, v_total_hits)
  ON CONFLICT (date) DO UPDATE SET cache_hit_rate = EXCLUDED.cache_hit_rate, total_requests = EXCLUDED.total_requests,
    total_hits = EXCLUDED.total_hits, created_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.check_cache_performance_alert()
RETURNS TABLE(should_alert boolean, avg_hit_rate numeric, days_below_threshold integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE v_threshold NUMERIC := 15.0; v_days_required INTEGER := 3; v_consecutive_days INTEGER := 0; v_avg_rate NUMERIC;
BEGIN
  WITH last_days AS (
    SELECT cache_hit_rate, date FROM public.cache_performance_daily WHERE date >= CURRENT_DATE - INTERVAL '3 days' ORDER BY date DESC LIMIT 3
  )
  SELECT COUNT(*) FILTER (WHERE cache_hit_rate < v_threshold), AVG(cache_hit_rate) INTO v_consecutive_days, v_avg_rate FROM last_days;
  RETURN QUERY SELECT (v_consecutive_days >= v_days_required), COALESCE(v_avg_rate, 0), v_consecutive_days;
END;
$$;

-- =====================================================
-- 6. TRIGGERS (on auth.users - create via Supabase Dashboard)
-- =====================================================
-- NOTA: Os triggers abaixo devem ser criados no Supabase Dashboard
-- pois referenciam a tabela auth.users:
--
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
--
-- CREATE TRIGGER on_auth_user_created_role
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Trigger para ai_webhook_config
CREATE TRIGGER update_ai_webhook_config_updated_at
  BEFORE UPDATE ON public.ai_webhook_config
  FOR EACH ROW EXECUTE FUNCTION public.update_ai_webhook_config_updated_at();

-- =====================================================
-- 7. STORAGE BUCKETS
-- =====================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('exam-images', 'exam-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('bioimpedance-images', 'bioimpedance-images', true);

-- =====================================================
-- 8. EDGE FUNCTIONS (lista - código nos arquivos)
-- =====================================================
-- As edge functions estão em supabase/functions/:
--   - admin-reset-password
--   - analyze-exam
--   - analyze-exams-integrated
--   - analyze-wearable-data
--   - apple-health-auth
--   - chat-exams
--   - check-token-expiration
--   - cleanup-old-uploads
--   - disconnect-wearable
--   - google-fit-auth
--   - google-fit-webhook
--   - preview-ocr
--   - proactive-token-refresh
--   - process-bioimpedance
--   - process-ocr
--   - seed-bioimpedance-data
--   - send-monthly-ai-report
--   - send-monthly-report
--   - send-scheduled-reports
--   - send-webhook-notification
--   - signup-with-validation
--   - suggest-supplements
--   - sync-google-fit-data
--   - sync-google-fit
--   - test-monthly-report
--   - update-goal-progress
--
-- Secrets necessários:
--   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PUBLISHABLE_KEY,
--   OAUTH_ENCRYPTION_KEY, GROQ_API_KEY, ANTHROPIC_API_KEY, RESEND_API_KEY,
--   SUPABASE_ANON_KEY, SUPABASE_DB_URL, GOOGLE_AI_API_KEY, LOVABLE_API_KEY,
--   GOOGLE_FIT_CLIENT_ID, GOOGLE_FIT_CLIENT_SECRET
