-- Atualizar função de validação de senha para aceitar senhas numéricas de 3 caracteres (provisório)
CREATE OR REPLACE FUNCTION public.validate_password_strength(password_text text)
 RETURNS TABLE(valid boolean, errors text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  error_list TEXT[] := ARRAY[]::TEXT[];
  is_valid BOOLEAN := TRUE;
BEGIN
  -- Check minimum length (3 characters for temporary numeric passwords)
  IF LENGTH(password_text) < 3 THEN
    error_list := array_append(error_list, 'Senha deve ter no mínimo 3 caracteres');
    is_valid := FALSE;
  END IF;

  -- Check maximum length (prevent DoS)
  IF LENGTH(password_text) > 128 THEN
    error_list := array_append(error_list, 'Senha muito longa (máximo 128 caracteres)');
    is_valid := FALSE;
  END IF;

  -- Check if password is only numbers
  IF password_text !~ '^[0-9]+$' THEN
    error_list := array_append(error_list, 'Senha deve conter apenas números');
    is_valid := FALSE;
  END IF;

  RETURN QUERY SELECT is_valid, error_list;
END;
$function$;