import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { action, code } = await req.json();

    // Initiate OAuth flow
    if (action === 'initiate') {
      const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-fit-auth`;
      
      const scope = [
        'https://www.googleapis.com/auth/fitness.activity.read',
        'https://www.googleapis.com/auth/fitness.heart_rate.read',
        'https://www.googleapis.com/auth/fitness.sleep.read',
      ].join(' ');

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scope)}` +
        `&state=${user.id}` +
        `&access_type=offline` +
        `&prompt=consent`;

      console.log('Generated auth URL for user:', user.id);

      return new Response(
        JSON.stringify({ authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle OAuth callback
    if (action === 'callback' && code) {
      const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-fit-auth`;

      console.log('Exchanging code for tokens...');

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error('Token exchange failed:', tokens);
        return new Response(
          JSON.stringify({ 
            error: 'oauth_error',
            message: 'Falha na autenticação com Google. Verifique as credenciais ou tente novamente.',
            details: tokens.error_description || tokens.error
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
          const { error: connectionError } = await supabaseClient
            .from('wearable_connections')
            .upsert({
              user_id: user.id,
              provider: 'google_fit',
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              token_expires_at: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
              scopes: grantedScopes,
              connected_at: new Date().toISOString(),
              sync_enabled: true,
            }, {
              onConflict: 'user_id,provider'
            });

          if (connectionError) {
            console.error('Error storing connection:', connectionError);
          } else {
            console.log('Refresh token stored for automatic sync');
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
              user_id: user.id,
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
