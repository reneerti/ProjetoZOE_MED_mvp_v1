import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    console.log(`Found ${connections.length} active Google Fit connections`);

    let successCount = 0;
    let failCount = 0;

    // Sync data for each user
    for (const connection of connections) {
      try {
        console.log(`Syncing data for user ${connection.user_id}...`);

        // Check if token is expired
        const tokenExpired = new Date(connection.token_expires_at) < new Date();
        let accessToken = connection.access_token;

        // Refresh token if expired
        if (tokenExpired && connection.refresh_token) {
          console.log('Token expired, refreshing...');
          
          const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: connection.refresh_token,
              grant_type: 'refresh_token',
            }),
          });

          const refreshData = await refreshResponse.json();

          if (refreshResponse.ok && refreshData.access_token) {
            accessToken = refreshData.access_token;
            
            // Update stored token
            await supabaseClient
              .from('wearable_connections')
              .update({
                access_token: refreshData.access_token,
                token_expires_at: new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString(),
              })
              .eq('id', connection.id);

            console.log('Token refreshed successfully');
          } else {
            console.error('Failed to refresh token:', refreshData);
            failCount++;
            continue;
          }
        }

        // Fetch last 7 days of data
        const now = Date.now();
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

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
              endTimeMillis: now,
            }),
          }
        );

        if (!stepsResponse.ok) {
          console.error('Failed to fetch steps data');
          failCount++;
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
            failCount++;
            continue;
          }

          console.log(`Saved ${wearableEntries.length} days for user ${connection.user_id}`);
        }

        // Update last sync time
        await supabaseClient
          .from('wearable_connections')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', connection.id);

        successCount++;

      } catch (error) {
        console.error(`Error syncing user ${connection.user_id}:`, error);
        failCount++;
      }
    }

    console.log(`Sync completed: ${successCount} successful, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Sync completed`,
        syncedUsers: successCount,
        failedUsers: failCount,
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
