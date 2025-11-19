import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken, encryptToken } from "../_shared/tokenEncryption.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Proactively refresh tokens that are expiring in the next 7 days
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting proactive token refresh check...');

    const clientId = Deno.env.get('GOOGLE_FIT_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_FIT_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.error('Google Fit credentials not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Credentials not configured',
          success: false 
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get connections with tokens expiring in the next 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { data: expiringConnections, error: fetchError } = await supabaseClient
      .from('wearable_connections')
      .select('id, user_id, provider, access_token, refresh_token, token_expires_at, tokens_encrypted, rotation_count')
      .lt('token_expires_at', sevenDaysFromNow.toISOString())
      .gt('token_expires_at', new Date().toISOString())
      .eq('provider', 'google_fit')
      .eq('sync_enabled', true);

    if (fetchError) {
      throw new Error(`Error fetching connections: ${fetchError.message}`);
    }

    if (!expiringConnections || expiringConnections.length === 0) {
      console.log('No tokens expiring in the next 7 days');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No tokens need refresh',
          refreshed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${expiringConnections.length} tokens expiring in the next 7 days`);

    let tokensRefreshed = 0;
    let refreshFailed = 0;

    for (const connection of expiringConnections) {
      try {
        if (!connection.refresh_token) {
          console.log(`No refresh token for connection ${connection.id}, skipping`);
          refreshFailed++;
          continue;
        }

        // Decrypt refresh token
        const refreshToken = connection.tokens_encrypted 
          ? await decryptToken(connection.refresh_token)
          : connection.refresh_token;

        // Request new tokens from Google
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        if (!refreshResponse.ok) {
          const error = await refreshResponse.json();
          console.error(`Token refresh failed for connection ${connection.id}:`, error);
          refreshFailed++;
          continue;
        }

        const tokenData = await refreshResponse.json();
        
        // Encrypt new tokens
        const newEncryptedAccessToken = await encryptToken(tokenData.access_token);
        const newEncryptedRefreshToken = tokenData.refresh_token 
          ? await encryptToken(tokenData.refresh_token)
          : connection.refresh_token;

        // Update connection with rotated tokens
        const { error: updateError } = await supabaseClient
          .from('wearable_connections')
          .update({
            access_token: newEncryptedAccessToken,
            refresh_token: newEncryptedRefreshToken,
            token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
            last_token_rotation: new Date().toISOString(),
            rotation_count: (connection.rotation_count || 0) + 1,
            tokens_encrypted: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', connection.id);

        if (updateError) {
          console.error(`Failed to update tokens for connection ${connection.id}:`, updateError);
          refreshFailed++;
          continue;
        }

        // Audit the proactive refresh
        await supabaseClient
          .from('wearable_token_audit')
          .insert({
            connection_id: connection.id,
            action: 'token_proactive_refresh',
          });

        console.log(`✅ Proactively refreshed token for connection ${connection.id}`);
        tokensRefreshed++;

      } catch (error) {
        console.error(`Error processing connection ${connection.id}:`, error);
        refreshFailed++;
      }
    }

    console.log(`Proactive refresh completed: ${tokensRefreshed} refreshed, ${refreshFailed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Proactive refresh completed`,
        refreshed: tokensRefreshed,
        failed: refreshFailed,
        checked: expiringConnections.length,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in proactive-token-refresh:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
