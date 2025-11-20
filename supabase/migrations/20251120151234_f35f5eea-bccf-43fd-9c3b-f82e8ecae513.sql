-- Create admin audit logs table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert audit logs
CREATE POLICY "Service role can insert audit logs"
  ON public.admin_audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Create system configuration table
CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Admins can manage system config
CREATE POLICY "Admins can manage system config"
  ON public.system_config
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON public.system_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system configurations
INSERT INTO public.system_config (config_key, config_value, description)
VALUES 
  ('max_upload_size_mb', '{"value": 10}', 'Tamanho máximo de upload em MB'),
  ('cache_ttl_hours', '{"value": 24}', 'Tempo de vida do cache em horas'),
  ('alert_threshold_critical', '{"value": 90}', 'Threshold para alertas críticos (%)'),
  ('alert_threshold_warning', '{"value": 75}', 'Threshold para alertas de aviso (%)'),
  ('max_exams_per_month_free', '{"value": 10}', 'Número máximo de exames por mês no plano gratuito'),
  ('auto_cleanup_days', '{"value": 90}', 'Dias antes de limpeza automática de uploads antigos')
ON CONFLICT (config_key) DO NOTHING;

-- Create index for faster queries
CREATE INDEX idx_admin_audit_logs_user_id ON public.admin_audit_logs(user_id);
CREATE INDEX idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX idx_admin_audit_logs_action ON public.admin_audit_logs(action);

COMMENT ON TABLE public.admin_audit_logs IS 'Logs de auditoria para ações administrativas';
COMMENT ON TABLE public.system_config IS 'Configurações globais do sistema';