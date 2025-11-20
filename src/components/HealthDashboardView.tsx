import { useState, useEffect } from "react";
import { ArrowLeft, Activity, Scale, FileText, Watch, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { View } from "@/types/views";

interface HealthDashboardViewProps {
  onNavigate: (view: View) => void;
}

export const HealthDashboardView = ({ onNavigate }: HealthDashboardViewProps) => {
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState<any>(null);

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar dados de saúde
      const [analysisRes, bioRes, wearableRes, examsRes, alertsRes] = await Promise.all([
        supabase.from('health_analysis').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('bioimpedance_measurements')
          .select('*')
          .eq('user_id', user.id)
          .order('measurement_date', { ascending: false })
          .limit(3),
        supabase.from('wearable_data')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(7),
        supabase.from('exam_images')
          .select('id, processing_status, exam_date')
          .eq('user_id', user.id)
          .eq('processing_status', 'completed')
          .order('exam_date', { ascending: false })
          .limit(5),
        supabase.from('health_alerts')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'unread')
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      setHealthData({
        analysis: analysisRes.data,
        bioimpedance: bioRes.data || [],
        wearable: wearableRes.data || [],
        exams: examsRes.data || [],
        alerts: alertsRes.data || []
      });
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreLabel = (score: number) => {
    if (score >= 800) return { label: "Excelente", color: "bg-success text-white", icon: <CheckCircle className="w-4 h-4" /> };
    if (score >= 600) return { label: "Muito Bom", color: "bg-accent text-white", icon: <CheckCircle className="w-4 h-4" /> };
    if (score >= 400) return { label: "Bom", color: "bg-warning text-white", icon: <TrendingUp className="w-4 h-4" /> };
    if (score >= 200) return { label: "Regular", color: "bg-warning text-white", icon: <TrendingUp className="w-4 h-4" /> };
    return { label: "Necessita Atenção", color: "bg-destructive text-white", icon: <AlertTriangle className="w-4 h-4" /> };
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "normal":
        return "bg-success/10 text-success border-success";
      case "alto":
      case "critico":
        return "bg-destructive/10 text-destructive border-destructive";
      case "baixo":
        return "bg-warning/10 text-warning border-warning";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const score = healthData?.analysis?.health_score || 0;
  const scoreInfo = getScoreLabel(score);

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate("dashboard")}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2.4} />
          </button>
          <div>
            <h1 className="text-2xl font-bold drop-shadow-md">Dashboard de Saúde</h1>
            <p className="text-white/90 text-sm drop-shadow">Visão completa dos seus indicadores</p>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-6 mt-6">
        {/* Alertas Críticos - PRIMEIRO */}
        {(() => {
          // Coletar todos os parâmetros críticos e altos dos exames
          const criticalParams: any[] = [];
          const highParams: any[] = [];
          
          healthData?.analysis?.analysis_summary?.grouped_results?.forEach((group: any) => {
            group.parameters.forEach((param: any) => {
              if (param.status === "critico") {
                criticalParams.push({ ...param, category: group.category_name });
              } else if (param.status === "alto") {
                highParams.push({ ...param, category: group.category_name });
              }
            });
          });

          // Ordenar pré-diagnósticos por severidade
          const sortedDiagnostics = healthData?.analysis?.analysis_summary?.pre_diagnostics
            ?.slice()
            .sort((a: any, b: any) => {
              const severityOrder = { high: 0, medium: 1, low: 2 };
              return severityOrder[a.severity as keyof typeof severityOrder] - 
                     severityOrder[b.severity as keyof typeof severityOrder];
            }) || [];

          const highSeverityDiagnostics = sortedDiagnostics.filter((d: any) => d.severity === 'high');
          const hasAlerts = criticalParams.length > 0 || highParams.length > 0 || highSeverityDiagnostics.length > 0;

          if (!hasAlerts) return null;

          return (
            <Card className="p-5 border-2 border-destructive bg-destructive/5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center animate-pulse">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-destructive">Alertas Críticos</h3>
                  <p className="text-xs text-muted-foreground">Requerem atenção imediata</p>
                </div>
                <Badge className="bg-destructive text-white text-lg px-3 py-1">
                  {criticalParams.length + highParams.length + highSeverityDiagnostics.length}
                </Badge>
              </div>

              <div className="space-y-3">
                {/* Parâmetros Críticos */}
                {criticalParams.map((param: any, idx: number) => (
                  <Card key={`crit-${idx}`} className="p-4 bg-destructive/10 border-2 border-destructive">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-destructive text-white text-xs">CRÍTICO</Badge>
                          <span className="text-sm text-muted-foreground">{param.category}</span>
                        </div>
                        <h4 className="font-bold text-foreground">{param.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Ref: {param.reference_range}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-destructive">
                          {param.value} {param.unit}
                        </p>
                        <Badge className="bg-destructive text-white mt-1">
                          ⚠ Muito Alto
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}

                {/* Parâmetros Altos */}
                {highParams.map((param: any, idx: number) => (
                  <Card key={`high-${idx}`} className="p-4 bg-warning/10 border-2 border-warning">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-warning text-white text-xs">ALTO</Badge>
                          <span className="text-sm text-muted-foreground">{param.category}</span>
                        </div>
                        <h4 className="font-semibold text-foreground">{param.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Ref: {param.reference_range}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-warning">
                          {param.value} {param.unit}
                        </p>
                        <Badge className="bg-warning text-white mt-1">
                          ↑ Elevado
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}

                {/* Pré-diagnósticos de Alta Severidade */}
                {highSeverityDiagnostics.map((diagnostic: any, idx: number) => (
                  <Card key={`diag-${idx}`} className="p-4 bg-destructive/10 border-2 border-destructive">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-destructive text-white">ATENÇÃO</Badge>
                          <h4 className="font-bold text-foreground">{diagnostic.name}</h4>
                        </div>
                        <p className="text-sm text-foreground mb-3">{diagnostic.explanation}</p>
                        {diagnostic.related_parameters && diagnostic.related_parameters.length > 0 && (
                          <div className="space-y-1 mb-3">
                            {diagnostic.related_parameters.map((param: any, pidx: number) => (
                              <div key={pidx} className="flex items-center justify-between text-sm bg-background/50 p-2 rounded">
                                <span className="text-muted-foreground">{param.name}</span>
                                <span className="font-semibold text-destructive">
                                  {param.value}{param.unit ? ` ${param.unit}` : ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {diagnostic.recommendations && diagnostic.recommendations.length > 0 && (
                          <div className="pt-3 border-t border-destructive/20">
                            <p className="text-xs font-semibold text-foreground mb-2">Recomendações:</p>
                            <ul className="space-y-1">
                              {diagnostic.recommendations.map((rec: string, ridx: number) => (
                                <li key={ridx} className="text-xs text-foreground">• {rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <Button 
                className="w-full mt-4 bg-destructive hover:bg-destructive/90 text-white"
                onClick={() => onNavigate("exams")}
              >
                Ver Análise Completa dos Exames
              </Button>
            </Card>
          );
        })()}

        {/* Score Principal */}
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-sm text-muted-foreground">Índice de Saúde Geral</h2>
                <p className="text-3xl font-bold text-foreground">{Math.round(score)}</p>
              </div>
            </div>
            <Badge className={`${scoreInfo.color} flex items-center gap-1`}>
              {scoreInfo.icon}
              {scoreInfo.label}
            </Badge>
          </div>
          <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-success via-accent to-success rounded-full transition-all duration-500"
              style={{ width: `${(score / 1000) * 100}%` }}
            />
          </div>
        </Card>

        {/* Exames */}
        {healthData?.analysis?.analysis_summary?.grouped_results && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Exames Laboratoriais</h3>
              <Badge variant="secondary">{healthData.analysis.analysis_summary.grouped_results.length}</Badge>
            </div>
            <div className="space-y-3">
              {healthData.analysis.analysis_summary.grouped_results.map((group: any, idx: number) => (
                <Card key={idx} className="p-4 bg-muted/30">
                  <h4 className="font-medium text-sm mb-3">{group.category_name}</h4>
                  <div className="space-y-2">
                    {group.parameters.slice(0, 3).map((param: any, pidx: number) => (
                      <div key={pidx} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{param.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{param.value} {param.unit}</span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getStatusColor(param.status)}`}
                          >
                            {param.status === "normal" ? "✓" : 
                             param.status === "critico" ? "⚠" : 
                             param.status === "alto" ? "↑" : "↓"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  {group.parameters.length > 3 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      +{group.parameters.length - 3} parâmetros
                    </p>
                  )}
                </Card>
              ))}
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => onNavigate("exams")}
            >
              Ver Todos os Exames
            </Button>
          </Card>
        )}

        {/* Pré-Diagnósticos - Outros níveis de atenção */}
        {(() => {
          const sortedDiagnostics = healthData?.analysis?.analysis_summary?.pre_diagnostics
            ?.slice()
            .sort((a: any, b: any) => {
              const severityOrder = { high: 0, medium: 1, low: 2 };
              return severityOrder[a.severity as keyof typeof severityOrder] - 
                     severityOrder[b.severity as keyof typeof severityOrder];
            }) || [];

          const nonCriticalDiagnostics = sortedDiagnostics.filter((d: any) => d.severity !== 'high');
          
          if (nonCriticalDiagnostics.length === 0) return null;

          return (
            <Card className="p-5 border-l-4 border-l-warning">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <h3 className="font-semibold text-foreground">Outros Pontos de Atenção</h3>
                <Badge variant="secondary">{nonCriticalDiagnostics.length}</Badge>
              </div>
              <div className="space-y-3">
                {nonCriticalDiagnostics.map((diagnostic: any, idx: number) => (
                  <Card key={idx} className={`p-4 ${
                    diagnostic.severity === 'medium' ? 'bg-warning/10 border-warning' :
                    'bg-info/10 border-info'
                  }`}>
                    <h4 className="font-medium text-sm mb-2">{diagnostic.name}</h4>
                    <p className="text-xs text-muted-foreground">{diagnostic.explanation}</p>
                  </Card>
                ))}
              </div>
            </Card>
          );
        })()}

        {/* Bioimpedância */}
        {healthData?.bioimpedance && healthData.bioimpedance.length > 0 && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Scale className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Composição Corporal</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {healthData.bioimpedance.slice(0, 1).map((bio: any) => (
                <>
                  <Card key={bio.id} className="p-3 bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Peso</p>
                    <p className="text-xl font-bold text-foreground">{bio.weight} kg</p>
                  </Card>
                  {bio.body_fat_percentage && (
                    <Card className="p-3 bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Gordura</p>
                      <p className="text-xl font-bold text-foreground">{bio.body_fat_percentage}%</p>
                    </Card>
                  )}
                  {bio.muscle_mass && (
                    <Card className="p-3 bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Músculo</p>
                      <p className="text-xl font-bold text-foreground">{bio.muscle_mass} kg</p>
                    </Card>
                  )}
                  {bio.water_percentage && (
                    <Card className="p-3 bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Água</p>
                      <p className="text-xl font-bold text-foreground">{bio.water_percentage}%</p>
                    </Card>
                  )}
                </>
              ))}
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => onNavigate("bioimpedance")}
            >
              Ver Histórico Completo
            </Button>
          </Card>
        )}

        {/* Wearables */}
        {healthData?.wearable && healthData.wearable.length > 0 && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Watch className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Dados de Wearables</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {healthData.wearable.slice(0, 1).map((data: any) => (
                <>
                  {data.steps && (
                    <Card key={data.id + 'steps'} className="p-3 bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Passos</p>
                      <p className="text-xl font-bold text-foreground">{data.steps}</p>
                    </Card>
                  )}
                  {data.calories && (
                    <Card key={data.id + 'cal'} className="p-3 bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Calorias</p>
                      <p className="text-xl font-bold text-foreground">{data.calories}</p>
                    </Card>
                  )}
                  {data.heart_rate && (
                    <Card key={data.id + 'hr'} className="p-3 bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">FC Média</p>
                      <p className="text-xl font-bold text-foreground">{data.heart_rate} bpm</p>
                    </Card>
                  )}
                  {data.sleep_hours && (
                    <Card key={data.id + 'sleep'} className="p-3 bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Sono</p>
                      <p className="text-xl font-bold text-foreground">{data.sleep_hours}h</p>
                    </Card>
                  )}
                </>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Última atualização: {format(new Date(healthData.wearable[0].date), "dd/MM/yyyy")}
            </p>
          </Card>
        )}

        {/* Resumo de Exames */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Histórico de Exames</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-success/10">
              <span className="text-sm text-foreground">Exames Processados</span>
              <Badge className="bg-success text-white">{healthData?.exams?.length || 0}</Badge>
            </div>
            {healthData?.exams && healthData.exams.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Último exame: {format(new Date(healthData.exams[0].exam_date), "dd/MM/yyyy")}
              </p>
            )}
          </div>
        </Card>

        <Card className="bg-info/10 border-info/30 p-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            ⚕️ <strong>Importante:</strong> Esta visão consolidada é baseada em seus dados de saúde. 
            Sempre consulte seu médico para interpretação profissional e decisões sobre tratamento.
          </p>
        </Card>
      </div>
    </div>
  );
};
