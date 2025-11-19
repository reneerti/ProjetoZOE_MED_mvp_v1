-- Create bioimpedance upload history table
CREATE TABLE IF NOT EXISTS public.bioimpedance_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  error_message TEXT,
  extracted_data JSONB,
  manual_corrections JSONB,
  measurement_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.bioimpedance_uploads ENABLE ROW LEVEL SECURITY;

-- Policies for bioimpedance_uploads
CREATE POLICY "Users can view own uploads"
  ON public.bioimpedance_uploads
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own uploads"
  ON public.bioimpedance_uploads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own uploads"
  ON public.bioimpedance_uploads
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own uploads"
  ON public.bioimpedance_uploads
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_bioimpedance_uploads_user_status ON public.bioimpedance_uploads(user_id, status);
CREATE INDEX idx_bioimpedance_uploads_created_at ON public.bioimpedance_uploads(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_bioimpedance_uploads_updated_at
  BEFORE UPDATE ON public.bioimpedance_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();