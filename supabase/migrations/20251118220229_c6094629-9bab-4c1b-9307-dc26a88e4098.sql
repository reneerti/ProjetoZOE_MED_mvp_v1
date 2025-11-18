-- Create bioimpedance-scans storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('bioimpedance-scans', 'bioimpedance-scans', false);

-- Allow authenticated users to upload their own bioimpedance scans
CREATE POLICY "Users can upload their own bioimpedance scans"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bioimpedance-scans' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view their own bioimpedance scans
CREATE POLICY "Users can view their own bioimpedance scans"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'bioimpedance-scans' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own bioimpedance scans
CREATE POLICY "Users can delete their own bioimpedance scans"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'bioimpedance-scans' AND
  auth.uid()::text = (storage.foldername(name))[1]
);