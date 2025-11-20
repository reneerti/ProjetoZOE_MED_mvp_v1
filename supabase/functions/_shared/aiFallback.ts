/**
 * AI Fallback System with Intelligent Caching: Lovable AI → Google Gemini API → Groq
 * 
 * Features:
 * - Triple fallback chain for maximum reliability
 * - Intelligent response caching (24h TTL)
 * - Budget tracking and enforcement
 * - Usage logging and cost estimation
 */

interface AIMessage {
  role: string;
  content: string;
}

interface AIRequestOptions {
  model?: string;
  messages: AIMessage[];
  tools?: any[];
  tool_choice?: any;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  enableCache?: boolean; // Enable cache for this request (default: true)
  cacheKey?: string; // Custom cache key
}

interface AIResponse {
  choices: Array<{
    message?: {
      content?: string;
      tool_calls?: any[];
    };
    delta?: {
      content?: string;
    };
  }>;
}

// Cache configuration
const CACHE_ENABLED = true;
const CACHE_TTL_HOURS = 24;

/**
 * Generate hash from messages for cache key
 */
function generatePromptHash(messages: AIMessage[]): string {
  const messageText = messages.map(m => `${m.role}:${m.content}`).join('|');
  return btoa(messageText).substring(0, 64);
}

/**
 * Check cache for existing response
 */
async function checkCache(
  supabaseUrl: string,
  supabaseKey: string,
  functionName: string,
  promptHash: string
): Promise<any | null> {
  if (!CACHE_ENABLED) return null;

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/ai_response_cache?function_name=eq.${functionName}&prompt_hash=eq.${promptHash}&expires_at=gt.${new Date().toISOString()}&order=created_at.desc&limit=1`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        }
      }
    );

    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data || data.length === 0) return null;

    const cached = data[0];

    // Update hit count
    await fetch(`${supabaseUrl}/rest/v1/ai_response_cache?id=eq.${cached.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        hit_count: cached.hit_count + 1,
        last_accessed_at: new Date().toISOString()
      })
    });

    console.log(`✓ Cache HIT for ${functionName} - saved API call`);
    return cached.response_data;
  } catch (error) {
    console.error('Cache check failed:', error);
    return null;
  }
}

/**
 * Save response to cache
 */
async function saveToCache(
  supabaseUrl: string,
  supabaseKey: string,
  functionName: string,
  promptHash: string,
  cacheKey: string,
  responseData: any,
  provider: string,
  model: string,
  tokensUsed?: number
): Promise<void> {
  if (!CACHE_ENABLED) return;

  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);

    await fetch(`${supabaseUrl}/rest/v1/ai_response_cache`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        cache_key: cacheKey,
        function_name: functionName,
        prompt_hash: promptHash,
        response_data: responseData,
        provider,
        model,
        tokens_used: tokensUsed,
        expires_at: expiresAt.toISOString()
      })
    });

    console.log(`✓ Response cached for ${functionName} - expires in ${CACHE_TTL_HOURS}h`);
  } catch (error) {
    console.error('Failed to save cache:', error);
  }
}

/**
 * Check budget before making AI call
 */
async function checkBudget(
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ allowed: boolean; message?: string }> {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_budget_status`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) return { allowed: true };

    const data = await response.json();
    if (!data || data.length === 0) return { allowed: true };

    const budgetStatus = data[0];

    if (budgetStatus.is_over_budget) {
      return {
        allowed: false,
        message: `Orçamento mensal excedido ($${budgetStatus.monthly_limit} USD). Gastos: $${budgetStatus.current_spending} USD`
      };
    }

    if (budgetStatus.alert_threshold_reached) {
      console.warn(`⚠️ Budget alert: ${budgetStatus.percentage_used}% usado`);
    }

    return { allowed: true };
  } catch (error) {
    console.error('Budget check failed:', error);
    return { allowed: true }; // Allow on error to not break functionality
  }
}

/**
 * Update monthly spending
 */
async function updateMonthlySpending(
  supabaseUrl: string,
  supabaseKey: string,
  cost: number
): Promise<void> {
  try {
    const configResponse = await fetch(
      `${supabaseUrl}/rest/v1/ai_budget_config?limit=1`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        }
      }
    );

    if (!configResponse.ok) return;

    const configs = await configResponse.json();
    if (!configs || configs.length === 0) return;

    const config = configs[0];
    const newSpending = Number(config.current_month_spending) + cost;

    await fetch(`${supabaseUrl}/rest/v1/ai_budget_config?id=eq.${config.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        current_month_spending: newSpending,
        updated_at: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('Failed to update spending:', error);
  }
}

/**
 * Logs AI usage to database
 */
async function logAIUsage(
  supabaseUrl: string,
  supabaseKey: string,
  userId: string,
  functionName: string,
  provider: 'lovable_ai' | 'gemini_api' | 'groq_api' | 'fallback' | 'cache_hit',
  model: string,
  success: boolean,
  responseTimeMs: number,
  tokensUsed?: number,
  estimatedCost?: number,
  errorMessage?: string
) {
  try {
    await fetch(`${supabaseUrl}/rest/v1/ai_usage_logs`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        user_id: userId,
        function_name: functionName,
        provider,
        model,
        success,
        response_time_ms: responseTimeMs,
        tokens_used: tokensUsed,
        estimated_cost_usd: estimatedCost || (provider === 'cache_hit' ? 0 : 0.001),
        error_message: errorMessage
      })
    });
  } catch (error) {
    console.error('Failed to log AI usage:', error);
  }
}

/**
 * Attempts to call AI with automatic fallback and caching
 */
export async function callAIWithFallback(
  options: AIRequestOptions,
  userId?: string,
  functionName?: string
): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const startTime = Date.now();

  // Generate cache key
  const promptHash = generatePromptHash(options.messages);
  const cacheKey = options.cacheKey || `${functionName || 'unknown'}:${promptHash}`;

  // Check cache first (if enabled)
  if (options.enableCache !== false && !options.stream) {
    const cachedResponse = await checkCache(
      supabaseUrl,
      supabaseKey,
      functionName || 'unknown',
      promptHash
    );

    if (cachedResponse) {
      // Log cache hit
      if (userId && functionName) {
        await logAIUsage(
          supabaseUrl,
          supabaseKey,
          userId,
          functionName,
          'cache_hit',
          'cached',
          true,
          Date.now() - startTime,
          0,
          0,
          undefined
        );
      }

      // Return cached response
      return new Response(JSON.stringify({
        choices: [{
          message: {
            content: cachedResponse.content || JSON.stringify(cachedResponse)
          }
        }]
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Check budget before making API call
  const budgetCheck = await checkBudget(supabaseUrl, supabaseKey);
  if (!budgetCheck.allowed) {
    throw new Error(budgetCheck.message || 'Budget exceeded');
  }

  // Try Lovable AI first
  if (LOVABLE_API_KEY) {
    console.log('Attempting Lovable AI...');
    
    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model || 'google/gemini-2.5-flash',
          messages: options.messages,
          tools: options.tools,
          tool_choice: options.tool_choice,
          stream: options.stream,
        }),
      });

      if (response.ok) {
        console.log('✓ Lovable AI successful');
        const responseTime = Date.now() - startTime;
        const estimatedTokens = options.messages.reduce((sum, m) => sum + m.content.length / 4, 0);
        const estimatedCost = 0.001;
        
        // Log and update spending
        if (userId && functionName) {
          await logAIUsage(
            supabaseUrl,
            supabaseKey,
            userId,
            functionName,
            'lovable_ai',
            options.model || 'google/gemini-2.5-flash',
            true,
            responseTime,
            estimatedTokens,
            estimatedCost,
            undefined
          );
          await updateMonthlySpending(supabaseUrl, supabaseKey, estimatedCost);
        }

        // Cache response if not streaming
        if (!options.stream && options.enableCache !== false) {
          const responseClone = response.clone();
          const responseData = await responseClone.json();
          await saveToCache(
            supabaseUrl,
            supabaseKey,
            functionName || 'unknown',
            promptHash,
            cacheKey,
            responseData.choices[0].message,
            'lovable_ai',
            options.model || 'google/gemini-2.5-flash',
            estimatedTokens
          );
        }
        
        return response;
      }

      const status = response.status;
      const errorText = await response.text();
      console.log(`✗ Lovable AI failed (${status}):`, errorText);
      
      if (userId && functionName) {
        await logAIUsage(
          supabaseUrl,
          supabaseKey,
          userId,
          functionName,
          'lovable_ai',
          options.model || 'google/gemini-2.5-flash',
          false,
          Date.now() - startTime,
          undefined,
          undefined,
          `Status ${status}: ${errorText.substring(0, 200)}`
        );
      }

      if (status !== 429 && status !== 402 && status !== 500) {
        throw new Error(`Lovable AI error (${status}): ${errorText}`);
      }

      console.log('→ Falling back to Gemini API...');
    } catch (error) {
      console.log('✗ Lovable AI error:', error);
      console.log('→ Falling back to Gemini API...');
    }
  }

  // Fallback to Gemini
  if (GOOGLE_AI_API_KEY) {
    console.log('Using Gemini API fallback...');
    const fallbackStartTime = Date.now();

    try {
      const geminiMessages = options.messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_AI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: geminiMessages })
        }
      );

      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        const responseTime = Date.now() - fallbackStartTime;
        const estimatedTokens = options.messages.reduce((sum, m) => sum + m.content.length / 4, 0);
        const estimatedCost = 0.0002;

        if (userId && functionName) {
          await logAIUsage(
            supabaseUrl,
            supabaseKey,
            userId,
            functionName,
            'gemini_api',
            'gemini-2.0-flash-exp',
            true,
            responseTime,
            estimatedTokens,
            estimatedCost,
            undefined
          );
          await updateMonthlySpending(supabaseUrl, supabaseKey, estimatedCost);
        }

        // Cache Gemini response
        if (options.enableCache !== false) {
          await saveToCache(
            supabaseUrl,
            supabaseKey,
            functionName || 'unknown',
            promptHash,
            cacheKey,
            { content },
            'gemini_api',
            'gemini-2.0-flash-exp',
            estimatedTokens
          );
        }

        console.log(`✓ Gemini fallback successful (${responseTime}ms)`);

        return new Response(JSON.stringify({
          choices: [{
            message: { content }
          }]
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const errorText = await geminiResponse.text();
      const errorMsg = `Gemini API error (${geminiResponse.status}): ${errorText}`;
      console.log(`✗ Gemini failed:`, errorMsg);
      
      if (userId && functionName) {
        await logAIUsage(
          supabaseUrl,
          supabaseKey,
          userId,
          functionName,
          'gemini_api',
          'gemini-2.0-flash-exp',
          false,
          Date.now() - fallbackStartTime,
          undefined,
          undefined,
          errorMsg
        );
      }
      
      console.log('→ Falling back to Groq...');
    } catch (error) {
      console.log('✗ Gemini error:', error);
      console.log('→ Falling back to Groq...');
    }
  }

  // Final fallback to Groq
  const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
  if (!GROQ_API_KEY) {
    throw new Error('All AI providers failed and no Groq API key available');
  }

  console.log('Using Groq API as final fallback...');
  const groqStartTime = Date.now();

  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: options.messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 2048,
    }),
  });

  if (!groqResponse.ok) {
    const errorText = await groqResponse.text();
    const errorMsg = `Groq API error (${groqResponse.status}): ${errorText}`;
    
    if (userId && functionName) {
      await logAIUsage(
        supabaseUrl,
        supabaseKey,
        userId,
        functionName,
        'groq_api',
        'llama-3.3-70b-versatile',
        false,
        Date.now() - groqStartTime,
        undefined,
        undefined,
        errorMsg
      );
    }
    
    throw new Error(errorMsg);
  }

  const groqData = await groqResponse.json();
  const content = groqData.choices[0].message.content;
  
  const responseTime = Date.now() - groqStartTime;
  const estimatedTokens = groqData.usage?.total_tokens || options.messages.reduce((sum, m) => sum + m.content.length / 4, 0);
  const estimatedCost = 0.0001; // Groq is very cheap

  if (userId && functionName) {
    await logAIUsage(
      supabaseUrl,
      supabaseKey,
      userId,
      functionName,
      'groq_api',
      'llama-3.3-70b-versatile',
      true,
      responseTime,
      estimatedTokens,
      estimatedCost,
      undefined
    );
    await updateMonthlySpending(supabaseUrl, supabaseKey, estimatedCost);
  }

  // Cache Groq response
  if (options.enableCache !== false) {
    await saveToCache(
      supabaseUrl,
      supabaseKey,
      functionName || 'unknown',
      promptHash,
      cacheKey,
      { content },
      'groq_api',
      'llama-3.3-70b-versatile',
      estimatedTokens
    );
  }

  console.log(`✓ Groq fallback successful (${responseTime}ms)`);

  return new Response(JSON.stringify({
    choices: [{
      message: { content }
    }]
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
