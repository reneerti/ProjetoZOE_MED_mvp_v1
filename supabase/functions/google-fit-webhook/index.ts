import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Webhook para receber notificações do Google Fit em tempo real
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Google Fit webhook received');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verificar se é uma verificação de webhook
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const challenge = url.searchParams.get('hub.challenge');
      
      if (challenge) {
        console.log('Webhook verification request');
        return new Response(challenge, { 
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
        });
      }
    }

    // Processar notificação do Google Fit
    if (req.method === 'POST') {
      const notification = await req.json();
      console.log('Google Fit notification:', JSON.stringify(notification));

      // Extrair user_id do resourceUri ou collectionName
      const resourceUri = notification.resourceUri || '';
      const userId = notification.userId || extractUserIdFromUri(resourceUri);

      if (!userId) {
        console.error('No user ID found in notification');
        return new Response('OK', { status: 200, headers: corsHeaders });
      }

      // Buscar conexão do usuário
      const { data: connection } = await supabaseClient
        .from('wearable_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'google_fit')
        .single();

      if (!connection) {
        console.error('No connection found for user:', userId);
        return new Response('OK', { status: 200, headers: corsHeaders });
      }

      // Trigger sync para este usuário
      console.log('Triggering sync for user:', userId);
      
      // Chamar função de sync
      const { error: syncError } = await supabaseClient.functions.invoke('sync-google-fit-data', {
        body: { userId }
      });

      if (syncError) {
        console.error('Error triggering sync:', syncError);
      } else {
        console.log('Sync triggered successfully for user:', userId);
      }

      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Error in google-fit-webhook:', error);
    return new Response('OK', { status: 200, headers: corsHeaders });
  }
});

function extractUserIdFromUri(uri: string): string | null {
  // Extrair user ID da URI do recurso
  // Exemplo: /fitness/v1/users/12345/dataSources/...
  const match = uri.match(/\/users\/([^\/]+)\//);
  return match ? match[1] : null;
}
