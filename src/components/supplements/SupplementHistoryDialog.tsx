import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SupplementHistoryDialogProps {
  supplement: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SupplementHistoryDialog = ({ supplement, open, onOpenChange }: SupplementHistoryDialogProps) => {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (open && supplement) {
      loadLogs();
    }
  }, [open, supplement]);

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("supplement_logs")
        .select("*")
        .eq("supplement_id", supplement.id)
        .order("taken_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error loading logs:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{supplement?.supplement_name}</DialogTitle>
          <DialogDescription>
            Histórico dos últimos 30 registros
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum registro encontrado
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {format(new Date(log.taken_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted-foreground">{log.dose_taken}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
