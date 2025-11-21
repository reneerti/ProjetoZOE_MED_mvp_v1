/**
 * Middleware de Segurança para Edge Functions
 *
 * Implementa:
 * - CORS com whitelist de domínios
 * - Rate limiting robusto
 * - Validação de headers
 * - Proteção contra ataques comuns
 * - Logging de segurança
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ═══════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DE SEGURANÇA
// ═══════════════════════════════════════════════════════════════

/**
 * Lista de domínios permitidos para CORS
 * Em produção, adicione apenas os domínios da aplicação
 */
const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:5173',
  'https://irlfnzxmeympvsslbnwn.supabase.co',
  'https://zoe-med.app',
  'https://www.zoe-med.app',
  // Adicione outros domínios autorizados aqui
];

/**
 * Headers de segurança padrão
 */
export function getSecurityHeaders(origin?: string | null): Record<string, string> {
  // Verificar se a origem está na whitelist
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    // CORS
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',

    // Segurança
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',

    // Cache
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
  };
}

/**
 * CORS Headers simplificados para desenvolvimento
 * USE APENAS EM DESENVOLVIMENTO
 */
export function getDevCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };
}

// ═══════════════════════════════════════════════════════════════
// AUTENTICAÇÃO
// ═══════════════════════════════════════════════════════════════

export interface AuthResult {
  authenticated: boolean;
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
  error?: string;
}

/**
 * Valida autenticação do usuário
 */
export async function authenticateRequest(
  authHeader: string | null,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<AuthResult> {
  if (!authHeader) {
    return { authenticated: false, error: 'Authorization header missing' };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Invalid authorization format' };
  }

  const token = authHeader.replace('Bearer ', '');

  if (token.length < 100) {
    return { authenticated: false, error: 'Invalid token format' };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { authenticated: false, error: error?.message || 'User not found' };
    }

    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      }
    };
  } catch (error) {
    return {
      authenticated: false,
      error: error instanceof Error ? error.message : 'Authentication failed'
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt?: string;
  retryAfter?: number;
}

/**
 * Verifica rate limit usando RPC do Supabase
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string,
  maxRequests: number = 60,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_user_id: userId,
      p_endpoint: endpoint,
      p_max_requests: maxRequests,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      console.error('Rate limit check failed:', error);
      // Em caso de erro, permitir para não bloquear usuários
      return { allowed: true, remaining: maxRequests };
    }

    return {
      allowed: data?.allowed ?? true,
      remaining: data?.remaining ?? maxRequests,
      resetAt: data?.reset_at,
      retryAfter: data?.retry_after,
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    return { allowed: true, remaining: maxRequests };
  }
}

// ═══════════════════════════════════════════════════════════════
// VALIDAÇÃO DE INPUT
// ═══════════════════════════════════════════════════════════════

/**
 * Valida e sanitiza URL de arquivo
 */
export function validateFileUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  // Verificar protocolo
  if (!url.startsWith('https://')) {
    return { valid: false, error: 'Only HTTPS URLs are allowed' };
  }

  // Verificar domínios permitidos para arquivos
  const allowedDomains = [
    'irlfnzxmeympvsslbnwn.supabase.co',
    'storage.googleapis.com',
    'firebasestorage.googleapis.com',
  ];

  try {
    const urlObj = new URL(url);
    if (!allowedDomains.some(domain => urlObj.hostname.includes(domain))) {
      return { valid: false, error: 'File URL domain not allowed' };
    }
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Verificar extensão de arquivo
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  const hasValidExtension = allowedExtensions.some(ext =>
    url.toLowerCase().includes(ext)
  );

  if (!hasValidExtension) {
    return { valid: false, error: 'Invalid file type' };
  }

  return { valid: true };
}

/**
 * Sanitiza string removendo caracteres perigosos
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') return '';

  return input
    .substring(0, maxLength)
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript:
    .replace(/data:/gi, '') // Remove data:
    .replace(/vbscript:/gi, '') // Remove vbscript:
    .trim();
}

/**
 * Valida UUID
 */
export function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// ═══════════════════════════════════════════════════════════════
// LOGGING DE SEGURANÇA
// ═══════════════════════════════════════════════════════════════

export interface SecurityEvent {
  type: 'auth_failure' | 'rate_limit' | 'invalid_input' | 'suspicious_activity';
  userId?: string;
  ip?: string;
  endpoint: string;
  details: string;
  timestamp: string;
}

/**
 * Registra evento de segurança
 */
export async function logSecurityEvent(
  supabase: SupabaseClient,
  event: SecurityEvent
): Promise<void> {
  try {
    // Log no console para debugging
    console.warn(`🔒 Security Event [${event.type}]: ${event.details}`);

    // Se tiver tabela de audit logs, salvar lá
    await supabase
      .from('admin_audit_logs')
      .insert({
        admin_user_id: event.userId || '00000000-0000-0000-0000-000000000000',
        action: `security_${event.type}`,
        target_type: 'security',
        target_id: event.endpoint,
        details: {
          type: event.type,
          ip: event.ip,
          details: event.details,
        },
        created_at: event.timestamp,
      })
      .then(() => {})
      .catch(() => {}); // Silently fail if table doesn't exist
  } catch (error) {
    // Não falhar por erro de logging
    console.error('Failed to log security event:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE COMPLETO
// ═══════════════════════════════════════════════════════════════

export interface MiddlewareResult {
  success: boolean;
  user?: AuthResult['user'];
  headers: Record<string, string>;
  error?: {
    status: number;
    message: string;
  };
}

/**
 * Middleware completo de segurança
 */
export async function securityMiddleware(
  req: Request,
  options: {
    requireAuth?: boolean;
    rateLimitMax?: number;
    rateLimitWindow?: number;
    endpoint: string;
  }
): Promise<MiddlewareResult> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

  const origin = req.headers.get('Origin');
  const headers = getSecurityHeaders(origin);

  // Handle OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    return { success: true, headers };
  }

  // Autenticação
  if (options.requireAuth !== false) {
    const authHeader = req.headers.get('Authorization');
    const authResult = await authenticateRequest(authHeader, SUPABASE_URL, SUPABASE_ANON_KEY);

    if (!authResult.authenticated) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await logSecurityEvent(supabase, {
        type: 'auth_failure',
        endpoint: options.endpoint,
        details: authResult.error || 'Authentication failed',
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        headers,
        error: { status: 401, message: authResult.error || 'Unauthorized' }
      };
    }

    // Rate limiting
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const rateLimit = await checkRateLimit(
      supabase,
      authResult.user!.id,
      options.endpoint,
      options.rateLimitMax || 60,
      options.rateLimitWindow || 60
    );

    if (!rateLimit.allowed) {
      await logSecurityEvent(supabase, {
        type: 'rate_limit',
        userId: authResult.user!.id,
        endpoint: options.endpoint,
        details: `Rate limit exceeded. Reset at: ${rateLimit.resetAt}`,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        headers: {
          ...headers,
          'Retry-After': String(rateLimit.retryAfter || 60),
          'X-RateLimit-Remaining': '0',
        },
        error: { status: 429, message: 'Rate limit exceeded' }
      };
    }

    return {
      success: true,
      user: authResult.user,
      headers: {
        ...headers,
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      }
    };
  }

  return { success: true, headers };
}
