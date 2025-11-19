-- Fix SECURITY DEFINER function to include fixed search_path
CREATE OR REPLACE FUNCTION public.validate_connection_tokens()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Garantir que access_token ou refresh_token existam
  IF NEW.access_token IS NULL AND NEW.refresh_token IS NULL THEN
    RAISE EXCEPTION 'Pelo menos um token (access ou refresh) deve ser fornecido';
  END IF;
  
  -- Validar formato do provider
  IF NEW.provider NOT IN ('google_fit', 'apple_health') THEN
    RAISE EXCEPTION 'Provider inválido: %', NEW.provider;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;