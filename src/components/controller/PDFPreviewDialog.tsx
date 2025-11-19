import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Download, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface PDFPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfContent: string | null;
  onConfirmSend?: () => void;
  onDownload?: () => void;
  loading?: boolean;
}

export const PDFPreviewDialog = ({ 
  open, 
  onOpenChange, 
  pdfContent, 
  onConfirmSend,
  onDownload,
  loading = false
}: PDFPreviewDialogProps) => {
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (onConfirmSend) {
      setIsSending(true);
      try {
        await onConfirmSend();
        onOpenChange(false);
      } catch (error) {
        console.error('Error sending:', error);
      } finally {
        setIsSending(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Preview do Relatório PDF
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto border rounded-lg bg-muted/30 p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Gerando preview do relatório...</p>
            </div>
          ) : pdfContent ? (
            <div 
              className="prose prose-sm max-w-none bg-white p-8 rounded shadow-sm"
              dangerouslySetInnerHTML={{ __html: pdfContent }}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Nenhum conteúdo disponível</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancelar
          </Button>
          
          {onDownload && (
            <Button
              variant="secondary"
              onClick={onDownload}
              disabled={!pdfContent || loading || isSending}
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar PDF
            </Button>
          )}
          
          {onConfirmSend && (
            <Button
              onClick={handleSend}
              disabled={!pdfContent || loading || isSending}
            >
              <Mail className="w-4 h-4 mr-2" />
              {isSending ? 'Enviando...' : 'Enviar por Email'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
