import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Check for tokens expiring in the next 7 days and send push notifications
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Checking for expiring OAuth tokens...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get connections with tokens expiring in the next 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { data: expiringConnections, error: fetchError } = await supabaseClient
      .from('wearable_connections')
      .select('id, user_id, provider, token_expires_at, last_token_rotation')
      .lt('token_expires_at', sevenDaysFromNow.toISOString())
      .gt('token_expires_at', new Date().toISOString());

    if (fetchError) {
      throw new Error(`Error fetching connections: ${fetchError.message}`);
    }

    if (!expiringConnections || expiringConnections.length === 0) {
      console.log('No expiring tokens found');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No expiring tokens',
          checked: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${expiringConnections.length} expiring tokens`);

    let notificationsSent = 0;

    for (const connection of expiringConnections) {
      try {
        const expiresAt = new Date(connection.token_expires_at);
        const daysUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        // Get user's push subscriptions
        const { data: subscriptions, error: subError } = await supabaseClient
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', connection.user_id);

        if (subError || !subscriptions || subscriptions.length === 0) {
          console.log(`No push subscriptions for user ${connection.user_id}`);
          continue;
        }

        // Send push notification to each subscription
        for (const subscription of subscriptions) {
          try {
            const message = {
              title: `${connection.provider} Token Expiring`,
              body: `Your ${connection.provider} connection will expire in ${daysUntilExpiry} day(s). Please reconnect to continue syncing data.`,
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              tag: `token-expiry-${connection.id}`,
              data: {
                url: '/metrics-evolution?view=wearables',
                connectionId: connection.id,
                provider: connection.provider,
              },
            };

            // Here you would integrate with your push notification service
            // For now, we'll just log it
            console.log(`Would send notification to user ${connection.user_id}:`, message);
            notificationsSent++;

          } catch (notifyError) {
            console.error(`Error sending notification to subscription:`, notifyError);
          }
        }

        // Audit the notification
        await supabaseClient
          .from('wearable_token_audit')
          .insert({
            connection_id: connection.id,
            action: 'expiry_notification_sent',
          });

      } catch (error) {
        console.error(`Error processing connection ${connection.id}:`, error);
      }
    }

    console.log(`Sent ${notificationsSent} expiry notifications`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Checked ${expiringConnections.length} connections`,
        notificationsSent,
        checked: expiringConnections.length,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-token-expiration:', error);
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
