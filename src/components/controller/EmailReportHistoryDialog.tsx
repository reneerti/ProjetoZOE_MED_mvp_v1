import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Mail, CheckCircle, XCircle, Clock } from "lucide-react";

interface EmailReportHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  controllerId: string;
}

export const EmailReportHistoryDialog = ({ open, onOpenChange, controllerId }: EmailReportHistoryDialogProps) => {
  const { data: history, isLoading } = useQuery({
    queryKey: ['email-reports-history', controllerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_reports_history')
        .select('*')
        .eq('controller_id', controllerId)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Enviado
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Falhou
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Histórico de Envios de Relatórios
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !history || history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum envio registrado</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Destinatário</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tipo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {format(new Date(record.sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>{record.recipient_email}</TableCell>
                  <TableCell>
                    {record.month}/{record.year}
                  </TableCell>
                  <TableCell>{getStatusBadge(record.status)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {record.report_type === 'monthly' ? 'Mensal' : record.report_type}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};
