-- Create email_reports_history table
CREATE TABLE IF NOT EXISTS public.email_reports_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  controller_id UUID NOT NULL,
  recipient_email TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'monthly',
  month TEXT NOT NULL,
  year TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  email_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_reports_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Controllers can view their own report history"
  ON public.email_reports_history
  FOR SELECT
  USING (auth.uid() = controller_id);

CREATE POLICY "Controllers can insert their own report history"
  ON public.email_reports_history
  FOR INSERT
  WITH CHECK (auth.uid() = controller_id);

-- Create index for faster queries
CREATE INDEX idx_email_reports_controller ON public.email_reports_history(controller_id);
CREATE INDEX idx_email_reports_date ON public.email_reports_history(sent_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_email_reports_history_updated_at
  BEFORE UPDATE ON public.email_reports_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();