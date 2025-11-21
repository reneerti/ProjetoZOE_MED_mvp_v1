/**
 * Sistema de Múltiplos Provedores de IA
 *
 * Suporta múltiplas APIs de IA com fallback automático e otimização de custos.
 * Provedores gratuitos/freemium para MVP.
 *
 * Provedores suportados:
 * 1. Groq (gratuito) - LLaMA 3.3 70B, Mixtral
 * 2. Google AI (gratuito) - Gemini 2.0 Flash
 * 3. OpenRouter (freemium) - Acesso a vários modelos
 * 4. Together AI (gratuito) - LLaMA, Mixtral
 * 5. Lovable AI (pago) - Gateway Gemini
 * 6. Hugging Face (gratuito) - Modelos open-source
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIProviderConfig {
  name: string;
  enabled: boolean;
  priority: number;
  costPerToken: number;
  rateLimit: number;
  supportsVision: boolean;
  supportsJSON: boolean;
}

export interface AIRequestOptions {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  enableVision?: boolean;
  imageBase64?: string;
  imageMimeType?: string;
}

export interface AIResponse {
  success: boolean;
  content: string;
  provider: string;
  model: string;
  tokensUsed?: number;
  processingTime: number;
  cost?: number;
  error?: string;
}

/**
 * Configuração dos provedores
 */
const PROVIDERS: Record<string, AIProviderConfig> = {
  groq: {
    name: 'Groq',
    enabled: true,
    priority: 1, // Maior prioridade (gratuito e rápido)
    costPerToken: 0,
    rateLimit: 30, // req/min
    supportsVision: false,
    supportsJSON: true,
  },
  google_ai: {
    name: 'Google AI',
    enabled: true,
    priority: 2,
    costPerToken: 0,
    rateLimit: 60,
    supportsVision: true,
    supportsJSON: true,
  },
  together_ai: {
    name: 'Together AI',
    enabled: true,
    priority: 3,
    costPerToken: 0,
    rateLimit: 60,
    supportsVision: false,
    supportsJSON: true,
  },
  openrouter: {
    name: 'OpenRouter',
    enabled: true,
    priority: 4,
    costPerToken: 0.0001,
    rateLimit: 200,
    supportsVision: true,
    supportsJSON: true,
  },
  huggingface: {
    name: 'Hugging Face',
    enabled: true,
    priority: 5,
    costPerToken: 0,
    rateLimit: 10,
    supportsVision: false,
    supportsJSON: false,
  },
  lovable_ai: {
    name: 'Lovable AI',
    enabled: true,
    priority: 6,
    costPerToken: 0.001,
    rateLimit: 100,
    supportsVision: true,
    supportsJSON: true,
  },
};

/**
 * Groq API - LLaMA 3.3 70B (Gratuito)
 * Limite: 30 req/min, 14.4k tokens/min
 */
async function callGroq(options: AIRequestOptions): Promise<AIResponse> {
  const startTime = Date.now();
  const apiKey = Deno.env.get('GROQ_API_KEY');

  if (!apiKey) {
    return { success: false, content: '', provider: 'groq', model: '', processingTime: 0, error: 'GROQ_API_KEY not configured' };
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || 'llama-3.3-70b-versatile',
        messages: options.messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens || 4096,
        response_format: options.responseFormat === 'json' ? { type: 'json_object' } : undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return {
      success: true,
      content,
      provider: 'groq',
      model: data.model || 'llama-3.3-70b-versatile',
      tokensUsed: data.usage?.total_tokens,
      processingTime: Date.now() - startTime,
      cost: 0,
    };
  } catch (error) {
    return {
      success: false,
      content: '',
      provider: 'groq',
      model: '',
      processingTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Groq failed',
    };
  }
}

/**
 * Google AI (Gemini) - Gratuito
 * Limite: 60 req/min, 1M tokens/dia
 */
async function callGoogleAI(options: AIRequestOptions): Promise<AIResponse> {
  const startTime = Date.now();
  const apiKey = Deno.env.get('GOOGLE_AI_API_KEY');

  if (!apiKey) {
    return { success: false, content: '', provider: 'google_ai', model: '', processingTime: 0, error: 'GOOGLE_AI_API_KEY not configured' };
  }

  try {
    const model = options.model || 'gemini-2.0-flash-exp';
    const contents = options.messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // Adicionar imagem se fornecida
    if (options.enableVision && options.imageBase64) {
      contents[contents.length - 1].parts.push({
        inlineData: {
          mimeType: options.imageMimeType || 'image/jpeg',
          data: options.imageBase64,
        },
      } as any);
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: options.temperature ?? 0.3,
            maxOutputTokens: options.maxTokens || 4096,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google AI error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      success: true,
      content,
      provider: 'google_ai',
      model,
      tokensUsed: data.usageMetadata?.totalTokenCount,
      processingTime: Date.now() - startTime,
      cost: 0,
    };
  } catch (error) {
    return {
      success: false,
      content: '',
      provider: 'google_ai',
      model: '',
      processingTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Google AI failed',
    };
  }
}

/**
 * Together AI - Gratuito
 * Limite: $1 crédito grátis, modelos open-source
 */
async function callTogetherAI(options: AIRequestOptions): Promise<AIResponse> {
  const startTime = Date.now();
  const apiKey = Deno.env.get('TOGETHER_API_KEY');

  if (!apiKey) {
    return { success: false, content: '', provider: 'together_ai', model: '', processingTime: 0, error: 'TOGETHER_API_KEY not configured' };
  }

  try {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        messages: options.messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens || 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Together AI error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return {
      success: true,
      content,
      provider: 'together_ai',
      model: data.model || 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      tokensUsed: data.usage?.total_tokens,
      processingTime: Date.now() - startTime,
      cost: 0,
    };
  } catch (error) {
    return {
      success: false,
      content: '',
      provider: 'together_ai',
      model: '',
      processingTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Together AI failed',
    };
  }
}

/**
 * OpenRouter - Freemium
 * Acesso a diversos modelos com preços variados
 */
async function callOpenRouter(options: AIRequestOptions): Promise<AIResponse> {
  const startTime = Date.now();
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');

  if (!apiKey) {
    return { success: false, content: '', provider: 'openrouter', model: '', processingTime: 0, error: 'OPENROUTER_API_KEY not configured' };
  }

  try {
    const messages = options.messages.map(msg => {
      if (options.enableVision && options.imageBase64 && msg.role === 'user') {
        return {
          role: msg.role,
          content: [
            { type: 'text', text: msg.content },
            {
              type: 'image_url',
              image_url: {
                url: `data:${options.imageMimeType || 'image/jpeg'};base64,${options.imageBase64}`,
              },
            },
          ],
        };
      }
      return msg;
    });

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://zoe-med.app',
        'X-Title': 'ZOE MED',
      },
      body: JSON.stringify({
        model: options.model || 'google/gemini-2.0-flash-exp:free',
        messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens || 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return {
      success: true,
      content,
      provider: 'openrouter',
      model: data.model || 'google/gemini-2.0-flash-exp:free',
      tokensUsed: data.usage?.total_tokens,
      processingTime: Date.now() - startTime,
      cost: data.usage?.total_cost || 0,
    };
  } catch (error) {
    return {
      success: false,
      content: '',
      provider: 'openrouter',
      model: '',
      processingTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'OpenRouter failed',
    };
  }
}

/**
 * Hugging Face Inference API - Gratuito
 * Limite: Rate limit baixo, modelos open-source
 */
async function callHuggingFace(options: AIRequestOptions): Promise<AIResponse> {
  const startTime = Date.now();
  const apiKey = Deno.env.get('HUGGINGFACE_API_KEY');

  if (!apiKey) {
    return { success: false, content: '', provider: 'huggingface', model: '', processingTime: 0, error: 'HUGGINGFACE_API_KEY not configured' };
  }

  try {
    const model = options.model || 'microsoft/Phi-3-mini-4k-instruct';
    const prompt = options.messages.map(m => `${m.role}: ${m.content}`).join('\n\n');

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            temperature: options.temperature ?? 0.3,
            max_new_tokens: options.maxTokens || 2048,
            return_full_text: false,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hugging Face error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = Array.isArray(data)
      ? data[0]?.generated_text || ''
      : data.generated_text || '';

    return {
      success: true,
      content,
      provider: 'huggingface',
      model,
      processingTime: Date.now() - startTime,
      cost: 0,
    };
  } catch (error) {
    return {
      success: false,
      content: '',
      provider: 'huggingface',
      model: '',
      processingTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Hugging Face failed',
    };
  }
}

/**
 * Lovable AI - Gateway Gemini (Pago)
 */
async function callLovableAI(options: AIRequestOptions): Promise<AIResponse> {
  const startTime = Date.now();
  const apiKey = Deno.env.get('LOVABLE_API_KEY');

  if (!apiKey) {
    return { success: false, content: '', provider: 'lovable_ai', model: '', processingTime: 0, error: 'LOVABLE_API_KEY not configured' };
  }

  try {
    const messages = options.messages.map(msg => {
      if (options.enableVision && options.imageBase64 && msg.role === 'user') {
        return {
          role: msg.role,
          content: [
            { type: 'text', text: msg.content },
            {
              type: 'image_url',
              image_url: {
                url: `data:${options.imageMimeType || 'image/jpeg'};base64,${options.imageBase64}`,
              },
            },
          ],
        };
      }
      return msg;
    });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || 'google/gemini-2.5-flash',
        messages,
        response_format: options.responseFormat === 'json' ? { type: 'json_object' } : undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Lovable AI error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return {
      success: true,
      content,
      provider: 'lovable_ai',
      model: data.model || 'google/gemini-2.5-flash',
      tokensUsed: data.usage?.total_tokens,
      processingTime: Date.now() - startTime,
      cost: 0.001,
    };
  } catch (error) {
    return {
      success: false,
      content: '',
      provider: 'lovable_ai',
      model: '',
      processingTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Lovable AI failed',
    };
  }
}

/**
 * Mapa de provedores para funções
 */
const PROVIDER_FUNCTIONS: Record<string, (options: AIRequestOptions) => Promise<AIResponse>> = {
  groq: callGroq,
  google_ai: callGoogleAI,
  together_ai: callTogetherAI,
  openrouter: callOpenRouter,
  huggingface: callHuggingFace,
  lovable_ai: callLovableAI,
};

/**
 * Função principal com fallback automático
 */
export async function callAI(options: AIRequestOptions): Promise<AIResponse> {
  // Ordenar provedores por prioridade
  const sortedProviders = Object.entries(PROVIDERS)
    .filter(([key, config]) => {
      // Filtrar provedores que suportam os requisitos
      if (options.enableVision && !config.supportsVision) return false;
      if (options.responseFormat === 'json' && !config.supportsJSON) return false;
      return config.enabled;
    })
    .sort(([, a], [, b]) => a.priority - b.priority);

  console.log(`🤖 Tentando ${sortedProviders.length} provedores de IA...`);

  for (const [providerKey, config] of sortedProviders) {
    console.log(`→ Tentando ${config.name}...`);

    const providerFn = PROVIDER_FUNCTIONS[providerKey];
    if (!providerFn) continue;

    const result = await providerFn(options);

    if (result.success && result.content.length > 10) {
      console.log(`✅ ${config.name} sucesso em ${result.processingTime}ms`);
      return result;
    }

    console.log(`⚠️ ${config.name} falhou: ${result.error || 'resposta vazia'}`);
  }

  return {
    success: false,
    content: '',
    provider: 'none',
    model: '',
    processingTime: 0,
    error: 'Todos os provedores de IA falharam. Verifique as configurações de API keys.',
  };
}

/**
 * Chamada específica para análise de exames (prioriza JSON)
 */
export async function analyzeExamsWithAI(
  prompt: string,
  systemPrompt?: string
): Promise<AIResponse> {
  const messages: AIMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  return callAI({
    messages,
    temperature: 0.2,
    maxTokens: 4096,
    responseFormat: 'json',
  });
}

/**
 * Chamada específica para visão (OCR estruturado via IA)
 */
export async function analyzeImageWithAI(
  imageBase64: string,
  mimeType: string,
  prompt: string
): Promise<AIResponse> {
  return callAI({
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    maxTokens: 4096,
    responseFormat: 'json',
    enableVision: true,
    imageBase64,
    imageMimeType: mimeType,
  });
}

/**
 * Retorna a lista de provedores configurados
 */
export function getConfiguredProviders(): string[] {
  const configured: string[] = [];

  if (Deno.env.get('GROQ_API_KEY')) configured.push('Groq');
  if (Deno.env.get('GOOGLE_AI_API_KEY')) configured.push('Google AI');
  if (Deno.env.get('TOGETHER_API_KEY')) configured.push('Together AI');
  if (Deno.env.get('OPENROUTER_API_KEY')) configured.push('OpenRouter');
  if (Deno.env.get('HUGGINGFACE_API_KEY')) configured.push('Hugging Face');
  if (Deno.env.get('LOVABLE_API_KEY')) configured.push('Lovable AI');

  return configured;
}
