-- Add missing DELETE policy for profiles table
-- This allows users to delete their own profile data, ensuring GDPR compliance (Article 17 - Right to Erasure)
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = id);