--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: check_rate_limit(uuid, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_rate_limit(p_user_id uuid, p_endpoint text, p_max_requests integer, p_window_seconds integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_current_count INTEGER;
  v_window_start TIMESTAMPTZ;
  v_now TIMESTAMPTZ := now();
  v_allowed BOOLEAN;
BEGIN
  -- Get or create rate limit record
  SELECT request_count, window_start
  INTO v_current_count, v_window_start
  FROM rate_limits
  WHERE user_id = p_user_id AND endpoint = p_endpoint;

  -- If no record exists or window has expired, create/reset
  IF NOT FOUND OR (v_now - v_window_start) > (p_window_seconds || ' seconds')::INTERVAL THEN
    INSERT INTO rate_limits (user_id, endpoint, request_count, window_start)
    VALUES (p_user_id, p_endpoint, 1, v_now)
    ON CONFLICT (user_id, endpoint)
    DO UPDATE SET
      request_count = 1,
      window_start = v_now,
      updated_at = v_now;
    
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', p_max_requests - 1,
      'reset_at', v_now + (p_window_seconds || ' seconds')::INTERVAL
    );
  END IF;

  -- Check if limit exceeded
  IF v_current_count >= p_max_requests THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'reset_at', v_window_start + (p_window_seconds || ' seconds')::INTERVAL,
      'retry_after', EXTRACT(EPOCH FROM (v_window_start + (p_window_seconds || ' seconds')::INTERVAL - v_now))::INTEGER
    );
  END IF;

  -- Increment counter
  UPDATE rate_limits
  SET request_count = request_count + 1,
      updated_at = v_now
  WHERE user_id = p_user_id AND endpoint = p_endpoint;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', p_max_requests - v_current_count - 1,
    'reset_at', v_window_start + (p_window_seconds || ' seconds')::INTERVAL
  );
END;
$$;


--
-- Name: cleanup_old_rate_limits(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_rate_limits() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM rate_limits
  WHERE updated_at < now() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;


--
-- Name: get_admin_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_admin_stats() RETURNS TABLE(total_users bigint, total_measurements bigint, total_uploads bigint, successful_uploads bigint, failed_uploads bigint, total_storage_mb numeric, this_month_uploads bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT bm.user_id)::BIGINT as total_users,
    COUNT(DISTINCT bm.id)::BIGINT as total_measurements,
    COUNT(DISTINCT bu.id)::BIGINT as total_uploads,
    SUM(CASE WHEN bu.status = 'completed' THEN 1 ELSE 0 END)::BIGINT as successful_uploads,
    SUM(CASE WHEN bu.status = 'error' THEN 1 ELSE 0 END)::BIGINT as failed_uploads,
    0::NUMERIC as total_storage_mb,
    COUNT(DISTINCT CASE 
      WHEN bu.created_at >= date_trunc('month', now()) 
      THEN bu.id 
    END)::BIGINT as this_month_uploads
  FROM bioimpedance_measurements bm
  LEFT JOIN bioimpedance_uploads bu ON bu.measurement_id = bm.id;
END;
$$;


--
-- Name: get_all_users_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_all_users_admin() RETURNS TABLE(user_id uuid, email text, display_name text, total_uploads bigint, last_upload timestamp with time zone, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
BEGIN
  -- Only allow admins to call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email,
    p.display_name,
    COUNT(bu.id)::BIGINT as total_uploads,
    MAX(bu.created_at) as last_upload,
    au.created_at
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  LEFT JOIN public.bioimpedance_uploads bu ON bu.user_id = au.id
  GROUP BY au.id, au.email, p.display_name, au.created_at
  ORDER BY au.created_at DESC;
END;
$$;


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(_user_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;


--
-- Name: get_user_stats(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_stats(_user_id uuid) RETURNS TABLE(total_measurements bigint, total_uploads bigint, successful_uploads bigint, failed_uploads bigint, this_month_uploads bigint, storage_used_mb numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT bm.id)::BIGINT as total_measurements,
    COUNT(DISTINCT bu.id)::BIGINT as total_uploads,
    SUM(CASE WHEN bu.status = 'completed' THEN 1 ELSE 0 END)::BIGINT as successful_uploads,
    SUM(CASE WHEN bu.status = 'error' THEN 1 ELSE 0 END)::BIGINT as failed_uploads,
    COUNT(DISTINCT CASE 
      WHEN bu.created_at >= date_trunc('month', now()) 
      THEN bu.id 
    END)::BIGINT as this_month_uploads,
    0::NUMERIC as storage_used_mb
  FROM bioimpedance_measurements bm
  LEFT JOIN bioimpedance_uploads bu ON bu.user_id = _user_id AND bu.measurement_id = bm.id
  WHERE bm.user_id = _user_id;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user_role() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: bioimpedance_measurements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bioimpedance_measurements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    measurement_date date NOT NULL,
    weight numeric(5,2) NOT NULL,
    body_fat_percentage numeric(4,2),
    muscle_mass numeric(5,2),
    water_percentage numeric(4,2),
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: bioimpedance_uploads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bioimpedance_uploads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    image_url text NOT NULL,
    status text DEFAULT 'processing'::text NOT NULL,
    error_message text,
    extracted_data jsonb,
    manual_corrections jsonb,
    measurement_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone
);


--
-- Name: body_composition_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.body_composition_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    goal_type text NOT NULL,
    target_value numeric NOT NULL,
    start_value numeric NOT NULL,
    current_value numeric,
    start_date date DEFAULT CURRENT_DATE NOT NULL,
    target_date date NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);


--
-- Name: evolution_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evolution_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    note_date date NOT NULL,
    health_score numeric(3,1),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT evolution_notes_health_score_check CHECK (((health_score >= (0)::numeric) AND (health_score <= (10)::numeric)))
);


--
-- Name: exam_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    icon text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: exam_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid,
    user_id uuid NOT NULL,
    image_url text NOT NULL,
    ocr_text text,
    processing_status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    exam_type_id uuid,
    exam_category_id uuid,
    exam_date date,
    lab_name text,
    CONSTRAINT exam_images_processing_status_check CHECK ((processing_status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: exam_parameters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_parameters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_type_id uuid,
    parameter_name text NOT NULL,
    unit text,
    reference_min numeric,
    reference_max numeric,
    critical_low numeric,
    critical_high numeric,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: exam_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_image_id uuid,
    parameter_id uuid,
    parameter_name text NOT NULL,
    value numeric,
    value_text text,
    unit text,
    status text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT exam_results_status_check CHECK ((status = ANY (ARRAY['normal'::text, 'low'::text, 'high'::text, 'critical_low'::text, 'critical_high'::text])))
);


--
-- Name: exam_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    exam_name text NOT NULL,
    exam_date date NOT NULL,
    status text NOT NULL,
    results jsonb DEFAULT '{}'::jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    category_id uuid,
    type_id uuid,
    CONSTRAINT exams_status_check CHECK ((status = ANY (ARRAY['normal'::text, 'attention'::text, 'abnormal'::text])))
);


--
-- Name: goal_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goal_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    goal_id uuid NOT NULL,
    notification_type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    progress_percentage numeric,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: health_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    exam_image_id uuid,
    parameter_name text NOT NULL,
    value numeric NOT NULL,
    critical_threshold numeric NOT NULL,
    threshold_type text NOT NULL,
    severity text NOT NULL,
    status text DEFAULT 'unread'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    read_at timestamp with time zone,
    CONSTRAINT health_alerts_severity_check CHECK ((severity = ANY (ARRAY['warning'::text, 'critical'::text]))),
    CONSTRAINT health_alerts_status_check CHECK ((status = ANY (ARRAY['unread'::text, 'read'::text, 'dismissed'::text]))),
    CONSTRAINT health_alerts_threshold_type_check CHECK ((threshold_type = ANY (ARRAY['high'::text, 'low'::text])))
);


--
-- Name: health_analysis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_analysis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    health_score numeric,
    analysis_summary jsonb,
    attention_points jsonb,
    specialist_recommendations jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: medications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    medication_name text NOT NULL,
    current_dose text NOT NULL,
    start_date date NOT NULL,
    schedule jsonb DEFAULT '{}'::jsonb,
    notes text,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    display_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rate_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    request_count integer DEFAULT 1 NOT NULL,
    window_start timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: supplement_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplement_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplement_id uuid NOT NULL,
    user_id uuid NOT NULL,
    taken_at timestamp with time zone DEFAULT now() NOT NULL,
    dose_taken text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: supplement_recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplement_recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    supplement_name text NOT NULL,
    recommended_dose text NOT NULL,
    reasoning text NOT NULL,
    based_on_exam_id uuid,
    based_on_bioimpedance_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: supplements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    supplement_name text NOT NULL,
    supplement_type text NOT NULL,
    current_dose text NOT NULL,
    unit text NOT NULL,
    frequency text NOT NULL,
    time_of_day text,
    start_date date NOT NULL,
    end_date date,
    notes text,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: bioimpedance_measurements bioimpedance_measurements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bioimpedance_measurements
    ADD CONSTRAINT bioimpedance_measurements_pkey PRIMARY KEY (id);


--
-- Name: bioimpedance_uploads bioimpedance_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bioimpedance_uploads
    ADD CONSTRAINT bioimpedance_uploads_pkey PRIMARY KEY (id);


--
-- Name: body_composition_goals body_composition_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.body_composition_goals
    ADD CONSTRAINT body_composition_goals_pkey PRIMARY KEY (id);


--
-- Name: evolution_notes evolution_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evolution_notes
    ADD CONSTRAINT evolution_notes_pkey PRIMARY KEY (id);


--
-- Name: exam_categories exam_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_categories
    ADD CONSTRAINT exam_categories_pkey PRIMARY KEY (id);


--
-- Name: exam_images exam_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_images
    ADD CONSTRAINT exam_images_pkey PRIMARY KEY (id);


--
-- Name: exam_parameters exam_parameters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_parameters
    ADD CONSTRAINT exam_parameters_pkey PRIMARY KEY (id);


--
-- Name: exam_results exam_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_results
    ADD CONSTRAINT exam_results_pkey PRIMARY KEY (id);


--
-- Name: exam_types exam_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_types
    ADD CONSTRAINT exam_types_pkey PRIMARY KEY (id);


--
-- Name: exams exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_pkey PRIMARY KEY (id);


--
-- Name: goal_notifications goal_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_notifications
    ADD CONSTRAINT goal_notifications_pkey PRIMARY KEY (id);


--
-- Name: health_alerts health_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_alerts
    ADD CONSTRAINT health_alerts_pkey PRIMARY KEY (id);


--
-- Name: health_analysis health_analysis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_analysis
    ADD CONSTRAINT health_analysis_pkey PRIMARY KEY (id);


--
-- Name: health_analysis health_analysis_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_analysis
    ADD CONSTRAINT health_analysis_user_id_key UNIQUE (user_id);


--
-- Name: medications medications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: rate_limits rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (id);


--
-- Name: rate_limits rate_limits_user_id_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_user_id_endpoint_key UNIQUE (user_id, endpoint);


--
-- Name: supplement_logs supplement_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplement_logs
    ADD CONSTRAINT supplement_logs_pkey PRIMARY KEY (id);


--
-- Name: supplement_recommendations supplement_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplement_recommendations
    ADD CONSTRAINT supplement_recommendations_pkey PRIMARY KEY (id);


--
-- Name: supplements supplements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplements
    ADD CONSTRAINT supplements_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_bioimpedance_uploads_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bioimpedance_uploads_created_at ON public.bioimpedance_uploads USING btree (created_at DESC);


--
-- Name: idx_bioimpedance_uploads_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bioimpedance_uploads_user_status ON public.bioimpedance_uploads USING btree (user_id, status);


--
-- Name: idx_health_alerts_exam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_health_alerts_exam ON public.health_alerts USING btree (exam_image_id);


--
-- Name: idx_health_alerts_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_health_alerts_user_status ON public.health_alerts USING btree (user_id, status, created_at DESC);


--
-- Name: idx_rate_limits_user_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rate_limits_user_endpoint ON public.rate_limits USING btree (user_id, endpoint);


--
-- Name: idx_rate_limits_window_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rate_limits_window_start ON public.rate_limits USING btree (window_start);


--
-- Name: exams set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: medications set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.medications FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: profiles set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: bioimpedance_measurements update_bioimpedance_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bioimpedance_updated_at BEFORE UPDATE ON public.bioimpedance_measurements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bioimpedance_uploads update_bioimpedance_uploads_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bioimpedance_uploads_updated_at BEFORE UPDATE ON public.bioimpedance_uploads FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: body_composition_goals update_body_composition_goals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_body_composition_goals_updated_at BEFORE UPDATE ON public.body_composition_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: evolution_notes update_evolution_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_evolution_notes_updated_at BEFORE UPDATE ON public.evolution_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: exams update_exams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: health_analysis update_health_analysis_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_health_analysis_updated_at BEFORE UPDATE ON public.health_analysis FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: medications update_medications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_medications_updated_at BEFORE UPDATE ON public.medications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rate_limits update_rate_limits_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_rate_limits_updated_at BEFORE UPDATE ON public.rate_limits FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: supplement_recommendations update_supplement_recommendations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_supplement_recommendations_updated_at BEFORE UPDATE ON public.supplement_recommendations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: supplements update_supplements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_supplements_updated_at BEFORE UPDATE ON public.supplements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bioimpedance_measurements bioimpedance_measurements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bioimpedance_measurements
    ADD CONSTRAINT bioimpedance_measurements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: evolution_notes evolution_notes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evolution_notes
    ADD CONSTRAINT evolution_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: exam_images exam_images_exam_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_images
    ADD CONSTRAINT exam_images_exam_category_id_fkey FOREIGN KEY (exam_category_id) REFERENCES public.exam_categories(id);


--
-- Name: exam_images exam_images_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_images
    ADD CONSTRAINT exam_images_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: exam_images exam_images_exam_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_images
    ADD CONSTRAINT exam_images_exam_type_id_fkey FOREIGN KEY (exam_type_id) REFERENCES public.exam_types(id);


--
-- Name: exam_images exam_images_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_images
    ADD CONSTRAINT exam_images_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: exam_parameters exam_parameters_exam_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_parameters
    ADD CONSTRAINT exam_parameters_exam_type_id_fkey FOREIGN KEY (exam_type_id) REFERENCES public.exam_types(id) ON DELETE CASCADE;


--
-- Name: exam_results exam_results_exam_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_results
    ADD CONSTRAINT exam_results_exam_image_id_fkey FOREIGN KEY (exam_image_id) REFERENCES public.exam_images(id) ON DELETE CASCADE;


--
-- Name: exam_results exam_results_parameter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_results
    ADD CONSTRAINT exam_results_parameter_id_fkey FOREIGN KEY (parameter_id) REFERENCES public.exam_parameters(id) ON DELETE SET NULL;


--
-- Name: exam_types exam_types_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_types
    ADD CONSTRAINT exam_types_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.exam_categories(id) ON DELETE CASCADE;


--
-- Name: exams exams_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.exam_categories(id);


--
-- Name: exams exams_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_type_id_fkey FOREIGN KEY (type_id) REFERENCES public.exam_types(id);


--
-- Name: exams exams_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: goal_notifications goal_notifications_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_notifications
    ADD CONSTRAINT goal_notifications_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.body_composition_goals(id) ON DELETE CASCADE;


--
-- Name: health_alerts health_alerts_exam_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_alerts
    ADD CONSTRAINT health_alerts_exam_image_id_fkey FOREIGN KEY (exam_image_id) REFERENCES public.exam_images(id) ON DELETE CASCADE;


--
-- Name: medications medications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: supplement_logs supplement_logs_supplement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplement_logs
    ADD CONSTRAINT supplement_logs_supplement_id_fkey FOREIGN KEY (supplement_id) REFERENCES public.supplements(id) ON DELETE CASCADE;


--
-- Name: supplement_recommendations supplement_recommendations_based_on_bioimpedance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplement_recommendations
    ADD CONSTRAINT supplement_recommendations_based_on_bioimpedance_id_fkey FOREIGN KEY (based_on_bioimpedance_id) REFERENCES public.bioimpedance_measurements(id);


--
-- Name: supplement_recommendations supplement_recommendations_based_on_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplement_recommendations
    ADD CONSTRAINT supplement_recommendations_based_on_exam_id_fkey FOREIGN KEY (based_on_exam_id) REFERENCES public.exam_images(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: exam_categories Everyone can view exam categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view exam categories" ON public.exam_categories FOR SELECT USING (true);


--
-- Name: exam_parameters Everyone can view exam parameters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view exam parameters" ON public.exam_parameters FOR SELECT USING (true);


--
-- Name: exam_types Everyone can view exam types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view exam types" ON public.exam_types FOR SELECT USING (true);


--
-- Name: bioimpedance_uploads Users can create own uploads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own uploads" ON public.bioimpedance_uploads FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: bioimpedance_measurements Users can create their own bioimpedance measurements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own bioimpedance measurements" ON public.bioimpedance_measurements FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: evolution_notes Users can create their own evolution notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own evolution notes" ON public.evolution_notes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: exam_images Users can create their own exam images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own exam images" ON public.exam_images FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: exam_results Users can create their own exam results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own exam results" ON public.exam_results FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.exam_images ei
  WHERE ((ei.id = exam_results.exam_image_id) AND (ei.user_id = auth.uid())))));


--
-- Name: exams Users can create their own exams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own exams" ON public.exams FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: body_composition_goals Users can create their own goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own goals" ON public.body_composition_goals FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: health_analysis Users can create their own health analysis; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own health analysis" ON public.health_analysis FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: medications Users can create their own medications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own medications" ON public.medications FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: goal_notifications Users can create their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own notifications" ON public.goal_notifications FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: supplement_recommendations Users can create their own recommendations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own recommendations" ON public.supplement_recommendations FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: supplement_logs Users can create their own supplement logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own supplement logs" ON public.supplement_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: supplements Users can create their own supplements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own supplements" ON public.supplements FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: bioimpedance_measurements Users can delete own bioimpedance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own bioimpedance" ON public.bioimpedance_measurements FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: evolution_notes Users can delete own evolution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own evolution" ON public.evolution_notes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: exam_images Users can delete own exam images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own exam images" ON public.exam_images FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: exams Users can delete own exams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own exams" ON public.exams FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: medications Users can delete own medications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own medications" ON public.medications FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: bioimpedance_uploads Users can delete own uploads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own uploads" ON public.bioimpedance_uploads FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: bioimpedance_measurements Users can delete their own bioimpedance measurements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own bioimpedance measurements" ON public.bioimpedance_measurements FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: evolution_notes Users can delete their own evolution notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own evolution notes" ON public.evolution_notes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: exam_results Users can delete their own exam results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own exam results" ON public.exam_results FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.exam_images ei
  WHERE ((ei.id = exam_results.exam_image_id) AND (ei.user_id = auth.uid())))));


--
-- Name: exams Users can delete their own exams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own exams" ON public.exams FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: body_composition_goals Users can delete their own goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own goals" ON public.body_composition_goals FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: medications Users can delete their own medications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own medications" ON public.medications FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: goal_notifications Users can delete their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own notifications" ON public.goal_notifications FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: supplement_recommendations Users can delete their own recommendations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own recommendations" ON public.supplement_recommendations FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: supplement_logs Users can delete their own supplement logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own supplement logs" ON public.supplement_logs FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: supplements Users can delete their own supplements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own supplements" ON public.supplements FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: bioimpedance_measurements Users can insert own bioimpedance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own bioimpedance" ON public.bioimpedance_measurements FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: evolution_notes Users can insert own evolution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own evolution" ON public.evolution_notes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: exam_images Users can insert own exam images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own exam images" ON public.exam_images FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: exams Users can insert own exams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own exams" ON public.exams FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: medications Users can insert own medications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own medications" ON public.medications FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: health_alerts Users can insert their own health alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own health alerts" ON public.health_alerts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: bioimpedance_measurements Users can update own bioimpedance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own bioimpedance" ON public.bioimpedance_measurements FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: evolution_notes Users can update own evolution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own evolution" ON public.evolution_notes FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: exams Users can update own exams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own exams" ON public.exams FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: medications Users can update own medications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own medications" ON public.medications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: bioimpedance_uploads Users can update own uploads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own uploads" ON public.bioimpedance_uploads FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: bioimpedance_measurements Users can update their own bioimpedance measurements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own bioimpedance measurements" ON public.bioimpedance_measurements FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: evolution_notes Users can update their own evolution notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own evolution notes" ON public.evolution_notes FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: exam_images Users can update their own exam images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own exam images" ON public.exam_images FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: exam_results Users can update their own exam results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own exam results" ON public.exam_results FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.exam_images ei
  WHERE ((ei.id = exam_results.exam_image_id) AND (ei.user_id = auth.uid())))));


--
-- Name: exams Users can update their own exams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own exams" ON public.exams FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: body_composition_goals Users can update their own goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own goals" ON public.body_composition_goals FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: health_alerts Users can update their own health alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own health alerts" ON public.health_alerts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: health_analysis Users can update their own health analysis; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own health analysis" ON public.health_analysis FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: medications Users can update their own medications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own medications" ON public.medications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: goal_notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.goal_notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: supplement_recommendations Users can update their own recommendations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own recommendations" ON public.supplement_recommendations FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: supplement_logs Users can update their own supplement logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own supplement logs" ON public.supplement_logs FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: supplements Users can update their own supplements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own supplements" ON public.supplements FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: bioimpedance_measurements Users can view own bioimpedance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own bioimpedance" ON public.bioimpedance_measurements FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: evolution_notes Users can view own evolution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own evolution" ON public.evolution_notes FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: exam_images Users can view own exam images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own exam images" ON public.exam_images FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: exams Users can view own exams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own exams" ON public.exams FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: medications Users can view own medications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own medications" ON public.medications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: rate_limits Users can view own rate limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own rate limits" ON public.rate_limits FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: bioimpedance_uploads Users can view own uploads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own uploads" ON public.bioimpedance_uploads FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: bioimpedance_measurements Users can view their own bioimpedance measurements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own bioimpedance measurements" ON public.bioimpedance_measurements FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: evolution_notes Users can view their own evolution notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own evolution notes" ON public.evolution_notes FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: exam_images Users can view their own exam images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own exam images" ON public.exam_images FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: exam_results Users can view their own exam results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own exam results" ON public.exam_results FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.exam_images ei
  WHERE ((ei.id = exam_results.exam_image_id) AND (ei.user_id = auth.uid())))));


--
-- Name: exams Users can view their own exams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own exams" ON public.exams FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: body_composition_goals Users can view their own goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own goals" ON public.body_composition_goals FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: health_alerts Users can view their own health alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own health alerts" ON public.health_alerts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: health_analysis Users can view their own health analysis; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own health analysis" ON public.health_analysis FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: medications Users can view their own medications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own medications" ON public.medications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: goal_notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.goal_notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: supplement_recommendations Users can view their own recommendations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own recommendations" ON public.supplement_recommendations FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: supplement_logs Users can view their own supplement logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own supplement logs" ON public.supplement_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: supplements Users can view their own supplements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own supplements" ON public.supplements FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: bioimpedance_measurements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bioimpedance_measurements ENABLE ROW LEVEL SECURITY;

--
-- Name: bioimpedance_uploads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bioimpedance_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: body_composition_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.body_composition_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: evolution_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.evolution_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: exam_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exam_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: exam_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exam_images ENABLE ROW LEVEL SECURITY;

--
-- Name: exam_parameters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exam_parameters ENABLE ROW LEVEL SECURITY;

--
-- Name: exam_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

--
-- Name: exam_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exam_types ENABLE ROW LEVEL SECURITY;

--
-- Name: exams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

--
-- Name: goal_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goal_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: health_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.health_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: health_analysis; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.health_analysis ENABLE ROW LEVEL SECURITY;

--
-- Name: medications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: rate_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: supplement_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supplement_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: supplement_recommendations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supplement_recommendations ENABLE ROW LEVEL SECURITY;

--
-- Name: supplements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supplements ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


