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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Configuração incompleta");
    }

    const resend = new Resend(RESEND_API_KEY);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { controllerId, month, year, htmlReport } = await req.json();

    // Buscar email do controlador
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(controllerId);
    
    if (userError || !user || !user.email) {
      throw new Error("Controlador não encontrado ou sem email");
    }

    // Buscar nome do controlador
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', controllerId)
      .single();

    const controllerName = profile?.display_name || 'Controlador';

    // Enviar email
    const emailResponse = await resend.emails.send({
      from: "ZoeMed <reports@resend.dev>",
      to: [user.email],
      subject: `Relatório Mensal ${month}/${year} - ZoeMed`,
      html: htmlReport || `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">📊 Relatório Mensal</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Período: ${month}/${year}</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #1e293b;">Olá, ${controllerName}!</p>
            
            <p style="color: #475569; line-height: 1.6;">
              Seu relatório mensal de pacientes está pronto! Este documento contém:
            </p>
            
            <ul style="color: #475569; line-height: 1.8;">
              <li>📈 Resumo estatístico geral</li>
              <li>🩺 Detalhamento por paciente</li>
              <li>📊 Gráficos de evolução temporal</li>
              <li>⚠️ Alertas críticos identificados</li>
            </ul>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="margin: 0; color: #64748b; font-size: 14px;">
                💡 <strong>Dica:</strong> Faça login no dashboard para visualizar os dados completos e interativos.
              </p>
            </div>
            
            <p style="color: #475569; margin-top: 25px;">
              Atenciosamente,<br>
              <strong style="color: #1e293b;">Equipe ZoeMed - Saúde Inteligente</strong>
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
            <p>Este é um email automático. Por favor, não responda.</p>
            <p>© ${new Date().getFullYear()} ZoeMed. Todos os direitos reservados.</p>
          </div>
        </div>
      `,
    });

    console.log('Email enviado:', emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao enviar email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
