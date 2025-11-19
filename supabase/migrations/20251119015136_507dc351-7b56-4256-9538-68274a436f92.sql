-- Create supplements table
CREATE TABLE public.supplements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  supplement_name TEXT NOT NULL,
  supplement_type TEXT NOT NULL, -- vitamina, mineral, proteina, aminoacido, outros
  current_dose TEXT NOT NULL,
  unit TEXT NOT NULL, -- mg, g, ml, ui
  frequency TEXT NOT NULL, -- diario, semanal, conforme_necessario
  time_of_day TEXT, -- manha, tarde, noite, refeicoes
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create supplement logs table for tracking intake
CREATE TABLE public.supplement_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplement_id UUID NOT NULL REFERENCES public.supplements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  taken_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  dose_taken TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI recommendations table
CREATE TABLE public.supplement_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  supplement_name TEXT NOT NULL,
  recommended_dose TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  based_on_exam_id UUID REFERENCES public.exam_images(id),
  based_on_bioimpedance_id UUID REFERENCES public.bioimpedance_measurements(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplement_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for supplements
CREATE POLICY "Users can view their own supplements"
  ON public.supplements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own supplements"
  ON public.supplements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own supplements"
  ON public.supplements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own supplements"
  ON public.supplements FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for supplement logs
CREATE POLICY "Users can view their own supplement logs"
  ON public.supplement_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own supplement logs"
  ON public.supplement_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own supplement logs"
  ON public.supplement_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own supplement logs"
  ON public.supplement_logs FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for recommendations
CREATE POLICY "Users can view their own recommendations"
  ON public.supplement_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recommendations"
  ON public.supplement_recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations"
  ON public.supplement_recommendations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recommendations"
  ON public.supplement_recommendations FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_supplements_updated_at
  BEFORE UPDATE ON public.supplements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supplement_recommendations_updated_at
  BEFORE UPDATE ON public.supplement_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();