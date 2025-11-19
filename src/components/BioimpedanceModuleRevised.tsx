import { ArrowLeft, Database, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ImageUploadZone } from "./bioimpedance/ImageUploadZone";
import { ComparisonTable } from "./bioimpedance/ComparisonTable";
import { MetricCharts } from "./bioimpedance/MetricCharts";
import { AIAnalysisPanel } from "./bioimpedance/AIAnalysisPanel";
import { InsightsDashboardRevised } from "./bioimpedance/InsightsDashboardRevised";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals";

interface BioimpedanceModuleRevisedProps {
  onNavigate: (view: View) => void;
}

export const BioimpedanceModuleRevised = ({ onNavigate }: BioimpedanceModuleRevisedProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchMeasurements();
    }
  }, [user]);

  const fetchMeasurements = async () => {
    try {
      const { data, error } = await supabase
        .from('bioimpedance_measurements')
        .select('*')
        .eq('user_id', user?.id)
        .order('measurement_date', { ascending: false });

      if (error) throw error;
      setMeasurements(data || []);
      
      // Get latest analysis if available
      if (data && data.length > 0) {
        const latest = data[0];
        const analysisData = typeof latest.notes === 'string' 
          ? JSON.parse(latest.notes || '{}') 
          : (latest.notes || {});
        setLatestAnalysis(analysisData.ai_analysis || null);
      }
    } catch (error) {
      console.error("Error fetching measurements:", error);
      toast.error("Erro ao carregar medições");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('bioimpedance-scans')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('bioimpedance-scans')
        .getPublicUrl(filePath);

      toast.success("Processando imagem com IA...");
      
      const { data: processResult, error: processError } = await supabase.functions.invoke('process-bioimpedance', {
        body: { imageUrl: publicUrl }
      });

      if (processError) {
        console.error("Process error:", processError);
        if (processError.message?.includes('Rate limit')) {
          toast.error("Limite de processamentos atingido. Aguarde alguns instantes.");
        } else {
          toast.error("Erro ao processar imagem. Verifique se todos os dados estão visíveis.");
        }
        return;
      }

      if (processResult?.error) {
        toast.error(processResult.error);
        return;
      }

      toast.success("✨ Medição processada com sucesso!");
      
      if (processResult?.analysis) {
        setLatestAnalysis(processResult.analysis);
      }
      
      await fetchMeasurements();
      
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao processar arquivo");
    } finally {
      setUploading(false);
    }
  };

  const handleLoadSampleData = async () => {
    if (!user) return;
    
    const confirmLoad = window.confirm(
      "Isso irá adicionar dados de exemplo ao seu perfil. Continuar?"
    );
    
    if (!confirmLoad) return;

    toast.promise(
      supabase.functions.invoke('seed-bioimpedance-data'),
      {
        loading: 'Carregando dados de exemplo...',
        success: 'Dados de exemplo carregados com sucesso!',
        error: 'Erro ao carregar dados'
      }
    );

    setTimeout(fetchMeasurements, 1000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate("dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Bioimpedância</h1>
              <p className="text-sm text-muted-foreground">
                Análise completa da composição corporal
              </p>
            </div>
          </div>
          
          {measurements.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadSampleData}
            >
              <Database className="h-4 w-4 mr-2" />
              Carregar Exemplo
            </Button>
          )}
          
          {measurements.length > 1 && (
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate('/metrics-evolution', { state: { measurements } })}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Ver Evolução Completa
            </Button>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Upload Zone */}
        <div className="bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 dark:from-blue-950/10 dark:via-purple-950/10 dark:to-pink-950/10 p-6 rounded-2xl">
          <ImageUploadZone onFileSelect={handleFileSelect} uploading={uploading} />
        </div>

        {measurements.length > 0 ? (
          <>
            {/* Insights Dashboard */}
            <div className="bg-gradient-to-br from-purple-50/30 to-pink-50/20 dark:from-purple-950/10 dark:to-pink-950/10 p-6 rounded-2xl">
              <InsightsDashboardRevised measurements={measurements} />
            </div>

            {/* AI Analysis */}
            {latestAnalysis && (
              <div className="bg-gradient-to-br from-green-50/30 to-emerald-50/20 dark:from-green-950/10 dark:to-emerald-950/10 p-6 rounded-2xl">
                <AIAnalysisPanel analysis={latestAnalysis} />
              </div>
            )}

            {/* Charts Preview */}
            <div className="bg-gradient-to-br from-orange-50/30 to-amber-50/20 dark:from-orange-950/10 dark:to-amber-950/10 p-6 rounded-2xl">
              <MetricCharts measurements={measurements} />
            </div>

            {/* Comparison Table */}
            <div className="bg-gradient-to-br from-cyan-50/30 to-blue-50/20 dark:from-cyan-950/10 dark:to-blue-950/10 p-6 rounded-2xl">
              <ComparisonTable measurements={measurements} />
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Nenhuma medição registrada ainda
            </p>
            <p className="text-sm text-muted-foreground">
              Faça upload da primeira foto de bioimpedância para começar
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
