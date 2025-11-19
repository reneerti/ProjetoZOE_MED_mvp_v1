import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken, encryptToken } from "../_shared/tokenEncryption.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function automatically syncs Google Fit data for all connected users
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting automatic Google Fit data sync...');

    // Validate Google Fit credentials
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

    // Get all users with active Google Fit connections
    const { data: connections, error: connectionsError } = await supabaseClient
      .from('wearable_connections')
      .select('*')
      .eq('provider', 'google_fit')
      .eq('sync_enabled', true);

    if (connectionsError) {
      throw new Error(`Error fetching connections: ${connectionsError.message}`);
    }

    if (!connections || connections.length === 0) {
      console.log('No active Google Fit connections found');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No connections to sync',
          syncedUsers: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sync data for each connection
    let successfulSyncs = 0;
    let failedSyncs = 0;

    for (const connection of connections) {
      console.log(`Processing sync for user: ${connection.user_id}, provider: ${connection.provider}`);
      
      try {
        if (!connection.access_token || !connection.refresh_token) {
          console.log(`Missing tokens for connection ${connection.id}, skipping`);
          failedSyncs++;
          continue;
        }

        // Decrypt tokens
        let accessToken: string;
        try {
          accessToken = connection.tokens_encrypted 
            ? await decryptToken(connection.access_token)
            : connection.access_token;
        } catch (decryptError) {
          console.error(`Failed to decrypt access token for connection ${connection.id}:`, decryptError);
          failedSyncs++;
          continue;
        }

        // Check if token needs refresh
        const tokenExpiry = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
        const currentTime = new Date();

        // Refresh token if expired or expiring soon (within 5 minutes)
        if (tokenExpiry && tokenExpiry.getTime() < currentTime.getTime() + 5 * 60 * 1000) {
          console.log(`Token expired or expiring soon for connection ${connection.id}, refreshing with rotation...`);
          
          try {
            const refreshToken = connection.tokens_encrypted 
              ? await decryptToken(connection.refresh_token)
              : connection.refresh_token;

            // Refresh and rotate token
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
              throw new Error('Token refresh failed');
            }

            const tokenData = await refreshResponse.json();
            
            // Encrypt new tokens
            const newEncryptedAccessToken = await encryptToken(tokenData.access_token);
            const newEncryptedRefreshToken = tokenData.refresh_token 
              ? await encryptToken(tokenData.refresh_token)
              : connection.refresh_token;

            // Update connection with rotated tokens
            await supabaseClient
              .from('wearable_connections')
              .update({
                access_token: newEncryptedAccessToken,
                refresh_token: newEncryptedRefreshToken,
                token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
                last_token_rotation: new Date().toISOString(),
                rotation_count: (connection.rotation_count || 0) + 1,
                tokens_encrypted: true,
              })
              .eq('id', connection.id);

            accessToken = tokenData.access_token;
            
            // Audit token refresh
            await supabaseClient
              .from('wearable_token_audit')
              .insert({
                connection_id: connection.id,
                action: 'token_refreshed',
              });
            
            console.log(`Token refreshed and rotated successfully for connection ${connection.id}`);
          } catch (refreshError) {
            console.error(`Error refreshing token for connection ${connection.id}:`, refreshError);
            failedSyncs++;
            continue;
          }
        }

        // Fetch last 7 days of data
        const nowMillis = Date.now();
        const sevenDaysAgo = nowMillis - (7 * 24 * 60 * 60 * 1000);

        // Fetch steps data
        const stepsResponse = await fetch(
          `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              aggregateBy: [{
                dataTypeName: 'com.google.step_count.delta',
              }],
              bucketByTime: { durationMillis: 86400000 },
              startTimeMillis: sevenDaysAgo,
              endTimeMillis: nowMillis,
            }),
          }
        );

        if (!stepsResponse.ok) {
          console.error('Failed to fetch steps data');
          failedSyncs++;
          continue;
        }

        const stepsData = await stepsResponse.json();

        // Process and save data
        const wearableEntries = [];
        if (stepsData.bucket) {
          for (const bucket of stepsData.bucket) {
            const date = new Date(parseInt(bucket.startTimeMillis));
            const steps = bucket.dataset[0]?.point[0]?.value[0]?.intVal || 0;

            if (steps > 0) {
              wearableEntries.push({
                user_id: connection.user_id,
                date: date.toISOString().split('T')[0],
                steps,
                source: 'google_fit',
              });
            }
          }
        }

        // Save to database
        if (wearableEntries.length > 0) {
          const { error: insertError } = await supabaseClient
            .from('wearable_data')
            .upsert(wearableEntries, {
              onConflict: 'user_id,date,source',
              ignoreDuplicates: false,
            });

          if (insertError) {
            console.error('Error saving wearable data:', insertError);
            failedSyncs++;
            continue;
          }

          console.log(`Saved ${wearableEntries.length} days for user ${connection.user_id}`);
        }

        // Update last sync time
        await supabaseClient
          .from('wearable_connections')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', connection.id);

        successfulSyncs++;

      } catch (error) {
        console.error(`Error syncing user ${connection.user_id}:`, error);
        failedSyncs++;
      }
    }

    console.log(`Sync completed: ${successfulSyncs} successful, ${failedSyncs} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Sync completed`,
        syncedUsers: successfulSyncs,
        failedSyncs: failedSyncs,
        totalConnections: connections.length,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-google-fit-data:', error);
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
