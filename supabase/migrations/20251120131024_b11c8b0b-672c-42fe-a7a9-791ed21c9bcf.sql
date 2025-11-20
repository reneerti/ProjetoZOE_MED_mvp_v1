-- Create storage buckets for exam and bioimpedance uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('exam-images', 'exam-images', true, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']),
  ('bioimpedance-images', 'bioimpedance-images', true, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  file_size_limit = EXCLUDED.file_size_limit;

-- RLS policies for exam-images bucket
CREATE POLICY "Users can upload their own exam images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exam-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own exam images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'exam-images' AND
  (auth.uid()::text = (storage.foldername(name))[1] OR 
   public.has_role(auth.uid(), 'admin') OR
   public.has_role(auth.uid(), 'controller'))
);

CREATE POLICY "Users can delete their own exam images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'exam-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Public read access for exam images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'exam-images');

-- RLS policies for bioimpedance-images bucket
CREATE POLICY "Users can upload their own bioimpedance images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bioimpedance-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own bioimpedance images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'bioimpedance-images' AND
  (auth.uid()::text = (storage.foldername(name))[1] OR 
   public.has_role(auth.uid(), 'admin') OR
   public.has_role(auth.uid(), 'controller'))
);

CREATE POLICY "Users can delete their own bioimpedance images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'bioimpedance-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Public read access for bioimpedance images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'bioimpedance-images');