import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerConfig {
  failure_threshold: number;
  failure_window_minutes: number;
  cooldown_seconds: number;
  enable_notifications: boolean;
}

export class CircuitBreaker {
  private functionName: string;
  private config: CircuitBreakerConfig;
  private supabase: any;

  constructor(functionName: string, supabase: any) {
    this.functionName = functionName;
    this.supabase = supabase;
    this.config = {
      failure_threshold: 5,
      failure_window_minutes: 5,
      cooldown_seconds: 60,
      enable_notifications: true
    };
  }

  async initialize(): Promise<void> {
    // Carregar configuração do banco
    const { data } = await this.supabase
      .from('ai_circuit_breaker_config')
      .select('*')
      .limit(1)
      .single();

    if (data) {
      this.config = {
        failure_threshold: data.failure_threshold,
        failure_window_minutes: data.failure_window_minutes,
        cooldown_seconds: data.cooldown_seconds,
        enable_notifications: data.enable_notifications
      };
    }
  }

  async checkState(): Promise<{ allowed: boolean; state: CircuitState; reason?: string }> {
    try {
      // Obter estado atual do circuit breaker
      const { data: state } = await this.supabase
        .from('ai_circuit_breaker_state')
        .select('*')
        .eq('function_name', this.functionName)
        .single();

      if (!state) {
        // Primeiro uso, circuit fechado
        return { allowed: true, state: 'closed' };
      }

      const now = new Date();
      const currentState = state.state as CircuitState;

      // Se circuit está aberto
      if (currentState === 'open') {
        const openedAt = new Date(state.opened_at);
        const cooldownMs = this.config.cooldown_seconds * 1000;
        const timeSinceOpened = now.getTime() - openedAt.getTime();

        // Verificar se período de cooldown passou
        if (timeSinceOpened >= cooldownMs) {
          // Mudar para half_open
          await this.updateState('half_open', state.failure_count);
          return { allowed: true, state: 'half_open' };
        }

        return { 
          allowed: false, 
          state: 'open',
          reason: `Circuit breaker aberto. Aguarde ${Math.ceil((cooldownMs - timeSinceOpened) / 1000)}s`
        };
      }

      // Se circuit está fechado ou half_open, verificar taxa de falhas recente
      const { data: failureRate } = await this.supabase
        .rpc('get_ai_failure_rate', {
          _function_name: this.functionName,
          _minutes: this.config.failure_window_minutes
        })
        .single();

      if (failureRate && failureRate.failed_requests >= this.config.failure_threshold) {
        // Abrir circuit breaker
        await this.updateState('open', failureRate.failed_requests);
        
        console.error(`🔴 Circuit breaker ABERTO para ${this.functionName}`);
        console.error(`  Falhas: ${failureRate.failed_requests}/${failureRate.total_requests}`);
        console.error(`  Taxa: ${failureRate.failure_rate}%`);

        return { 
          allowed: false, 
          state: 'open',
          reason: `Taxa de falhas muito alta (${failureRate.failure_rate}%). Circuit breaker ativado.`
        };
      }

      return { allowed: true, state: currentState };

    } catch (error) {
      console.error('❌ Erro ao verificar circuit breaker:', error);
      // Em caso de erro, permitir requisição (fail open)
      return { allowed: true, state: 'closed' };
    }
  }

  async recordSuccess(): Promise<void> {
    try {
      // Se estava em half_open, voltar para closed
      const { data: state } = await this.supabase
        .from('ai_circuit_breaker_state')
        .select('state')
        .eq('function_name', this.functionName)
        .single();

      if (state?.state === 'half_open') {
        await this.updateState('closed', 0);
        console.log(`✅ Circuit breaker FECHADO para ${this.functionName}`);
      }
    } catch (error) {
      console.error('❌ Erro ao registrar sucesso:', error);
    }
  }

  async recordFailure(): Promise<void> {
    try {
      const { data: state } = await this.supabase
        .from('ai_circuit_breaker_state')
        .select('*')
        .eq('function_name', this.functionName)
        .single();

      const currentCount = state?.failure_count || 0;
      
      // Incrementar contador de falhas
      await this.updateState(state?.state || 'closed', currentCount + 1);

    } catch (error) {
      console.error('❌ Erro ao registrar falha:', error);
    }
  }

  private async updateState(newState: CircuitState, failureCount: number): Promise<void> {
    await this.supabase.rpc('record_circuit_breaker_state', {
      _function_name: this.functionName,
      _new_state: newState,
      _failure_count: failureCount
    });
  }
}

/**
 * Wrapper para executar função com circuit breaker
 */
export async function withCircuitBreaker<T>(
  functionName: string,
  supabase: any,
  operation: () => Promise<T>
): Promise<T> {
  const circuitBreaker = new CircuitBreaker(functionName, supabase);
  await circuitBreaker.initialize();

  // Verificar estado do circuit breaker
  const { allowed, state, reason } = await circuitBreaker.checkState();

  if (!allowed) {
    throw new Error(reason || 'Circuit breaker aberto');
  }

  try {
    const result = await operation();
    await circuitBreaker.recordSuccess();
    return result;
  } catch (error) {
    await circuitBreaker.recordFailure();
    throw error;
  }
}
