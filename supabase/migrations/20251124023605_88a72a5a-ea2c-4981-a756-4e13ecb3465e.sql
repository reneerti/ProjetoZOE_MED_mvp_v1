-- Remover políticas duplicadas de medications
DROP POLICY IF EXISTS "Users can view their own medications" ON medications;
DROP POLICY IF EXISTS "Users can insert their own medications" ON medications;
DROP POLICY IF EXISTS "Users can update their own medications" ON medications;
DROP POLICY IF EXISTS "Users can delete their own medications" ON medications;

-- Manter apenas as políticas consolidadas
-- As políticas "Users can X own medications" já existem e estão ativas