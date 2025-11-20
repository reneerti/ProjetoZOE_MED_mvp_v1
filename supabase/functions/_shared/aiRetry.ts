import { callAIWithFallback } from './aiFallback.ts';
import { withCircuitBreaker } from './circuitBreaker.ts';

export interface RetryOptions {
  maxRetries?: number;
  onRetry?: (attempt: number, error: Error) => void;
  shouldRetry?: (error: Error) => boolean;
  supabase?: any;
}

/**
 * Chama IA com retry automático em caso de erro de parsing ou validação
 * 
 * @param params Parâmetros para chamada da IA
 * @param userId ID do usuário
 * @param functionName Nome da função para logging
 * @param options Opções de retry
 * @returns Response da IA
 */
export async function callAIWithRetry(
  params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    tools?: any[];
    tool_choice?: any;
  },
  userId: string,
  functionName: string,
  options: RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    supabase,
    onRetry = (attempt, error) => {
      console.log(`🔄 Tentativa ${attempt}/${maxRetries} após erro: ${error.message}`);
    },
    shouldRetry = (error) => {
      // Não fazer retry em circuit breaker aberto
      if (error.message.includes('Circuit breaker')) {
        return false;
      }
      // Retry em erros de parsing/validação, mas não em erros de rate limit ou falta de créditos
      const message = error.message.toLowerCase();
      return message.includes('parse') || 
             message.includes('validation') || 
             message.includes('schema') ||
             message.includes('json');
    }
  } = options;

  let lastError: Error | null = null;
  
  // Função que será executada com circuit breaker
  const executeAICall = async () => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🤖 Tentativa ${attempt}/${maxRetries} - Chamando IA (${params.model})...`);
        
        const response = await callAIWithFallback(params, userId, functionName);
        
        // Verificar se resposta é válida
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`AI request failed: ${response.status} - ${errorText}`);
        }
        
        console.log(`✅ Resposta da IA recebida na tentativa ${attempt}`);
        return response;
      
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        console.error(`❌ Tentativa ${attempt} falhou:`, lastError.message);
        
        // Se não devemos fazer retry, lançar erro imediatamente
        if (!shouldRetry(lastError)) {
          console.log('⚠️ Erro não é recuperável, não fazendo retry');
          throw lastError;
        }
        
        // Se foi a última tentativa, lançar erro
        if (attempt === maxRetries) {
          console.error(`❌ Todas as ${maxRetries} tentativas falharam`);
          throw new Error(`AI call failed after ${maxRetries} attempts: ${lastError.message}`);
        }
        
        // Notificar callback de retry
        onRetry(attempt, lastError);
        
        // Aguardar antes da próxima tentativa (backoff exponencial)
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ Aguardando ${delayMs}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    // Este ponto nunca deve ser alcançado, mas TypeScript não sabe disso
    throw lastError || new Error('Unknown error in retry logic');
  };

  // Se temos supabase client, usar circuit breaker
  if (supabase) {
    return withCircuitBreaker(functionName, supabase, executeAICall);
  }
  
  // Caso contrário, executar diretamente
  return executeAICall();
}
