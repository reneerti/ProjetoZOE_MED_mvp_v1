-- Adicionar criptografia aos tokens OAuth usando Supabase Vault
-- Criar função para criptografar/descriptografar tokens

-- Nota: Esta migração prepara a estrutura para criptografia
-- Os tokens serão criptografados via edge functions usando o Supabase Vault

-- Adicionar coluna para indicar se o token está criptografado
ALTER TABLE wearable_connections 
ADD COLUMN IF NOT EXISTS tokens_encrypted BOOLEAN DEFAULT false;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_wearable_connections_user_provider 
ON wearable_connections(user_id, provider);

-- Adicionar comentários explicativos
COMMENT ON COLUMN wearable_connections.tokens_encrypted IS 
'Indica se os tokens OAuth estão criptografados usando Supabase Vault';

-- Criar função para validar integridade dos tokens
CREATE OR REPLACE FUNCTION validate_connection_tokens()
RETURNS TRIGGER AS $$
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

-- Criar trigger para validação
DROP TRIGGER IF EXISTS validate_connection_tokens_trigger ON wearable_connections;
CREATE TRIGGER validate_connection_tokens_trigger
  BEFORE INSERT OR UPDATE ON wearable_connections
  FOR EACH ROW
  EXECUTE FUNCTION validate_connection_tokens();

-- Criar tabela de auditoria para rastrear acessos aos tokens
CREATE TABLE IF NOT EXISTS wearable_token_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES wearable_connections(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'refreshed', 'accessed', 'revoked'
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para auditoria (apenas serviço pode escrever)
ALTER TABLE wearable_token_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage audit logs"
  ON wearable_token_audit
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Índice para auditoria
CREATE INDEX IF NOT EXISTS idx_token_audit_connection 
ON wearable_token_audit(connection_id, created_at DESC);
