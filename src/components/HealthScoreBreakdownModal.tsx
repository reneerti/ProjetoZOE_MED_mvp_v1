import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Scale, FileText, Watch, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface HealthScoreBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalScore: number | null;
}

interface ScoreComponent {
  category: string;
  icon: any;
  score: number;
  maxScore: number;
  description: string;
  details: string[];
}

export const HealthScoreBreakdownModal = ({ open, onOpenChange, totalScore }: HealthScoreBreakdownModalProps) => {
  const [loading, setLoading] = useState(true);
  const [components, setComponents] = useState<ScoreComponent[]>([]);

  useEffect(() => {
    if (open) {
      fetchScoreBreakdown();
    }
  }, [open]);

  const fetchScoreBreakdown = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const scoreComponents: ScoreComponent[] = [];

      // 1. Exames (40% = 400 pontos)
      const { data: examImages } = await supabase
        .from('exam_images')
        .select('id, exam_date')
        .eq('user_id', user.id)
        .gte('exam_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        .order('exam_date', { ascending: false });

      const examImageIds = examImages?.map(img => img.id) || [];
      let examScore = 0;
      const examDetails: string[] = [];

      if (examImageIds.length > 0) {
        const { data: examResults } = await supabase
          .from('exam_results')
          .select('status')
          .in('exam_image_id', examImageIds);

        const normalCount = examResults?.filter(r => r.status === 'normal').length || 0;
        const totalResults = examResults?.length || 1;
        examScore = Math.round((normalCount / totalResults) * 400);
        examDetails.push(`${examImages?.length || 0} exames nos últimos 12 meses`);
        examDetails.push(`${normalCount} parâmetros normais de ${totalResults} analisados`);
        examDetails.push(`Taxa de normalidade: ${Math.round((normalCount / totalResults) * 100)}%`);
      }

      scoreComponents.push({
        category: "Exames Laboratoriais",
        icon: FileText,
        score: examScore,
        maxScore: 400,
        description: "Análise dos resultados de exames dentro dos valores de referência",
        details: examDetails.length > 0 ? examDetails : ["Nenhum exame registrado nos últimos 12 meses"]
      });

      // 2. Bioimpedância (30% = 300 pontos)
      const { data: bioimpedance } = await supabase
        .from('bioimpedance_measurements')
        .select('*')
        .eq('user_id', user.id)
        .gte('measurement_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        .order('measurement_date', { ascending: false })
        .limit(2);

      let bioScore = 0;
      const bioDetails: string[] = [];

      if (bioimpedance && bioimpedance.length > 0) {
        const latest = bioimpedance[0];
        let healthyMetrics = 0;
        let totalMetrics = 0;

        if (latest.body_fat_percentage !== null) {
          totalMetrics++;
          if (latest.body_fat_percentage >= 15 && latest.body_fat_percentage <= 25) {
            healthyMetrics++;
          }
          bioDetails.push(`Gordura corporal: ${latest.body_fat_percentage}%`);
        }

        if (latest.muscle_mass !== null) {
          totalMetrics++;
          if (latest.muscle_mass >= 30) {
            healthyMetrics++;
          }
          bioDetails.push(`Massa muscular: ${latest.muscle_mass}kg`);
        }

        if (latest.water_percentage !== null) {
          totalMetrics++;
          if (latest.water_percentage >= 50 && latest.water_percentage <= 65) {
            healthyMetrics++;
          }
          bioDetails.push(`Hidratação: ${latest.water_percentage}%`);
        }

        bioScore = totalMetrics > 0 ? Math.round((healthyMetrics / totalMetrics) * 300) : 0;
        bioDetails.push(`${bioimpedance.length} medições nos últimos 12 meses`);
      } else {
        bioDetails.push("Nenhuma medição registrada nos últimos 12 meses");
      }

      scoreComponents.push({
        category: "Composição Corporal",
        icon: Scale,
        score: bioScore,
        maxScore: 300,
        description: "Análise de bioimpedância e composição corporal",
        details: bioDetails
      });

      // 3. Wearables (30% = 300 pontos)
      const { data: wearableData } = await supabase
        .from('wearable_data')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('date', { ascending: false });

      let wearableScore = 0;
      const wearableDetails: string[] = [];

      if (wearableData && wearableData.length > 0) {
        let healthyDays = 0;
        
        wearableData.forEach(day => {
          let dayScore = 0;
          let dayMetrics = 0;

          if (day.steps !== null) {
            dayMetrics++;
            if (day.steps >= 8000) dayScore++;
          }

          if (day.sleep_hours !== null) {
            dayMetrics++;
            if (day.sleep_hours >= 7 && day.sleep_hours <= 9) dayScore++;
          }

          if (day.heart_rate !== null) {
            dayMetrics++;
            if (day.heart_rate >= 60 && day.heart_rate <= 100) dayScore++;
          }

          if (dayMetrics > 0 && (dayScore / dayMetrics) >= 0.7) {
            healthyDays++;
          }
        });

        wearableScore = Math.round((healthyDays / Math.min(wearableData.length, 30)) * 300);
        wearableDetails.push(`${wearableData.length} dias de dados nos últimos 30 dias`);
        wearableDetails.push(`${healthyDays} dias com métricas saudáveis`);
        
        const avgSteps = wearableData.reduce((sum, d) => sum + (d.steps || 0), 0) / wearableData.length;
        wearableDetails.push(`Média de passos: ${Math.round(avgSteps)}/dia`);
      } else {
        wearableDetails.push("Nenhum dado de wearables nos últimos 30 dias");
      }

      scoreComponents.push({
        category: "Atividade e Sono",
        icon: Watch,
        score: wearableScore,
        maxScore: 300,
        description: "Dados de wearables (passos, sono, frequência cardíaca)",
        details: wearableDetails
      });

      setComponents(scoreComponents);
    } catch (error) {
      console.error('Error fetching score breakdown:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "text-success";
    if (percentage >= 60) return "text-accent";
    if (percentage >= 40) return "text-warning";
    return "text-destructive";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Composição do Índice de Saúde
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Score Total */}
            <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Índice Total</p>
                <div className="text-5xl font-bold text-foreground mb-2">
                  {totalScore !== null ? Math.round(totalScore) : 0}
                </div>
                <p className="text-xs text-muted-foreground">de 1000 pontos possíveis</p>
              </div>
            </Card>

            {/* Componentes do Score */}
            {components.map((component, index) => {
              const Icon = component.icon;
              const percentage = (component.score / component.maxScore) * 100;
              
              return (
                <Card key={index} className="p-5">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-foreground">{component.category}</h3>
                        <Badge variant="outline" className={getScoreColor(component.score, component.maxScore)}>
                          {component.score}/{component.maxScore}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{component.description}</p>
                      
                      {/* Progress bar */}
                      <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden mb-3">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            percentage >= 80 ? 'bg-success' :
                            percentage >= 60 ? 'bg-accent' :
                            percentage >= 40 ? 'bg-warning' :
                            'bg-destructive'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>

                      {/* Detalhes */}
                      <div className="space-y-1">
                        {component.details.map((detail, i) => (
                          <p key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{detail}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}

            {/* Disclaimer */}
            <Card className="bg-info/10 border-info/30 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-info flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong>Importante:</strong> Este índice é calculado com base nos dados fornecidos e serve como uma visão geral da sua saúde. 
                  Não substitui avaliação médica profissional. Consulte sempre seu médico para decisões sobre sua saúde.
                </p>
              </div>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
