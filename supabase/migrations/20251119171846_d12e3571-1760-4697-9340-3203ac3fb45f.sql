-- Corrigir warnings de segurança da migração anterior

-- 1. Adicionar search_path seguro à função validate_connection_tokens
DROP FUNCTION IF EXISTS validate_connection_tokens() CASCADE;
CREATE OR REPLACE FUNCTION validate_connection_tokens()
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

-- Recriar trigger
DROP TRIGGER IF EXISTS validate_connection_tokens_trigger ON wearable_connections;
CREATE TRIGGER validate_connection_tokens_trigger
  BEFORE INSERT OR UPDATE ON wearable_connections
  FOR EACH ROW
  EXECUTE FUNCTION validate_connection_tokens();
