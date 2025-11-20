-- Adicionar Microsoft Teams ao webhook_type
ALTER TABLE public.ai_webhook_config 
DROP CONSTRAINT IF EXISTS ai_webhook_config_webhook_type_check;

ALTER TABLE public.ai_webhook_config 
ADD CONSTRAINT ai_webhook_config_webhook_type_check 
CHECK (webhook_type IN ('slack', 'discord', 'teams'));

-- Criar tabela de configuração de auto-tuning
CREATE TABLE IF NOT EXISTS public.ai_autotuning_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT false,
  auto_apply_low_risk BOOLEAN NOT NULL DEFAULT false,
  auto_apply_medium_risk BOOLEAN NOT NULL DEFAULT false,
  require_admin_approval BOOLEAN NOT NULL DEFAULT true,
  min_confidence_score NUMERIC NOT NULL DEFAULT 0.8,
  max_daily_applications INTEGER NOT NULL DEFAULT 5,
  excluded_functions TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Criar tabela de histórico de auto-tuning
CREATE TABLE IF NOT EXISTS public.ai_autotuning_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES public.ai_optimization_recommendations(id),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_by UUID REFERENCES auth.users(id),
  auto_applied BOOLEAN NOT NULL DEFAULT false,
  previous_config JSONB,
  new_config JSONB,
  result TEXT,
  success BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies para ai_autotuning_config
ALTER TABLE public.ai_autotuning_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage autotuning config"
  ON public.ai_autotuning_config
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies para ai_autotuning_history
ALTER TABLE public.ai_autotuning_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view autotuning history"
  ON public.ai_autotuning_history
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert autotuning history"
  ON public.ai_autotuning_history
  FOR INSERT
  WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER ai_autotuning_config_updated_at
  BEFORE UPDATE ON public.ai_autotuning_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir configuração padrão de auto-tuning
INSERT INTO public.ai_autotuning_config (
  enabled,
  auto_apply_low_risk,
  auto_apply_medium_risk,
  require_admin_approval,
  min_confidence_score,
  max_daily_applications
) VALUES (
  false,
  false,
  false,
  true,
  0.8,
  5
) ON CONFLICT DO NOTHING;