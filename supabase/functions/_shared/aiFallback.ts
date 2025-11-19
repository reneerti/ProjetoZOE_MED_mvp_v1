/**
 * AI Fallback System: Lovable AI → Google Gemini API
 * 
 * Provides automatic fallback from Lovable AI to Gemini when:
 * - Rate limits are hit (429)
 * - Credits are exhausted (402)
 * - Other Lovable AI errors occur
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

/**
 * Attempts to call AI with automatic fallback
 * Returns response body (not JSON) for streaming support
 */
export async function callAIWithFallback(
  options: AIRequestOptions
): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');

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

      // If successful, return the response
      if (response.ok) {
        console.log('✓ Lovable AI successful');
        return response;
      }

      // Log the error
      const status = response.status;
      const errorText = await response.text();
      console.log(`✗ Lovable AI failed (${status}):`, errorText);

      // If 429 (rate limit) or 402 (no credits), try fallback
      if ((status === 429 || status === 402) && GOOGLE_AI_API_KEY) {
        console.log('→ Attempting Gemini API fallback...');
        return await callGeminiAPI(options, GOOGLE_AI_API_KEY);
      }

      // For other errors, return the Lovable AI error response
      return new Response(errorText, {
        status: status,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('✗ Lovable AI error:', error);
      
      // Try fallback on network or other errors
      if (GOOGLE_AI_API_KEY) {
        console.log('→ Attempting Gemini API fallback due to error...');
        return await callGeminiAPI(options, GOOGLE_AI_API_KEY);
      }
      
      throw error;
    }
  }

  // If no Lovable AI key, try Gemini directly
  if (GOOGLE_AI_API_KEY) {
    console.log('No Lovable AI key, using Gemini API directly...');
    return await callGeminiAPI(options, GOOGLE_AI_API_KEY);
  }

  throw new Error('No AI API keys configured (LOVABLE_API_KEY or GOOGLE_AI_API_KEY)');
}

/**
 * Calls Google Gemini API
 * Converts from OpenAI format to Gemini format
 */
async function callGeminiAPI(
  options: AIRequestOptions,
  apiKey: string
): Promise<Response> {
  // Map model name
  const modelMap: Record<string, string> = {
    'google/gemini-2.5-flash': 'gemini-2.0-flash-exp',
    'google/gemini-2.5-pro': 'gemini-2.0-flash-exp',
    'google/gemini-2.5-flash-lite': 'gemini-2.0-flash-exp',
  };

  const geminiModel = modelMap[options.model || 'google/gemini-2.5-flash'] || 'gemini-2.0-flash-exp';

  // Convert messages format
  const contents = options.messages
    .filter(msg => msg.role !== 'system') // Gemini handles system differently
    .map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

  // Add system instruction if present
  const systemMessage = options.messages.find(msg => msg.role === 'system');
  const systemInstruction = systemMessage ? {
    parts: [{ text: systemMessage.content }]
  } : undefined;

  // Determine endpoint based on streaming
  const endpoint = options.stream
    ? `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?key=${apiKey}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

  const geminiBody: any = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.max_tokens ?? 2048,
    }
  };

  if (systemInstruction) {
    geminiBody.systemInstruction = systemInstruction;
  }

  // Handle tools/function calling if present
  if (options.tools && options.tools.length > 0) {
    geminiBody.tools = [{
      functionDeclarations: options.tools.map((tool: any) => ({
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters
      }))
    }];
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('✗ Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    // Convert Gemini response to OpenAI format
    if (options.stream) {
      // For streaming, we need to transform the response
      return convertGeminiStreamToOpenAI(response);
    } else {
      const geminiData = await response.json();
      const openAIFormat = convertGeminiToOpenAI(geminiData, options.tools);
      
      console.log('✓ Gemini API successful');
      
      return new Response(JSON.stringify(openAIFormat), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('✗ Gemini API call failed:', error);
    throw error;
  }
}

/**
 * Converts Gemini response to OpenAI format
 */
function convertGeminiToOpenAI(geminiData: any, hasTools?: any[]): AIResponse {
  const candidate = geminiData.candidates?.[0];
  const content = candidate?.content;
  
  if (!content) {
    throw new Error('No content in Gemini response');
  }

  // Check for function calls
  if (hasTools && content.parts?.[0]?.functionCall) {
    const functionCall = content.parts[0].functionCall;
    return {
      choices: [{
        message: {
          content: '',
          tool_calls: [{
            id: 'call_' + Date.now(),
            type: 'function',
            function: {
              name: functionCall.name,
              arguments: JSON.stringify(functionCall.args)
            }
          }]
        }
      }]
    };
  }

  // Regular text response
  const text = content.parts?.map((part: any) => part.text).join('') || '';
  
  return {
    choices: [{
      message: {
        content: text
      }
    }]
  };
}

/**
 * Converts Gemini streaming response to OpenAI SSE format
 */
function convertGeminiStreamToOpenAI(geminiResponse: Response): Response {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    try {
      const reader = geminiResponse.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.includes('{')) continue;
          
          try {
            const data = JSON.parse(line);
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (text) {
              const chunk = {
                choices: [{
                  delta: { content: text }
                }]
              };
              await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }

      await writer.write(encoder.encode('data: [DONE]\n\n'));
      await writer.close();
    } catch (error) {
      console.error('Stream conversion error:', error);
      await writer.abort(error);
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
