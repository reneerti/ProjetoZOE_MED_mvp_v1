-- Add audit logging table for token operations
CREATE TABLE IF NOT EXISTS public.oauth_token_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  action text NOT NULL, -- 'token_stored', 'token_rotated', 'token_revoked', 'token_accessed'
  created_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  metadata jsonb
);

-- Enable RLS on audit table
ALTER TABLE public.oauth_token_audit ENABLE ROW LEVEL SECURITY;

-- Only service role can insert audit logs
CREATE POLICY "Service role can insert audit logs"
ON public.oauth_token_audit
FOR INSERT
WITH CHECK ((SELECT auth.jwt())->>'role' = 'service_role');

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
ON public.oauth_token_audit
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_oauth_audit_user_provider 
ON public.oauth_token_audit(user_id, provider, created_at DESC);

-- Add rotation tracking to wearable_connections
ALTER TABLE public.wearable_connections
ADD COLUMN IF NOT EXISTS last_token_rotation timestamptz,
ADD COLUMN IF NOT EXISTS rotation_count integer DEFAULT 0;