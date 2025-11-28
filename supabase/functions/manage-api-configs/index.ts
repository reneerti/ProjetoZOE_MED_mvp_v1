/**
 * Gerenciamento de Configurações de APIs
 *
 * Permite admins gerenciar API keys e configurações de forma centralizada
 * com criptografia e testes de conectividade.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ═══════════════════════════════════════════════════════════════
// Criptografia simples para armazenar API keys
// ═══════════════════════════════════════════════════════════════

const ENCRYPTION_KEY = Deno.env.get('API_CONFIG_ENCRYPTION_KEY') || 'default-key-change-in-production';

async function encrypt(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const key = encoder.encode(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));

  // XOR simples (para produção, use crypto.subtle)
  const encrypted = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    encrypted[i] = data[i] ^ key[i % key.length];
  }

  return btoa(String.fromCharCode(...encrypted));
}

async function decrypt(encryptedText: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = encoder.encode(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));

  const encrypted = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));
  const decrypted = new Uint8Array(encrypted.length);

  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ key[i % key.length];
  }

  return new TextDecoder().decode(decrypted);
}

// ═══════════════════════════════════════════════════════════════
// Testes de Conectividade
// ═══════════════════════════════════════════════════════════════

async function testOCRConfig(config: any): Promise<{ success: boolean; message: string }> {
  try {
    if (!config.api_key) {
      return { success: false, message: 'API Key não configurada' };
    }

    const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='; // 1x1 pixel

    if (config.endpoint.includes('ocr.space')) {
      const formData = new FormData();
      formData.append('base64Image', `data:image/png;base64,${testImage}`);
      formData.append('language', 'por');

      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'apikey': config.api_key },
        body: formData,
      });

      if (response.ok) {
        return { success: true, message: 'OCR.space conectado com sucesso' };
      }
    } else if (config.endpoint.includes('vision.googleapis.com')) {
      const response = await fetch(
        `${config.endpoint}?key=${config.api_key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{ image: { content: testImage }, features: [{ type: 'TEXT_DETECTION' }] }]
          }),
        }
      );

      if (response.ok) {
        return { success: true, message: 'Google Vision conectado com sucesso' };
      }
    }

    return { success: false, message: 'Falha ao testar conexão' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

async function testAIConfig(config: any): Promise<{ success: boolean; message: string }> {
  try {
    if (!config.api_key) {
      return { success: false, message: 'API Key não configurada' };
    }

    const testMessage = [{ role: 'user', content: 'Hello' }];
    let response;

    if (config.endpoint.includes('groq.com')) {
      response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.api_key}`,
        },
        body: JSON.stringify({
          model: config.model || 'llama-3.3-70b-versatile',
          messages: testMessage,
          max_tokens: 5,
        }),
      });
    } else if (config.endpoint.includes('generativelanguage.googleapis.com')) {
      response = await fetch(
        `${config.endpoint}/${config.model}:generateContent?key=${config.api_key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
          }),
        }
      );
    } else {
      // Generic OpenAI-compatible endpoint
      response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.api_key}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: testMessage,
          max_tokens: 5,
        }),
      });
    }

    if (response && response.ok) {
      return { success: true, message: `${config.model || 'IA'} conectado com sucesso` };
    }

    return { success: false, message: 'Falha ao testar IA' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

async function testDatabaseConfig(config: any): Promise<{ success: boolean; message: string }> {
  try {
    if (!config.host || !config.username) {
      return { success: false, message: 'Configuração incompleta' };
    }

    // TODO: Implementar teste real de conexão PostgreSQL
    // Por enquanto, apenas validação básica

    return { success: true, message: 'Configuração de banco validada (teste de conexão não implementado)' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

async function testConfiguration(category: string, config: any): Promise<{ success: boolean; message: string }> {
  switch (category) {
    case 'ocr':
      return await testOCRConfig(config);
    case 'ai':
      return await testAIConfig(config);
    case 'database':
      return await testDatabaseConfig(config);
    case 'pdf':
      return { success: true, message: 'Teste de PDF não implementado (validação básica OK)' };
    default:
      return { success: false, message: 'Categoria desconhecida' };
  }
}

// ═══════════════════════════════════════════════════════════════
// Handler Principal
// ═══════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autenticação necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verificar autenticação
    const authSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é admin
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || userRole.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem acessar configurações de API' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, id, category, provider, priority, config_data } = await req.json();

    // ═══════════════════════════════════════════════════════════════
    // LISTAR CONFIGURAÇÕES
    // ═══════════════════════════════════════════════════════════════
    if (action === 'list') {
      const { data: configs, error } = await supabase
        .from('api_configurations')
        .select('*')
        .order('category', { ascending: true })
        .order('priority', { ascending: true });

      if (error) throw error;

      // Descriptografar dados sensíveis antes de enviar
      const decryptedConfigs = await Promise.all(
        (configs || []).map(async (config) => {
          try {
            // Descriptografar apenas para visualização (mascarar API keys)
            const configData = config.config_data;
            if (configData.api_key) {
              configData.api_key_masked = '••••••••' + configData.api_key.slice(-4);
              delete configData.api_key; // Não enviar key completa
            }
            return { ...config, config_data: configData };
          } catch {
            return config;
          }
        })
      );

      return new Response(
        JSON.stringify({ configs: decryptedConfigs }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═══════════════════════════════════════════════════════════════
    // CRIAR/ATUALIZAR CONFIGURAÇÃO
    // ═══════════════════════════════════════════════════════════════
    if (action === 'upsert') {
      // Criptografar dados sensíveis
      const encryptedConfig = { ...config_data };
      if (encryptedConfig.api_key) {
        encryptedConfig.api_key = await encrypt(encryptedConfig.api_key);
      }
      if (encryptedConfig.password) {
        encryptedConfig.password = await encrypt(encryptedConfig.password);
      }

      const { data, error } = await supabase
        .from('api_configurations')
        .upsert({
          id: id || undefined,
          category,
          provider,
          priority: priority || 1,
          config_data: encryptedConfig,
          is_active: true,
          created_by: user.id,
        }, {
          onConflict: 'category,provider'
        })
        .select()
        .single();

      if (error) throw error;

      // Registrar no histórico
      await supabase
        .from('api_configuration_history')
        .insert({
          configuration_id: data.id,
          action: id ? 'updated' : 'created',
          changes: { category, provider, priority },
          changed_by: user.id,
        });

      return new Response(
        JSON.stringify({ success: true, config: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═══════════════════════════════════════════════════════════════
    // TESTAR CONFIGURAÇÃO
    // ═══════════════════════════════════════════════════════════════
    if (action === 'test') {
      // Buscar configuração
      const { data: config } = await supabase
        .from('api_configurations')
        .select('*')
        .eq('id', id)
        .single();

      if (!config) {
        return new Response(
          JSON.stringify({ error: 'Configuração não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Descriptografar para teste
      const decryptedConfig = { ...config.config_data };
      if (decryptedConfig.api_key) {
        decryptedConfig.api_key = await decrypt(decryptedConfig.api_key);
      }
      if (decryptedConfig.password) {
        decryptedConfig.password = await decrypt(decryptedConfig.password);
      }

      // Testar conectividade
      const testResult = await testConfiguration(config.category, decryptedConfig);

      // Atualizar status do teste
      await supabase
        .from('api_configurations')
        .update({
          last_tested_at: new Date().toISOString(),
          last_test_status: testResult.success ? 'success' : 'failed',
          last_test_message: testResult.message,
        })
        .eq('id', id);

      // Registrar no histórico
      await supabase
        .from('api_configuration_history')
        .insert({
          configuration_id: id,
          action: 'tested',
          test_result: testResult,
          changed_by: user.id,
        });

      return new Response(
        JSON.stringify({ success: true, test: testResult }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═══════════════════════════════════════════════════════════════
    // ATIVAR/DESATIVAR CONFIGURAÇÃO
    // ═══════════════════════════════════════════════════════════════
    if (action === 'toggle') {
      const { data: config } = await supabase
        .from('api_configurations')
        .select('is_active')
        .eq('id', id)
        .single();

      await supabase
        .from('api_configurations')
        .update({ is_active: !config?.is_active })
        .eq('id', id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═══════════════════════════════════════════════════════════════
    // OBTER CONFIGURAÇÃO PARA USO (descriptografada)
    // ═══════════════════════════════════════════════════════════════
    if (action === 'get_active') {
      const { data: config } = await supabase
        .from('api_configurations')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('priority', { ascending: true })
        .limit(1)
        .single();

      if (!config) {
        return new Response(
          JSON.stringify({ error: 'Nenhuma configuração ativa encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Descriptografar
      const decryptedConfig = { ...config.config_data };
      if (decryptedConfig.api_key) {
        decryptedConfig.api_key = await decrypt(decryptedConfig.api_key);
      }
      if (decryptedConfig.password) {
        decryptedConfig.password = await decrypt(decryptedConfig.password);
      }

      return new Response(
        JSON.stringify({ config: { ...config, config_data: decryptedConfig } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ação inválida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro em manage-api-configs:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
