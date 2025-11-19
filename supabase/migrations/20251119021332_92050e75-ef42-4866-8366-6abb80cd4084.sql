-- Add UPDATE policy for exam_results table
CREATE POLICY "Users can update their own exam results"
ON exam_results FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM exam_images ei
    WHERE ei.id = exam_results.exam_image_id
    AND ei.user_id = auth.uid()
  )
);

-- Add DELETE policy for exam_results table
CREATE POLICY "Users can delete their own exam results"
ON exam_results FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM exam_images ei
    WHERE ei.id = exam_results.exam_image_id
    AND ei.user_id = auth.uid()
  )
);