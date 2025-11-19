-- Server-side password validation function
-- This function can be used by edge functions or custom auth flows to validate password strength
-- Note: Cannot be directly applied to auth.users table (Supabase-managed), but can be used in custom signup flows

CREATE OR REPLACE FUNCTION public.validate_password_strength(password_text TEXT)
RETURNS TABLE(valid BOOLEAN, errors TEXT[]) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  error_list TEXT[] := ARRAY[]::TEXT[];
  is_valid BOOLEAN := TRUE;
BEGIN
  -- Check minimum length
  IF LENGTH(password_text) < 8 THEN
    error_list := array_append(error_list, 'Senha deve ter no mínimo 8 caracteres');
    is_valid := FALSE;
  END IF;

  -- Check maximum length (prevent DoS)
  IF LENGTH(password_text) > 128 THEN
    error_list := array_append(error_list, 'Senha muito longa (máximo 128 caracteres)');
    is_valid := FALSE;
  END IF;

  -- Check for uppercase letter
  IF password_text !~ '[A-Z]' THEN
    error_list := array_append(error_list, 'Senha deve conter pelo menos uma letra maiúscula');
    is_valid := FALSE;
  END IF;

  -- Check for lowercase letter
  IF password_text !~ '[a-z]' THEN
    error_list := array_append(error_list, 'Senha deve conter pelo menos uma letra minúscula');
    is_valid := FALSE;
  END IF;

  -- Check for number
  IF password_text !~ '[0-9]' THEN
    error_list := array_append(error_list, 'Senha deve conter pelo menos um número');
    is_valid := FALSE;
  END IF;

  -- Check for special character
  IF password_text !~ '[^A-Za-z0-9]' THEN
    error_list := array_append(error_list, 'Senha deve conter pelo menos um caractere especial');
    is_valid := FALSE;
  END IF;

  -- Check for common weak passwords
  IF LOWER(password_text) = ANY(ARRAY[
    'password', 'senha123', '12345678', 'qwerty123', 
    'abc123456', 'password123', 'admin123', 'user1234'
  ]) THEN
    error_list := array_append(error_list, 'Senha muito comum, escolha uma senha mais segura');
    is_valid := FALSE;
  END IF;

  RETURN QUERY SELECT is_valid, error_list;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.validate_password_strength(TEXT) TO authenticated;

COMMENT ON FUNCTION public.validate_password_strength(TEXT) IS 
'Validates password strength according to security requirements. Returns validation status and error messages.
Requirements: min 8 chars, max 128 chars, uppercase, lowercase, number, special character, not common password.
Usage: SELECT * FROM validate_password_strength(''MyP@ssw0rd'');';