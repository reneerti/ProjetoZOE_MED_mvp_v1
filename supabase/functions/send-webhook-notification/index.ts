import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookNotification {
  alertType: string;
  severity: string;
  functionName: string;
  message: string;
  details?: {
    thresholdValue?: number;
    actualValue?: number;
    timestamp: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { notification } = await req.json() as { notification: WebhookNotification };

    // Buscar configurações de webhook ativas
    const { data: webhookConfigs, error: configError } = await supabaseClient
      .from('ai_webhook_config')
      .select('*')
      .eq('enabled', true);

    if (configError) {
      console.error('Error fetching webhook configs:', configError);
      throw configError;
    }

    if (!webhookConfigs || webhookConfigs.length === 0) {
      console.log('No active webhooks configured');
      return new Response(
        JSON.stringify({ message: 'No active webhooks configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const results = [];

    // Enviar notificação para cada webhook configurado
    for (const config of webhookConfigs) {
      // Verificar se este tipo de alerta deve ser enviado
      if (!config.alert_types.includes(notification.alertType) && 
          !config.alert_types.includes(notification.severity)) {
        continue;
      }

      let payload;
      
      if (config.webhook_type === 'slack') {
        // Formato Slack
        const color = notification.severity === 'critical' ? 'danger' : 
                     notification.severity === 'warning' ? 'warning' : 'good';
        
        payload = {
          text: `🚨 *AI System Alert*`,
          attachments: [{
            color: color,
            fields: [
              {
                title: 'Alert Type',
                value: notification.alertType,
                short: true
              },
              {
                title: 'Severity',
                value: notification.severity.toUpperCase(),
                short: true
              },
              {
                title: 'Function',
                value: notification.functionName,
                short: true
              },
              {
                title: 'Message',
                value: notification.message,
                short: false
              }
            ],
            footer: 'ZoeMed AI Monitoring',
            ts: Math.floor(new Date(notification.details?.timestamp || new Date()).getTime() / 1000)
          }]
        };

        if (notification.details?.thresholdValue && notification.details?.actualValue) {
          payload.attachments[0].fields.push({
            title: 'Threshold',
            value: `${notification.details.thresholdValue}`,
            short: true
          });
          payload.attachments[0].fields.push({
            title: 'Actual Value',
            value: `${notification.details.actualValue}`,
            short: true
          });
        }
      } else if (config.webhook_type === 'discord') {
        // Formato Discord
        const color = notification.severity === 'critical' ? 0xFF0000 : 
                     notification.severity === 'warning' ? 0xFFA500 : 0x00FF00;
        
        payload = {
          embeds: [{
            title: '🚨 AI System Alert',
            color: color,
            fields: [
              {
                name: 'Alert Type',
                value: notification.alertType,
                inline: true
              },
              {
                name: 'Severity',
                value: notification.severity.toUpperCase(),
                inline: true
              },
              {
                name: 'Function',
                value: notification.functionName,
                inline: true
              },
              {
                name: 'Message',
                value: notification.message,
                inline: false
              }
            ],
            footer: {
              text: 'ZoeMed AI Monitoring'
            },
            timestamp: notification.details?.timestamp || new Date().toISOString()
          }]
        };

        if (notification.details?.thresholdValue && notification.details?.actualValue) {
          payload.embeds[0].fields.push({
            name: 'Threshold',
            value: `${notification.details.thresholdValue}`,
            inline: true
          });
          payload.embeds[0].fields.push({
            name: 'Actual Value',
            value: `${notification.details.actualValue}`,
            inline: true
          });
        }
      }

      try {
        const response = await fetch(config.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          console.error(`Failed to send webhook to ${config.webhook_type}:`, await response.text());
          results.push({ 
            webhook_type: config.webhook_type, 
            success: false, 
            error: `HTTP ${response.status}` 
          });
        } else {
          console.log(`Successfully sent webhook to ${config.webhook_type}`);
          results.push({ 
            webhook_type: config.webhook_type, 
            success: true 
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error sending webhook to ${config.webhook_type}:`, error);
        results.push({ 
          webhook_type: config.webhook_type, 
          success: false, 
          error: errorMessage 
        });
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in send-webhook-notification:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
