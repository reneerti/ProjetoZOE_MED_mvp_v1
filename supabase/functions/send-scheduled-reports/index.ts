import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting scheduled monthly reports send...');
    
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Configuração incompleta");
    }

    const resend = new Resend(RESEND_API_KEY);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get current month and year
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = String(lastMonth.getMonth() + 1).padStart(2, '0');
    const year = String(lastMonth.getFullYear());

    console.log(`Generating reports for ${month}/${year}`);

    // Get all controllers
    const { data: controllers, error: controllersError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'controller');

    if (controllersError) {
      throw new Error(`Error fetching controllers: ${controllersError.message}`);
    }

    console.log(`Found ${controllers?.length || 0} controllers`);

    let successCount = 0;
    let failCount = 0;

    // Process each controller
    for (const controller of controllers || []) {
      try {
        // Get controller email
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(controller.user_id);
        
        if (userError || !user || !user.email) {
          console.error(`Controller ${controller.user_id} not found or has no email`);
          failCount++;
          continue;
        }

        // Get controller profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', controller.user_id)
          .single();

        const controllerName = profile?.display_name || 'Controlador';

        // Get patients for this controller
        const { data: patients } = await supabase.rpc('get_controller_patients', {
          _controller_id: controller.user_id
        });

        if (!patients || patients.length === 0) {
          console.log(`Controller ${controller.user_id} has no patients, skipping`);
          continue;
        }

        // Generate simple stats summary
        let totalExams = 0;
        let criticalAlerts = 0;

        for (const patient of patients) {
          const startDate = `${year}-${month}-01`;
          const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

          const { count: examCount } = await supabase
            .from('exam_images')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', patient.patient_id)
            .gte('created_at', startDate)
            .lte('created_at', endDate);

          const { count: alertCount } = await supabase
            .from('health_alerts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', patient.patient_id)
            .eq('severity', 'critical')
            .gte('created_at', startDate)
            .lte('created_at', endDate);

          totalExams += examCount || 0;
          criticalAlerts += alertCount || 0;
        }

        // Send email
        const emailResponse = await resend.emails.send({
          from: "ZoeMed <reports@resend.dev>",
          to: [user.email],
          subject: `📊 Relatório Automático ${month}/${year} - ZoeMed`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0;">📊 Relatório Mensal Automático</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Período: ${month}/${year}</p>
              </div>
              
              <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
                <p style="font-size: 16px; color: #1e293b;">Olá, ${controllerName}!</p>
                
                <p style="color: #475569; line-height: 1.6;">
                  Seu relatório mensal automatizado está pronto! Aqui está um resumo dos dados coletados:
                </p>
                
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0;">
                  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                    <div>
                      <p style="color: #64748b; font-size: 14px; margin: 0;">Total de Pacientes</p>
                      <p style="font-size: 24px; font-weight: bold; color: #1e293b; margin: 5px 0 0 0;">${patients.length}</p>
                    </div>
                    <div>
                      <p style="color: #64748b; font-size: 14px; margin: 0;">Total de Exames</p>
                      <p style="font-size: 24px; font-weight: bold; color: #3b82f6; margin: 5px 0 0 0;">${totalExams}</p>
                    </div>
                    <div>
                      <p style="color: #64748b; font-size: 14px; margin: 0;">Alertas Críticos</p>
                      <p style="font-size: 24px; font-weight: bold; color: ${criticalAlerts > 0 ? '#dc2626' : '#10b981'}; margin: 5px 0 0 0;">${criticalAlerts}</p>
                    </div>
                  </div>
                </div>
                
                <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6;">
                  <p style="margin: 0; color: #1e40af; font-size: 14px;">
                    💡 <strong>Acesse o dashboard</strong> para visualizar dados detalhados, gráficos de evolução e análises completas de cada paciente.
                  </p>
                </div>
                
                <p style="color: #475569; margin-top: 25px;">
                  Atenciosamente,<br>
                  <strong style="color: #1e293b;">Equipe ZoeMed - Saúde Inteligente</strong>
                </p>
              </div>
              
              <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
                <p>Este é um email automático enviado mensalmente. Para desativar, acesse as configurações no dashboard.</p>
                <p>© ${new Date().getFullYear()} ZoeMed. Todos os direitos reservados.</p>
              </div>
            </div>
          `,
        });

        // Log to history
        await supabase
          .from('email_reports_history')
          .insert({
            controller_id: controller.user_id,
            recipient_email: user.email,
            month,
            year,
            status: 'sent',
            email_id: emailResponse.data?.id || null,
            report_type: 'monthly_automatic',
          });

        console.log(`Report sent successfully to ${user.email}`);
        successCount++;

      } catch (error) {
        console.error(`Error sending report to controller ${controller.user_id}:`, error);
        
        // Log failure
        try {
          const { data: { user } } = await supabase.auth.admin.getUserById(controller.user_id);
          if (user?.email) {
            await supabase
              .from('email_reports_history')
              .insert({
                controller_id: controller.user_id,
                recipient_email: user.email,
                month,
                year,
                status: 'failed',
                error_message: error instanceof Error ? error.message : 'Unknown error',
                report_type: 'monthly_automatic',
              });
          }
        } catch (logError) {
          console.error('Error logging failure:', logError);
        }
        
        failCount++;
      }
    }

    console.log(`Scheduled reports completed: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Reports sent: ${successCount}, failed: ${failCount}`,
        successCount,
        failCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.error(`[${errorId}] Error in scheduled reports:`, {
      error,
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao enviar relatórios agendados.',
        errorId,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
