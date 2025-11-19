import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RefreshCw, CheckCircle2, XCircle, Clock, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Upload {
  id: string;
  image_url: string;
  status: string;
  error_message?: string;
  extracted_data?: any;
  created_at: string;
  processed_at?: string;
}

interface UploadHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReprocess: (uploadId: string, imageUrl: string) => void;
}

export const UploadHistoryDialog = ({ 
  open, 
  onOpenChange, 
  onReprocess 
}: UploadHistoryDialogProps) => {
  const { user } = useAuth();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && user) {
      fetchUploads();
    }
  }, [open, user]);

  const fetchUploads = async () => {
    try {
      const { data, error } = await supabase
        .from('bioimpedance_uploads')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setUploads(data || []);
    } catch (error) {
      console.error('Error fetching uploads:', error);
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (uploadId: string) => {
    try {
      const { error } = await supabase
        .from('bioimpedance_uploads')
        .delete()
        .eq('id', uploadId);

      if (error) throw error;
      
      toast.success('Upload removido');
      fetchUploads();
    } catch (error) {
      console.error('Error deleting upload:', error);
      toast.error('Erro ao remover upload');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Sucesso
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-500/10 text-red-700 dark:text-red-300 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        );
      case 'processing':
        return (
          <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200">
            <Clock className="h-3 w-3 mr-1 animate-pulse" />
            Processando
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Histórico de Uploads</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Clock className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : uploads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum upload registrado ainda
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto max-h-96">
            {uploads.map((upload) => (
              <Card key={upload.id} className="p-4">
                <div className="flex items-start gap-4">
                  <img 
                    src={upload.image_url} 
                    alt="Thumbnail" 
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(upload.status)}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(upload.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>

                    {upload.error_message && (
                      <p className="text-xs text-red-500 break-words">
                        {upload.error_message}
                      </p>
                    )}

                    {upload.extracted_data && (
                      <div className="text-xs text-muted-foreground">
                        Peso: {upload.extracted_data.weight}kg
                        {upload.extracted_data.body_fat_percentage && 
                          ` • Gordura: ${upload.extracted_data.body_fat_percentage}%`}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1">
                    {upload.status === 'error' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onReprocess(upload.id, upload.image_url)}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(upload.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
