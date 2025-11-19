-- Expandir sistema de roles para incluir controller
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'controller';

-- Criar tabela de planos/módulos
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  max_exams_per_month INTEGER,
  modules_enabled JSONB NOT NULL DEFAULT '{"exams": true, "bioimpedance": false, "medications": false, "supplements": false, "evolution": false, "goals": false}'::jsonb,
  price_monthly NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de assinaturas de usuários
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  exams_used_this_month INTEGER NOT NULL DEFAULT 0,
  current_period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  current_period_end DATE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de relacionamento controlador-paciente
CREATE TABLE IF NOT EXISTS public.controller_patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  controller_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(controller_id, patient_id)
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controller_patients ENABLE ROW LEVEL SECURITY;

-- RLS Policies para subscription_plans
CREATE POLICY "Everyone can view plans"
ON public.subscription_plans
FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage plans"
ON public.subscription_plans
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies para user_subscriptions
CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
ON public.user_subscriptions
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage subscriptions"
ON public.user_subscriptions
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies para controller_patients
CREATE POLICY "Controllers can view their patients"
ON public.controller_patients
FOR SELECT
USING (auth.uid() = controller_id);

CREATE POLICY "Admins can manage all controller-patient relationships"
ON public.controller_patients
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Função helper para verificar se usuário é paciente de um controlador
CREATE OR REPLACE FUNCTION public.is_patient_of_controller(_controller_id uuid, _patient_id uuid)
RETURNS boolean
LANGUAGE sql
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

-- Função helper para obter todos os pacientes de um controlador
CREATE OR REPLACE FUNCTION public.get_controller_patients(_controller_id uuid)
RETURNS TABLE(patient_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT patient_id
  FROM public.controller_patients
  WHERE controller_id = _controller_id
$$;

-- Triggers para updated_at
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_controller_patients_updated_at
BEFORE UPDATE ON public.controller_patients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir planos padrão
INSERT INTO public.subscription_plans (name, max_exams_per_month, modules_enabled, price_monthly) VALUES
('Básico', 10, '{"exams": true, "bioimpedance": false, "medications": false, "supplements": false, "evolution": false, "goals": false}'::jsonb, 29.90),
('Profissional', 50, '{"exams": true, "bioimpedance": true, "medications": true, "supplements": true, "evolution": true, "goals": false}'::jsonb, 79.90),
('Premium', NULL, '{"exams": true, "bioimpedance": true, "medications": true, "supplements": true, "evolution": true, "goals": true}'::jsonb, 149.90);