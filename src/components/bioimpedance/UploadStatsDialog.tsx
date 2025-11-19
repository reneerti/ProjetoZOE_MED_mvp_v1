import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Database, TrendingDown, FileText, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UploadStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

interface UploadStat {
  id: string;
  created_at: string;
  image_url: string;
  status: string;
}

export const UploadStatsDialog = ({
  open,
  onOpenChange,
  userId
}: UploadStatsDialogProps) => {
  const [stats, setStats] = useState({
    totalUploads: 0,
    successfulUploads: 0,
    totalStorageSaved: 0,
    recentUploads: [] as UploadStat[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && userId) {
      loadStats();
    }
  }, [open, userId]);

  const loadStats = async () => {
    try {
      const { data: uploads, error } = await supabase
        .from('bioimpedance_uploads')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const successful = uploads?.filter(u => u.status === 'completed').length || 0;
      
      // Estimate storage saved (assuming 70% compression rate)
      const estimatedSaved = (uploads?.length || 0) * 0.7 * 2; // 70% of avg 2MB per image

      setStats({
        totalUploads: uploads?.length || 0,
        successfulUploads: successful,
        totalStorageSaved: estimatedSaved,
        recentUploads: uploads?.slice(0, 10) || []
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (mb: number) => {
    if (mb >= 1000) {
      return `${(mb / 1000).toFixed(2)} GB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Estatísticas de Upload</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Database className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalUploads}</p>
                  <p className="text-xs text-muted-foreground">Total de Uploads</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <TrendingDown className="h-8 w-8 text-success" />
                <div>
                  <p className="text-2xl font-bold text-success">
                    {formatSize(stats.totalStorageSaved)}
                  </p>
                  <p className="text-xs text-muted-foreground">Economia Total</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-4 bg-gradient-to-r from-success/10 to-primary/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                <p className="text-2xl font-bold">
                  {stats.totalUploads > 0 
                    ? Math.round((stats.successfulUploads / stats.totalUploads) * 100)
                    : 0}%
                </p>
              </div>
              <FileText className="h-12 w-12 text-primary opacity-20" />
            </div>
          </Card>

          {/* Recent Uploads */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Uploads Recentes</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Carregando...
                </p>
              ) : stats.recentUploads.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum upload encontrado
                </p>
              ) : (
                stats.recentUploads.map((upload) => (
                  <Card key={upload.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(upload.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(upload.created_at), "HH:mm")}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        upload.status === 'completed' 
                          ? 'bg-success/20 text-success' 
                          : upload.status === 'error'
                          ? 'bg-destructive/20 text-destructive'
                          : 'bg-warning/20 text-warning'
                      }`}>
                        {upload.status === 'completed' ? 'Sucesso' : 
                         upload.status === 'error' ? 'Erro' : 'Processando'}
                      </span>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
