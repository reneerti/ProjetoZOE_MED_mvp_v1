import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken } from "../_shared/tokenEncryption.ts";
import { getUserIdFromRequest } from "../_shared/authHelpers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const userId = await getUserIdFromRequest(req, supabaseClient);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting: 20 requests per hour
    const { data: rateLimitData } = await supabaseClient.rpc('check_rate_limit', {
      p_user_id: userId,
      p_endpoint: 'disconnect-wearable',
      p_max_requests: 20,
      p_window_seconds: 3600,
    });

    if (rateLimitData && !rateLimitData.allowed) {
      console.log(`Rate limit exceeded for user ${userId}`);
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
          retry_after: rateLimitData.retry_after 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { connectionId } = await req.json();

    if (!connectionId) {
      return new Response(
        JSON.stringify({ error: 'Connection ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Disconnecting wearable connection ${connectionId} for user ${userId}`);

    // Get connection details
    const { data: connection, error: fetchError } = await supabaseClient
      .from('wearable_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !connection) {
      return new Response(
        JSON.stringify({ error: 'Connection not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decrypt and revoke token with provider
    let token = connection.access_token;
    if (connection.tokens_encrypted && token) {
      try {
        token = await decryptToken(token);
      } catch (decryptError) {
        console.error('Failed to decrypt token for revocation:', decryptError);
        // Continue with deletion even if decryption fails
      }
    }

    // Create service client for database operations
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Missing Supabase configuration');
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Revoke token with Google
    if (token && connection.provider === 'google_fit') {
      try {
        console.log('Revoking Google access token...');
        const revokeResponse = await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        if (revokeResponse.ok) {
          console.log('Token revoked with Google successfully');
        } else {
          console.warn('Failed to revoke token with Google, continuing with deletion');
        }
      } catch (revokeError) {
        console.error('Error revoking token with Google:', revokeError);
        // Continue with deletion even if revocation fails
      }
    }

    // Delete connection from database
    const { error: deleteError } = await serviceClient
      .from('wearable_connections')
      .delete()
      .eq('id', connectionId);

    if (deleteError) {
      throw deleteError;
    }

    // Audit token revocation
    await serviceClient
      .from('wearable_token_audit')
      .insert({
        connection_id: connectionId,
        action: 'token_revoked',
      });
      console.log(`Successfully revoked and deleted connection ${connectionId}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Wearable disconnected successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in disconnect-wearable:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
