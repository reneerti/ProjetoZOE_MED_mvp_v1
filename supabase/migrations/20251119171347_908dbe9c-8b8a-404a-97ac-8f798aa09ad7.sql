-- Create table to store OAuth tokens for automatic sync
CREATE TABLE IF NOT EXISTS public.wearable_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL, -- 'google_fit', 'apple_health', etc
  access_token TEXT, -- Encrypted in production
  refresh_token TEXT, -- Encrypted in production
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[], -- OAuth scopes granted
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sync_at TIMESTAMPTZ,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE public.wearable_connections ENABLE ROW LEVEL SECURITY;

-- Users can view their own connections
CREATE POLICY "Users can view their own wearable connections"
ON public.wearable_connections
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own connections
CREATE POLICY "Users can create their own wearable connections"
ON public.wearable_connections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own connections
CREATE POLICY "Users can update their own wearable connections"
ON public.wearable_connections
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own connections
CREATE POLICY "Users can delete their own wearable connections"
ON public.wearable_connections
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_wearable_connections_user_provider ON public.wearable_connections(user_id, provider);
CREATE INDEX idx_wearable_connections_sync ON public.wearable_connections(sync_enabled, last_sync_at) WHERE sync_enabled = true;

-- Trigger to update updated_at
CREATE TRIGGER update_wearable_connections_updated_at
BEFORE UPDATE ON public.wearable_connections
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
