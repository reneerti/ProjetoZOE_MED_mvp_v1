import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken } from "../_shared/tokenEncryption.ts";
import { getUserIdFromRequest } from "../_shared/authHelpers.ts";
import { auditTokenAccess } from "../_shared/oauthHelpers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PKCE helper functions
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate Google Fit credentials first
    const clientId = Deno.env.get('GOOGLE_FIT_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_FIT_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.error('Google Fit credentials not configured');
      return new Response(
        JSON.stringify({ 
          error: 'configuration_error',
          message: 'Credenciais do Google Fit não configuradas. Entre em contato com o administrador do sistema.',
          details: 'GOOGLE_FIT_CLIENT_ID e GOOGLE_FIT_CLIENT_SECRET devem ser configurados.'
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const userId = await getUserIdFromRequest(req, supabaseClient);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, code } = await req.json();

    // Rate limiting: 10 requests per hour
    const { data: rateLimitResult } = await supabaseClient.rpc('check_rate_limit', {
      p_user_id: userId,
      p_endpoint: 'google-fit-auth',
      p_max_requests: 10,
      p_window_seconds: 3600
    });

    if (rateLimitResult && !rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for user ${userId}`);
      return new Response(
        JSON.stringify({
          error: 'rate_limit_exceeded',
          message: 'Muitas tentativas. Por favor, aguarde antes de tentar novamente.',
          retryAfter: rateLimitResult.retry_after
        }),
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initiate OAuth flow
    if (action === 'initiate') {
      const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-fit-auth`;
      
      const scope = [
        'https://www.googleapis.com/auth/fitness.activity.read',
        'https://www.googleapis.com/auth/fitness.heart_rate.read',
        'https://www.googleapis.com/auth/fitness.sleep.read',
      ].join(' ');

      // Generate PKCE code verifier and challenge
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      
      // Generate state parameter for CSRF protection
      const state = crypto.randomUUID();
      const stateData = {
        userId: userId,
        state: state,
        codeVerifier: codeVerifier,
        timestamp: Date.now(),
      };

      // Store state and code verifier temporarily (valid for 10 minutes)
      const { error: stateError } = await supabaseClient
        .from('wearable_connections')
        .upsert({
          user_id: userId,
          provider: 'google_fit_temp_state',
          access_token: JSON.stringify(stateData),
          connected_at: new Date().toISOString(),
          sync_enabled: false,
        }, {
          onConflict: 'user_id,provider'
        });

      if (stateError) {
        console.error('Error storing OAuth state:', stateError);
      }

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scope)}` +
        `&state=${state}` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256` +
        `&access_type=offline` +
        `&prompt=consent`;

      console.log('Generated auth URL with PKCE for user:', userId);

      return new Response(
        JSON.stringify({ authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle OAuth callback
    if (action === 'callback' && code) {
      const { state } = await req.json();
      
      if (!state) {
        return new Response(
          JSON.stringify({ 
            error: 'missing_state',
            message: 'State parameter missing. Possível ataque CSRF.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Retrieve and verify state
      const { data: tempState, error: stateError } = await supabaseClient
        .from('wearable_connections')
        .select('access_token')
        .eq('user_id', userId)
        .eq('provider', 'google_fit_temp_state')
        .single();

      if (stateError || !tempState) {
        console.error('State validation error:', stateError);
        return new Response(
          JSON.stringify({ 
            error: 'invalid_state',
            message: 'Estado OAuth inválido ou expirado. Tente novamente.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const stateData = JSON.parse(tempState.access_token);
      
      // Verify state matches
      if (stateData.state !== state) {
        console.error('State mismatch - possible CSRF attack');
        return new Response(
          JSON.stringify({ 
            error: 'state_mismatch',
            message: 'Validação de estado falhou. Possível ataque CSRF.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify timestamp (state should not be older than 10 minutes)
      const stateAge = Date.now() - stateData.timestamp;
      if (stateAge > 10 * 60 * 1000) {
        // Delete expired state
        await supabaseClient
          .from('wearable_connections')
          .delete()
          .eq('user_id', userId)
          .eq('provider', 'google_fit_temp_state');
          
        return new Response(
          JSON.stringify({ 
            error: 'state_expired',
            message: 'Estado OAuth expirado. Por favor, tente novamente.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-fit-auth`;

      console.log('Exchanging code for tokens with PKCE...');

      // Exchange code for tokens with PKCE
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          code_verifier: stateData.codeVerifier,
        }),
      });

      const tokens = await tokenResponse.json();

      if (!tokenResponse.ok) {
        const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.error(`[${errorId}] Token exchange failed:`, tokens);
        
        return new Response(
          JSON.stringify({ 
            error: 'oauth_error',
            message: 'Falha na autenticação com Google. Por favor, tente novamente.',
            errorId
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (tokens.access_token) {
        console.log('Access token obtained, fetching fitness data...');

        // Define scopes for storage
        const grantedScopes = [
          'https://www.googleapis.com/auth/fitness.activity.read',
          'https://www.googleapis.com/auth/fitness.heart_rate.read',
          'https://www.googleapis.com/auth/fitness.sleep.read',
        ];

        // Store refresh token for future automatic syncs
        if (tokens.refresh_token) {
          console.log('Encrypting tokens before storage...');
          
          const encryptedAccessToken = await encryptToken(tokens.access_token);
          const encryptedRefreshToken = await encryptToken(tokens.refresh_token);
          
          const { error: connectionError } = await supabaseClient
            .from('wearable_connections')
            .upsert({
              user_id: userId,
              provider: 'google_fit',
              access_token: encryptedAccessToken,
              refresh_token: encryptedRefreshToken,
              token_expires_at: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
              scopes: grantedScopes,
              connected_at: new Date().toISOString(),
              sync_enabled: true,
              tokens_encrypted: true,
              last_token_rotation: new Date().toISOString(),
              rotation_count: 1,
            }, {
              onConflict: 'user_id,provider'
            });

          if (connectionError) {
            console.error('Error storing connection:', connectionError);
          } else {
            console.log('Encrypted tokens stored successfully for automatic sync');
            
            // Clean up temporary state
            await supabaseClient
              .from('wearable_connections')
              .delete()
              .eq('user_id', userId)
              .eq('provider', 'google_fit_temp_state');
          }
        }

        // Fetch fitness data
        const now = Date.now();
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

        // Fetch steps
        const stepsResponse = await fetch(
          `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${tokens.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              aggregateBy: [{
                dataTypeName: 'com.google.step_count.delta',
              }],
              bucketByTime: { durationMillis: 86400000 },
              startTimeMillis: thirtyDaysAgo,
              endTimeMillis: now,
            }),
          }
        );

        const stepsData = await stepsResponse.json();

        // Process and save data
        const wearableEntries = [];
        if (stepsData.bucket) {
          for (const bucket of stepsData.bucket) {
            const date = new Date(parseInt(bucket.startTimeMillis));
            const steps = bucket.dataset[0]?.point[0]?.value[0]?.intVal || 0;

            wearableEntries.push({
              user_id: userId,
              date: date.toISOString().split('T')[0],
              steps,
              source: 'google_fit',
            });
          }
        }

        // Insert data
        if (wearableEntries.length > 0) {
          const { error: insertError } = await supabaseClient
            .from('wearable_data')
            .upsert(wearableEntries, { 
              onConflict: 'user_id,date',
              ignoreDuplicates: false 
            });

          if (insertError) {
            console.error('Error inserting data:', insertError);
          }
        }

        return new Response(
          JSON.stringify({ success: true, count: wearableEntries.length }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
