import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

/**
 * Verifica se um usuário tem permissão para acessar dados de um paciente
 * Retorna true se:
 * - O usuário é o próprio paciente
 * - O usuário é um controller atribuído ao paciente
 * - O usuário é um admin
 */
export async function verifyPatientAccess(
  supabase: SupabaseClient,
  userId: string,
  patientId: string
): Promise<boolean> {
  // Caso 1: Usuário é o próprio paciente
  if (userId === patientId) {
    return true;
  }

  // Caso 2: Usuário é um controller atribuído ao paciente
  const { data: isController, error: controllerError } = await supabase
    .rpc('is_patient_of_controller', {
      _controller_id: userId,
      _patient_id: patientId
    });

  if (!controllerError && isController) {
    return true;
  }

  // Caso 3: Usuário é admin
  const { data: isAdmin, error: adminError } = await supabase
    .rpc('has_role', {
      _user_id: userId,
      _role: 'admin'
    });

  if (!adminError && isAdmin) {
    return true;
  }

  return false;
}

/**
 * Gera ID único para rastreamento de erros
 */
export function generateErrorId(): string {
  return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Retorna mensagem de erro genérica para o cliente
 * Registra detalhes completos no console para debugging
 */
export function handleErrorResponse(
  error: unknown,
  context: string,
  corsHeaders: Record<string, string>
): Response {
  const errorId = generateErrorId();
  
  // Log detalhado no servidor
  console.error(`[${errorId}] Error in ${context}:`, {
    error,
    timestamp: new Date().toISOString(),
    context
  });

  // Resposta genérica para o cliente
  return new Response(
    JSON.stringify({
      error: 'Erro ao processar sua solicitação. Por favor, tente novamente.',
      errorId,
      timestamp: new Date().toISOString()
    }),
    {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
