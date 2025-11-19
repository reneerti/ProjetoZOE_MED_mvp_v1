import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePDFExport } from "./usePDFExport";

export const useEmailReport = () => {
  const { generateMonthlyReportHTML } = usePDFExport();

  const sendMonthlyReport = async (controllerId: string, month: string, year: string) => {
    let historyId: string | null = null;

    try {
      toast.info("Preparando relatório para envio...");

      // Get controller email
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error("Email do controlador não encontrado");
      }

      // Create history record
      const { data: historyRecord, error: historyError } = await supabase
        .from('email_reports_history')
        .insert({
          controller_id: controllerId,
          recipient_email: user.email,
          report_type: 'monthly',
          month,
          year,
          status: 'pending'
        })
        .select()
        .single();

      if (historyError) throw historyError;
      historyId = historyRecord.id;

      const { data: patients } = await supabase.rpc('get_controller_patients', {
        _controller_id: controllerId
      });

      if (!patients || patients.length === 0) {
        await supabase
          .from('email_reports_history')
          .update({ 
            status: 'failed', 
            error_message: 'Nenhum paciente encontrado' 
          })
          .eq('id', historyId);
        
        toast.error("Nenhum paciente encontrado");
        return;
      }

      toast.info("Enviando email...");

      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('send-monthly-report', {
        body: {
          controllerId,
          month,
          year,
          htmlReport: null
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;

      // Update history with success
      await supabase
        .from('email_reports_history')
        .update({ 
          status: 'sent',
          email_id: data?.emailId 
        })
        .eq('id', historyId);

      toast.success("Relatório enviado por email com sucesso!");
      return data;
    } catch (error) {
      console.error('Error sending email report:', error);
      
      // Update history with error
      if (historyId) {
        await supabase
          .from('email_reports_history')
          .update({ 
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Erro desconhecido'
          })
          .eq('id', historyId);
      }
      
      toast.error("Erro ao enviar relatório por email");
      throw error;
    }
  };

  const sendTestReport = async (controllerId: string) => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());
    
    toast.info("Enviando relatório de teste...");
    return sendMonthlyReport(controllerId, month, year);
  };

  const scheduleMonthlyReports = async (controllerId: string) => {
    try {
      // Esta função seria chamada para configurar o agendamento automático
      toast.info("Configurando agendamento automático...");

      const { data: { session } } = await supabase.auth.getSession();
      
      // Aqui você configuraria o cron job no Supabase
      // Por questões de segurança, isso deve ser feito manualmente pelo administrador
      
      toast.success("Para configurar o envio automático mensal, entre em contato com o administrador do sistema.");
      
    } catch (error) {
      console.error('Error scheduling reports:', error);
      toast.error("Erro ao configurar agendamento");
    }
  };

  return { sendMonthlyReport, scheduleMonthlyReports, sendTestReport };
};
