-- Create storage bucket for exam images
INSERT INTO storage.buckets (id, name, public)
VALUES ('exam-images', 'exam-images', false);

-- Allow authenticated users to upload their own exam images
CREATE POLICY "Users can upload their own exam images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exam-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view their own exam images
CREATE POLICY "Users can view their own exam images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'exam-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own exam images
CREATE POLICY "Users can delete their own exam images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'exam-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);