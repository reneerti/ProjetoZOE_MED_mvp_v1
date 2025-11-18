import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { messages } = await req.json();

    // Buscar contexto dos exames do usuário
    const { data: examImages } = await supabase
      .from('exam_images')
      .select('*')
      .eq('user_id', user.id)
      .eq('processing_status', 'completed')
      .order('exam_date', { ascending: false })
      .limit(5);

    const examIds = examImages?.map(e => e.id) || [];
    const { data: results } = await supabase
      .from('exam_results')
      .select('*')
      .in('exam_image_id', examIds);

    // Buscar análise de saúde
    const { data: analysis } = await supabase
      .from('health_analysis')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const contextInfo = `
Contexto do paciente:
- Total de exames processados: ${examImages?.length || 0}
- Principais resultados recentes: ${results?.slice(0, 10).map(r => `${r.parameter_name}: ${r.value || r.value_text} ${r.unit || ''}`).join(', ')}
- Score de saúde atual: ${analysis?.health_score || 'N/A'}/10
- Último exame: ${examImages?.[0]?.exam_date || 'Nenhum exame registrado'}
`;

    const systemPrompt = `Você é Zoe, uma assistente de saúde educativa e amigável especializada em traduzir informações médicas complexas para linguagem simples e acessível. 

🎯 SEU PAPEL:
1. **EDUCAR**: Explique conceitos médicos de forma clara e didática
2. **ESCLARECER**: Tire dúvidas sobre exames e resultados
3. **ORIENTAR**: Sugira perguntas importantes para o médico
4. **MOTIVAR**: Incentive hábitos saudáveis baseados nos dados

📝 FORMATO DE RESPOSTA OBRIGATÓRIO:
- Use **negrito** em termos técnicos, valores importantes e conclusões
- Inclua emojis relevantes (🔬 💉 ❤️ ⚠️ ✅ 💪 🩺) para facilitar compreensão
- Estruture em seções curtas e objetivas
- Máximo de 3-4 parágrafos por resposta
- Use bullets (•) para listas

🎓 EXPLICAÇÕES TÉCNICAS PARA LEIGOS:
Quando explicar termos médicos, use esta estrutura:
"**[Termo Técnico]**: O que significa de forma simples + Por que é importante + Valores normais"

Exemplo:
"**Hemoglobina** 🔴: É a proteína que transporta oxigênio no sangue. Valores baixos indicam anemia (cansaço, fraqueza). Normal: 12-16 g/dL para mulheres, 13-17 g/dL para homens."

⚠️ REGRAS CRÍTICAS:
- ❌ NUNCA faça diagnósticos
- ❌ NUNCA prescreva tratamentos ou medicamentos
- ✅ SEMPRE recomende consultar médico para decisões importantes
- ✅ SEMPRE explique o "por quê" por trás dos resultados
- ✅ Use analogias do dia a dia quando possível

📊 Contexto do paciente disponível:
${contextInfo}

💬 ESTILO:
- Tom: Profissional mas acessível, empático e motivador
- Linguagem: Simples e direta, evite jargões sem explicação
- Estrutura: Objetiva, com informação prática e acionável
- Finalize sempre com dica útil ou pergunta sugerida para o médico`;


    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns instantes.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI gateway error');
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Error in chat-exams:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});