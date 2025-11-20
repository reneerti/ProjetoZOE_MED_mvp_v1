import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Database, HardDrive, TrendingUp, DollarSign, RefreshCw, Trash2, LineChart, Shield } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals" | "resources" | "supplements" | "exam-charts" | "alerts" | "period-comparison" | "admin" | "controller" | "wearables" | "ai-monitoring";

interface ResourceStats {
  storageUsedMB: number;
  totalUploads: number;
  thisMonthUploads: number;
  estimatedCost: number;
  oldUploadsCount: number;
}

interface ResourceDashboardProps {
  onNavigate: (view: View) => void;
}

export const ResourceDashboard = ({ onNavigate }: ResourceDashboardProps) => {
  const [stats, setStats] = useState<ResourceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Get all uploads for current user
      const { data: uploads, error: uploadsError } = await supabase
        .from('bioimpedance_uploads')
        .select('created_at, image_url, status, measurement_id');

      if (uploadsError) throw uploadsError;

      // Calculate storage (estimate 1.5MB per image after compression)
      const storageUsedMB = (uploads?.length || 0) * 1.5;

      // Count this month's uploads
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthUploads = uploads?.filter(u => 
        new Date(u.created_at) >= firstDayOfMonth
      ).length || 0;

      // Count old uploads (90+ days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const oldUploadsCount = uploads?.filter(u => 
        new Date(u.created_at) < ninetyDaysAgo &&
        (u.measurement_id !== null || u.status === 'error')
      ).length || 0;

      // Estimate cost ($0.023 per GB/month for storage + $0.05 per 1000 requests)
      const storageGB = storageUsedMB / 1024;
      const storageCost = storageGB * 0.023;
      const processingCost = (uploads?.length || 0) * 0.00005; // $0.05 per 1000
      const estimatedCost = storageCost + processingCost;

      setStats({
        storageUsedMB,
        totalUploads: uploads?.length || 0,
        thisMonthUploads,
        estimatedCost,
        oldUploadsCount
      });
    } catch (error) {
      console.error("Error fetching resource stats:", error);
      toast.error("Erro ao carregar estatísticas de recursos");
    } finally {
      setLoading(false);
    }
  };

  const runCleanup = async () => {
    try {
      setCleaning(true);
      toast.info("Iniciando limpeza de uploads antigos...");

      const { data, error } = await supabase.functions.invoke('cleanup-old-uploads');

      if (error) throw error;

      const result = data.result;
      const freedMB = (result.freedSpace / (1024 * 1024)).toFixed(2);
      
      toast.success(
        `Limpeza concluída! ${result.deletedRecords} registros e ${result.deletedFiles} arquivos removidos. ${freedMB}MB liberados.`
      );

      if (result.errors.length > 0) {
        console.warn('Cleanup errors:', result.errors);
        toast.warning(`${result.errors.length} erros durante a limpeza. Verifique o console.`);
      }

      // Refresh stats
      await fetchStats();
    } catch (error) {
      console.error("Cleanup error:", error);
      toast.error("Erro ao executar limpeza automática");
    } finally {
      setCleaning(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Carregando estatísticas...</div>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Erro ao carregar dados</div>
      </Card>
    );
  }

  const storagePercent = (stats.storageUsedMB / 1024) * 100; // Assuming 1GB limit for visualization

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Uso de Recursos</h2>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* AI Monitoring Button */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
            <LineChart className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-2">Monitoramento de IA</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Acompanhe o uso, performance e custos dos provedores de IA em tempo real
            </p>
            <Button 
              onClick={() => onNavigate("ai-monitoring")}
              variant="default"
              className="w-full sm:w-auto"
            >
              <LineChart className="w-4 h-4 mr-2" />
              Abrir Monitoramento IA
            </Button>
          </div>
        </div>
      </Card>

      {/* Administration Button */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-2">Administração</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Gerenciar usuários, controladores e planos de assinatura
            </p>
            <Button 
              onClick={() => onNavigate("admin")}
              variant="default"
              className="w-full sm:w-auto"
            >
              <Shield className="w-4 h-4 mr-2" />
              Abrir Administração
            </Button>
          </div>
        </div>
      </Card>

      {/* Storage Usage */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
            <HardDrive className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-foreground">Armazenamento</h3>
              <span className="text-2xl font-bold text-primary">
                {stats.storageUsedMB.toFixed(0)} MB
              </span>
            </div>
            <Progress value={storagePercent} className="h-2 mb-2" />
            <p className="text-sm text-muted-foreground">
              {stats.totalUploads} uploads totais
            </p>
          </div>
        </div>
      </Card>

      {/* Monthly Activity */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-success to-accent flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-foreground">Atividade Mensal</h3>
              <span className="text-2xl font-bold text-success">
                {stats.thisMonthUploads}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              uploads realizados este mês
            </p>
          </div>
        </div>
      </Card>

      {/* Estimated Cost */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-warning to-primary flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-foreground">Custo Estimado</h3>
              <span className="text-2xl font-bold text-warning">
                ${stats.estimatedCost.toFixed(2)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              por mês (armazenamento + processamento)
            </p>
          </div>
        </div>
      </Card>

      {/* Old Uploads Cleanup */}
      {stats.oldUploadsCount > 0 && (
        <Card className="p-6 border-destructive/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-destructive to-warning flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground">Uploads Antigos</h3>
                <span className="text-2xl font-bold text-destructive">
                  {stats.oldUploadsCount}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                uploads com mais de 90 dias (dados já processados)
              </p>
              <Button 
                onClick={runCleanup} 
                disabled={cleaning}
                variant="destructive"
                size="sm"
              >
                <Trash2 className={`w-4 h-4 mr-2 ${cleaning ? 'animate-pulse' : ''}`} />
                {cleaning ? 'Limpando...' : 'Limpar Agora'}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                ⚡ Pode liberar até {(stats.oldUploadsCount * 1.5).toFixed(0)}MB
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Info Cards */}
      <Card className="p-4 bg-muted/50">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm mb-1">Sobre a Compressão Automática</h4>
            <p className="text-xs text-muted-foreground">
              Todas as imagens são automaticamente comprimidas antes do upload, reduzindo o tamanho 
              em até 70% sem perda significativa de qualidade. Isso economiza espaço de armazenamento 
              e reduz custos mensais.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-muted/50">
        <div className="flex items-start gap-3">
          <RefreshCw className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm mb-1">Limpeza Automática</h4>
            <p className="text-xs text-muted-foreground">
              O sistema executa automaticamente a limpeza de uploads antigos (90+ dias) mantendo 
              apenas os dados processados no banco de dados. Você também pode executar a limpeza 
              manualmente a qualquer momento.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
