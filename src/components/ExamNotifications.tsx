import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";

export const ExamNotifications = () => {
  useEffect(() => {
    const channel = supabase
      .channel('exam-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'exam_images',
          filter: 'processing_status=eq.completed'
        },
        (payload) => {
          toast.success("Exame Processado!", {
            description: "Seu exame foi processado com sucesso e está pronto para visualização.",
            icon: <CheckCircle className="w-5 h-5" />,
            duration: 5000,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'exam_images',
          filter: 'processing_status=eq.failed'
        },
        (payload) => {
          toast.error("Erro no Processamento", {
            description: "Houve um problema ao processar seu exame. Tente fazer upload novamente.",
            icon: <XCircle className="w-5 h-5" />,
            duration: 7000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
};
