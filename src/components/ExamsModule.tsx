import { ArrowLeft, Calendar, BarChart3, Sparkles, Loader2, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { ExamPreDiagnostics } from "./ExamPreDiagnostics";
import { ExamGroupedResults } from "./ExamGroupedResults";
import { UploadStatsDialog } from "./bioimpedance/UploadStatsDialog";
import type { View } from "@/types/views";

interface ExamsModuleProps {
  onNavigate: (view: View) => void;
}

export const ExamsModule = ({ onNavigate }: ExamsModuleProps) => {
  const { toast } = useToast();
  const [patientAnalysis, setPatientAnalysis] = useState<any>(null);
  const [analyzingExams, setAnalyzingExams] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    fetchAnalysis();
    getUserId();
  }, []);

  const getUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  };

  const fetchAnalysis = async () => {
    setLoadingAnalysis(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('health_analysis')
        .select('analysis_summary')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data?.analysis_summary) {
        setPatientAnalysis(data.analysis_summary);
      }
    } catch (error) {
      console.error('Error fetching analysis:', error);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const runIntegratedAnalysis = async () => {
    setAnalyzingExams(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-exams-integrated', {
        body: {}
      });

      if (error) {
        console.error('Erro na análise:', error);
        toast({
          title: "Erro",
          description: "Erro ao processar análise integrada",
          variant: "destructive",
        });
        return;
      }

      if (data?.analysis) {
        if (data.analysis.analysis_summary) {
          setPatientAnalysis(data.analysis.analysis_summary);
        } else {
          setPatientAnalysis({
            pre_diagnostics: data.analysis.pre_diagnostics,
            grouped_results: data.analysis.grouped_results
          });
        }
        
        toast({
          title: "Sucesso",
          description: "Análise integrada concluída com sucesso!",
        });
        
        await fetchAnalysis();
      }
    } catch (error) {
      console.error('Erro ao executar análise:', error);
      toast({
        title: "Erro",
        description: "Erro ao executar análise integrada",
        variant: "destructive",
      });
    } finally {
      setAnalyzingExams(false);
    }
  };

  return (
    <div className="animate-fade-in pb-24">
      <UploadStatsDialog open={showStats} onOpenChange={setShowStats} userId={userId} />
      
      <div className="sticky top-0 z-50 bg-gradient-to-r from-[#10b981] to-[#059669] text-white p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate("dashboard")}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2.4} />
          </button>
          <div>
            <h1 className="text-2xl font-bold drop-shadow-md">Resultados dos Exames</h1>
            <p className="text-white/90 text-sm drop-shadow">Análise integrada e pré-diagnósticos</p>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-4 mt-6">
        {/* Botões de Navegação */}
        <div className="grid grid-cols-3 gap-2">
          <Button 
            variant="outline" 
            onClick={() => onNavigate("exam-upload")}
            size="sm"
            className="flex flex-col h-auto py-3 gap-1"
          >
            <Upload className="w-4 h-4" />
            <span className="text-xs">Upload</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onNavigate("exams-by-date")}
            size="sm"
            className="flex flex-col h-auto py-3 gap-1"
          >
            <Calendar className="w-4 h-4" />
            <span className="text-xs">Por Data</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowStats(true)}
            size="sm"
            className="flex flex-col h-auto py-3 gap-1"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs">Estatísticas</span>
          </Button>
        </div>

        {/* Botão de Análise Integrada */}
        <Button 
          onClick={runIntegratedAnalysis}
          disabled={analyzingExams}
          className="w-full"
          variant="default"
        >
          {analyzingExams ? (
            <>
              <Sparkles className="w-4 h-4 mr-2 animate-spin" />
              Analisando exames...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar Análise Integrada com IA
            </>
          )}
        </Button>

        {/* Resultados da Análise */}
        {loadingAnalysis ? (
          <Card className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-muted-foreground">Carregando análise...</p>
          </Card>
        ) : !patientAnalysis || (!patientAnalysis.pre_diagnostics && !patientAnalysis.grouped_results) ? (
          <Card className="p-6 text-center border-dashed border-2">
            <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="font-semibold text-foreground mb-2">Nenhuma Análise Disponível</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Faça upload de exames e clique em "Gerar Análise Integrada" para ver os resultados
            </p>
          </Card>
        ) : (
          <>
            {patientAnalysis?.pre_diagnostics && patientAnalysis.pre_diagnostics.length > 0 && (
              <div>
                <ExamPreDiagnostics preDiagnostics={patientAnalysis.pre_diagnostics} />
              </div>
            )}
            
            {patientAnalysis?.grouped_results && patientAnalysis.grouped_results.length > 0 && (
              <div className="mt-4">
                <ExamGroupedResults groupedResults={patientAnalysis.grouped_results} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
