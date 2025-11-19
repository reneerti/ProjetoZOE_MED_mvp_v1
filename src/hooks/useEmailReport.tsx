import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePDFExport } from "./usePDFExport";

export const useEmailReport = () => {
  const { generateMonthlyReport } = usePDFExport();

  const sendMonthlyReport = async (controllerId: string, month: string, year: string) => {
    try {
      toast.info("Preparando relatório para envio...");

      // Gerar HTML do relatório (mesmo código do PDF mas retornando o HTML)
      const { data: patients } = await supabase.rpc('get_controller_patients', {
        _controller_id: controllerId
      });

      if (!patients || patients.length === 0) {
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
          htmlReport: null // O email usa template padrão
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;

      toast.success("Relatório enviado por email com sucesso!");
      return data;
    } catch (error) {
      console.error('Error sending email report:', error);
      toast.error("Erro ao enviar relatório por email");
    }
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

  return { sendMonthlyReport, scheduleMonthlyReports };
};
