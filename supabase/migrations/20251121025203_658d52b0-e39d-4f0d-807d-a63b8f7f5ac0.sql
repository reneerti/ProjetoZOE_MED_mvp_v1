-- Add RLS policies to allow controllers to view assigned patients' data

-- exam_images: Controllers can view assigned patients' exam images
CREATE POLICY "Controllers can view assigned patients exam images"
ON public.exam_images
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.controller_patients cp
    WHERE cp.controller_id = auth.uid()
    AND cp.patient_id = exam_images.user_id
  ) OR
  public.has_role(auth.uid(), 'admin')
);

-- exam_results: Controllers can view assigned patients' exam results
CREATE POLICY "Controllers can view assigned patients exam results"
ON public.exam_results
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.exam_images ei
    WHERE ei.id = exam_results.exam_image_id
    AND (
      ei.user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.controller_patients cp
        WHERE cp.controller_id = auth.uid()
        AND cp.patient_id = ei.user_id
      ) OR
      public.has_role(auth.uid(), 'admin')
    )
  )
);

-- health_alerts: Controllers can view assigned patients' health alerts
CREATE POLICY "Controllers can view assigned patients health alerts"
ON public.health_alerts
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.controller_patients cp
    WHERE cp.controller_id = auth.uid()
    AND cp.patient_id = health_alerts.user_id
  ) OR
  public.has_role(auth.uid(), 'admin')
);

-- health_analysis: Controllers can view assigned patients' health analysis
CREATE POLICY "Controllers can view assigned patients health analysis"
ON public.health_analysis
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.controller_patients cp
    WHERE cp.controller_id = auth.uid()
    AND cp.patient_id = health_analysis.user_id
  ) OR
  public.has_role(auth.uid(), 'admin')
);

-- bioimpedance_measurements: Controllers can view assigned patients' bioimpedance data
CREATE POLICY "Controllers can view assigned patients bioimpedance"
ON public.bioimpedance_measurements
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.controller_patients cp
    WHERE cp.controller_id = auth.uid()
    AND cp.patient_id = bioimpedance_measurements.user_id
  ) OR
  public.has_role(auth.uid(), 'admin')
);

-- wearable_data: Controllers can view assigned patients' wearable data
CREATE POLICY "Controllers can view assigned patients wearable data"
ON public.wearable_data
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.controller_patients cp
    WHERE cp.controller_id = auth.uid()
    AND cp.patient_id = wearable_data.user_id
  ) OR
  public.has_role(auth.uid(), 'admin')
);

-- medications: Controllers can view assigned patients' medications
CREATE POLICY "Controllers can view assigned patients medications"
ON public.medications
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.controller_patients cp
    WHERE cp.controller_id = auth.uid()
    AND cp.patient_id = medications.user_id
  ) OR
  public.has_role(auth.uid(), 'admin')
);

-- supplements: Controllers can view assigned patients' supplements
CREATE POLICY "Controllers can view assigned patients supplements"
ON public.supplements
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.controller_patients cp
    WHERE cp.controller_id = auth.uid()
    AND cp.patient_id = supplements.user_id
  ) OR
  public.has_role(auth.uid(), 'admin')
);

-- exams: Controllers can view assigned patients' exams
CREATE POLICY "Controllers can view assigned patients exams"
ON public.exams
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.controller_patients cp
    WHERE cp.controller_id = auth.uid()
    AND cp.patient_id = exams.user_id
  ) OR
  public.has_role(auth.uid(), 'admin')
);

-- wearable_connections: Controllers can view assigned patients' wearable connections
CREATE POLICY "Controllers can view assigned patients wearable connections"
ON public.wearable_connections
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.controller_patients cp
    WHERE cp.controller_id = auth.uid()
    AND cp.patient_id = wearable_connections.user_id
  ) OR
  public.has_role(auth.uid(), 'admin')
);

-- evolution_notes: Controllers can view assigned patients' evolution notes
CREATE POLICY "Controllers can view assigned patients evolution notes"
ON public.evolution_notes
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.controller_patients cp
    WHERE cp.controller_id = auth.uid()
    AND cp.patient_id = evolution_notes.user_id
  ) OR
  public.has_role(auth.uid(), 'admin')
);

-- body_composition_goals: Controllers can view assigned patients' goals
CREATE POLICY "Controllers can view assigned patients goals"
ON public.body_composition_goals
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.controller_patients cp
    WHERE cp.controller_id = auth.uid()
    AND cp.patient_id = body_composition_goals.user_id
  ) OR
  public.has_role(auth.uid(), 'admin')
);

-- supplement_recommendations: Controllers can view assigned patients' supplement recommendations
CREATE POLICY "Controllers can view assigned patients supplement recommendations"
ON public.supplement_recommendations
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.controller_patients cp
    WHERE cp.controller_id = auth.uid()
    AND cp.patient_id = supplement_recommendations.user_id
  ) OR
  public.has_role(auth.uid(), 'admin')
);

-- bioimpedance_uploads: Controllers can view assigned patients' bioimpedance uploads
CREATE POLICY "Controllers can view assigned patients bioimpedance uploads"
ON public.bioimpedance_uploads
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.controller_patients cp
    WHERE cp.controller_id = auth.uid()
    AND cp.patient_id = bioimpedance_uploads.user_id
  ) OR
  public.has_role(auth.uid(), 'admin')
);