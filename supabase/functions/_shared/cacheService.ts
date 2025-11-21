/**
 * Serviço de Cache Inteligente para Resultados de IA
 *
 * Features:
 * - Cache em banco de dados (persistente)
 * - TTL configurável por tipo de dado
 * - Processamento incremental (só processa novos dados)
 * - Hash de conteúdo para invalidação automática
 * - Métricas de hit/miss para otimização
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface CacheEntry<T = any> {
  id: string;
  cacheKey: string;
  contentHash: string;
  data: T;
  provider: string;
  model: string;
  tokensUsed: number;
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;
  lastAccessedAt: Date;
}

export interface CacheConfig {
  defaultTTLHours: number;
  maxEntriesPerUser: number;
  enableCompression: boolean;
}

const DEFAULT_CONFIG: CacheConfig = {
  defaultTTLHours: 72, // 3 dias para análises
  maxEntriesPerUser: 100,
  enableCompression: false,
};

/**
 * Gera hash SHA-256 do conteúdo para identificação única
 */
async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

/**
 * Gera chave de cache combinando contexto
 */
export function generateCacheKey(
  functionName: string,
  userId: string,
  inputData: string | object
): string {
  const input = typeof inputData === 'string' ? inputData : JSON.stringify(inputData);
  const combined = `${functionName}:${userId}:${input}`;
  // Hash simples para chave
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `${functionName}_${userId.substring(0, 8)}_${Math.abs(hash).toString(36)}`;
}

/**
 * Classe principal do serviço de cache
 */
export class CacheService {
  private supabase: SupabaseClient;
  private config: CacheConfig;

  constructor(supabaseUrl: string, supabaseKey: string, config?: Partial<CacheConfig>) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Busca entrada no cache
   */
  async get<T>(cacheKey: string): Promise<T | null> {
    try {
      const { data, error } = await this.supabase
        .from('ai_response_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      // Atualizar métricas de acesso
      await this.supabase
        .from('ai_response_cache')
        .update({
          hit_count: (data.hit_count || 0) + 1,
          last_accessed_at: new Date().toISOString(),
        })
        .eq('id', data.id);

      console.log(`✓ Cache HIT para ${cacheKey}`);
      return data.response_data as T;
    } catch (error) {
      console.error('Erro ao buscar cache:', error);
      return null;
    }
  }

  /**
   * Salva entrada no cache
   */
  async set<T>(
    cacheKey: string,
    data: T,
    options: {
      functionName: string;
      contentHash?: string;
      provider?: string;
      model?: string;
      tokensUsed?: number;
      ttlHours?: number;
    }
  ): Promise<boolean> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + (options.ttlHours || this.config.defaultTTLHours));

      const contentHash = options.contentHash ||
        await generateContentHash(JSON.stringify(data));

      // Verificar se já existe cache com mesmo hash (evitar duplicatas)
      const { data: existing } = await this.supabase
        .from('ai_response_cache')
        .select('id')
        .eq('cache_key', cacheKey)
        .eq('prompt_hash', contentHash)
        .single();

      if (existing) {
        // Atualizar expiração existente
        await this.supabase
          .from('ai_response_cache')
          .update({ expires_at: expiresAt.toISOString() })
          .eq('id', existing.id);
        return true;
      }

      // Inserir novo cache
      const { error } = await this.supabase
        .from('ai_response_cache')
        .insert({
          cache_key: cacheKey,
          function_name: options.functionName,
          prompt_hash: contentHash,
          response_data: data,
          provider: options.provider || 'unknown',
          model: options.model || 'unknown',
          tokens_used: options.tokensUsed || 0,
          expires_at: expiresAt.toISOString(),
          hit_count: 0,
        });

      if (error) {
        console.error('Erro ao salvar cache:', error);
        return false;
      }

      console.log(`✓ Cache salvo: ${cacheKey} (expira em ${options.ttlHours || this.config.defaultTTLHours}h)`);
      return true;
    } catch (error) {
      console.error('Erro ao salvar cache:', error);
      return false;
    }
  }

  /**
   * Invalida cache por chave
   */
  async invalidate(cacheKey: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('ai_response_cache')
        .delete()
        .eq('cache_key', cacheKey);

      if (error) {
        console.error('Erro ao invalidar cache:', error);
        return false;
      }

      console.log(`✓ Cache invalidado: ${cacheKey}`);
      return true;
    } catch (error) {
      console.error('Erro ao invalidar cache:', error);
      return false;
    }
  }

  /**
   * Invalida todos os caches de uma função
   */
  async invalidateByFunction(functionName: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('ai_response_cache')
        .delete()
        .eq('function_name', functionName)
        .select('id');

      if (error) {
        console.error('Erro ao invalidar caches:', error);
        return 0;
      }

      const count = data?.length || 0;
      console.log(`✓ ${count} caches invalidados para ${functionName}`);
      return count;
    } catch (error) {
      console.error('Erro ao invalidar caches:', error);
      return 0;
    }
  }

  /**
   * Limpa caches expirados
   */
  async cleanup(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('ai_response_cache')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        console.error('Erro ao limpar caches:', error);
        return 0;
      }

      const count = data?.length || 0;
      console.log(`✓ ${count} caches expirados removidos`);
      return count;
    } catch (error) {
      console.error('Erro ao limpar caches:', error);
      return 0;
    }
  }

  /**
   * Retorna estatísticas do cache
   */
  async getStats(): Promise<{
    totalEntries: number;
    totalHits: number;
    hitRate: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('ai_response_cache')
        .select('hit_count, created_at')
        .gt('expires_at', new Date().toISOString());

      if (error || !data) {
        return { totalEntries: 0, totalHits: 0, hitRate: 0, oldestEntry: null, newestEntry: null };
      }

      const totalEntries = data.length;
      const totalHits = data.reduce((sum, entry) => sum + (entry.hit_count || 0), 0);
      const dates = data.map(e => new Date(e.created_at)).sort((a, b) => a.getTime() - b.getTime());

      return {
        totalEntries,
        totalHits,
        hitRate: totalEntries > 0 ? (totalHits / (totalHits + totalEntries)) * 100 : 0,
        oldestEntry: dates[0] || null,
        newestEntry: dates[dates.length - 1] || null,
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return { totalEntries: 0, totalHits: 0, hitRate: 0, oldestEntry: null, newestEntry: null };
    }
  }
}

/**
 * Processamento Incremental - Verifica se dados mudaram
 */
export class IncrementalProcessor {
  private supabase: SupabaseClient;
  private processingTable = 'incremental_processing_state';

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Gera hash dos dados do usuário para detectar mudanças
   */
  async getUserDataHash(userId: string): Promise<string> {
    // Buscar dados relevantes do usuário
    const [exams, results] = await Promise.all([
      this.supabase
        .from('exam_images')
        .select('id, updated_at')
        .eq('user_id', userId)
        .eq('processing_status', 'completed'),
      this.supabase
        .from('exam_results')
        .select('id, updated_at')
        .eq('exam_image_id', userId), // Isso vai ser filtrado
    ]);

    const dataString = JSON.stringify({
      examCount: exams.data?.length || 0,
      lastExamUpdate: exams.data?.[0]?.updated_at || '',
      resultCount: results.data?.length || 0,
    });

    return await generateContentHash(dataString);
  }

  /**
   * Verifica se precisa reprocessar
   */
  async needsReprocessing(userId: string, functionName: string): Promise<boolean> {
    try {
      const currentHash = await this.getUserDataHash(userId);

      const { data: state } = await this.supabase
        .from('ai_response_cache')
        .select('prompt_hash, updated_at')
        .eq('function_name', functionName)
        .eq('cache_key', `${functionName}_${userId}`)
        .single();

      if (!state) {
        console.log(`📊 ${functionName}: Primeiro processamento para usuário`);
        return true;
      }

      if (state.prompt_hash !== currentHash) {
        console.log(`📊 ${functionName}: Dados mudaram, reprocessamento necessário`);
        return true;
      }

      // Verificar idade do cache (reprocessar se muito antigo)
      const cacheAge = Date.now() - new Date(state.updated_at).getTime();
      const maxAgeMs = 7 * 24 * 60 * 60 * 1000; // 7 dias

      if (cacheAge > maxAgeMs) {
        console.log(`📊 ${functionName}: Cache expirado por idade`);
        return true;
      }

      console.log(`📊 ${functionName}: Usando cache existente`);
      return false;
    } catch (error) {
      console.error('Erro ao verificar necessidade de reprocessamento:', error);
      return true; // Em caso de erro, reprocessar
    }
  }

  /**
   * Obtém apenas novos exames desde último processamento
   */
  async getNewExamsSince(userId: string, lastProcessedAt: Date): Promise<any[]> {
    const { data } = await this.supabase
      .from('exam_images')
      .select('*')
      .eq('user_id', userId)
      .eq('processing_status', 'completed')
      .gt('created_at', lastProcessedAt.toISOString())
      .order('created_at', { ascending: false });

    return data || [];
  }
}

/**
 * Factory para criar instância do serviço de cache
 */
export function createCacheService(config?: Partial<CacheConfig>): CacheService {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return new CacheService(supabaseUrl, supabaseKey, config);
}

/**
 * Factory para criar processador incremental
 */
export function createIncrementalProcessor(): IncrementalProcessor {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return new IncrementalProcessor(supabaseUrl, supabaseKey);
}
