-- Criar tabela para dados de wearables (Apple Health, Google Fit)
CREATE TABLE IF NOT EXISTS public.wearable_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  steps INTEGER,
  heart_rate INTEGER,
  sleep_hours DECIMAL(4,2),
  calories INTEGER,
  source TEXT NOT NULL CHECK (source IN ('apple_health', 'google_fit', 'manual')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wearable_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own wearable data"
ON public.wearable_data
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wearable data"
ON public.wearable_data
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wearable data"
ON public.wearable_data
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wearable data"
ON public.wearable_data
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_wearable_data_updated_at
BEFORE UPDATE ON public.wearable_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();