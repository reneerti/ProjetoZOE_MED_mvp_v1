import { useState, useEffect } from "react";
import { ArrowLeft, Activity, Scale, FileText, Watch, TrendingUp, AlertTriangle, CheckCircle, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { View } from "@/types/views";

interface HealthDashboardViewProps {
  onNavigate: (view: View) => void;
}

export const HealthDashboardView = ({ onNavigate }: HealthDashboardViewProps) => {
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [chartData, setChartData] = useState<any[]>([]);

  const categoryLabels: Record<string, string> = {
    all: 'Todas as Categorias',
    cardiovascular: 'Cardiologia',
    metabolico: 'Metabolismo',
    hepatico: 'Função Hepática'
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // DADOS FICTÍCIOS para demonstração
      const fictitiousData = {
        analysis: {
          health_score: 0.62, // Score reduzido devido aos problemas
          analysis_summary: {
            grouped_results: [
              {
                category_name: "Cardiologia",
                parameters: [
                  {
                    name: "Troponina T",
                    value: "12",
                    unit: "ng/L",
                    reference_range: "< 14 ng/L",
                    status: "normal"
                  },
                  {
                    name: "BNP (Peptídeo Natriurético)",
                    value: "85",
                    unit: "pg/mL",
                    reference_range: "< 100 pg/mL",
                    status: "normal"
                  },
                  {
                    name: "Colesterol Total",
                    value: "198",
                    unit: "mg/dL",
                    reference_range: "< 200 mg/dL",
                    status: "normal"
                  },
                  {
                    name: "LDL Colesterol",
                    value: "125",
                    unit: "mg/dL",
                    reference_range: "< 130 mg/dL",
                    status: "normal"
                  },
                  {
                    name: "HDL Colesterol",
                    value: "52",
                    unit: "mg/dL",
                    reference_range: "> 40 mg/dL",
                    status: "normal"
                  },
                  {
                    name: "Triglicerídeos",
                    value: "145",
                    unit: "mg/dL",
                    reference_range: "< 150 mg/dL",
                    status: "normal"
                  },
                  {
                    name: "Homocisteína",
                    value: "10.5",
                    unit: "µmol/L",
                    reference_range: "5-15 µmol/L",
                    status: "normal"
                  }
                ]
              },
              {
                category_name: "Metabolismo",
                parameters: [
                  {
                    name: "Glicemia em Jejum",
                    value: "96",
                    unit: "mg/dL",
                    reference_range: "70-100 mg/dL",
                    status: "normal"
                  },
                  {
                    name: "Hemoglobina Glicada (HbA1c)",
                    value: "5.6",
                    unit: "%",
                    reference_range: "< 5.7%",
                    status: "normal"
                  },
                  {
                    name: "Insulina em Jejum",
                    value: "8.5",
                    unit: "µU/mL",
                    reference_range: "2-25 µU/mL",
                    status: "normal"
                  },
                  {
                    name: "HOMA-IR",
                    value: "2.0",
                    unit: "",
                    reference_range: "< 2.5",
                    status: "normal"
                  },
                  {
                    name: "TSH",
                    value: "2.3",
                    unit: "mUI/L",
                    reference_range: "0.4-4.0 mUI/L",
                    status: "normal"
                  },
                  {
                    name: "T4 Livre",
                    value: "1.2",
                    unit: "ng/dL",
                    reference_range: "0.8-1.8 ng/dL",
                    status: "normal"
                  },
                  {
                    name: "Cortisol",
                    value: "12.5",
                    unit: "µg/dL",
                    reference_range: "5-25 µg/dL",
                    status: "normal"
                  },
                  {
                    name: "Vitamina D",
                    value: "32",
                    unit: "ng/mL",
                    reference_range: "30-100 ng/mL",
                    status: "normal"
                  }
                ]
              },
              {
                category_name: "Função Hepática",
                parameters: [
                  {
                    name: "TGO/AST",
                    value: "89",
                    unit: "U/L",
                    reference_range: "até 40 U/L",
                    status: "critico"
                  },
                  {
                    name: "TGP/ALT",
                    value: "125",
                    unit: "U/L",
                    reference_range: "até 41 U/L",
                    status: "critico"
                  },
                  {
                    name: "GGT",
                    value: "78",
                    unit: "U/L",
                    reference_range: "até 73 U/L",
                    status: "alto"
                  },
                  {
                    name: "Fosfatase Alcalina",
                    value: "156",
                    unit: "U/L",
                    reference_range: "40-150 U/L",
                    status: "alto"
                  },
                  {
                    name: "Bilirrubina Total",
                    value: "1.1",
                    unit: "mg/dL",
                    reference_range: "0.3-1.2 mg/dL",
                    status: "normal"
                  },
                  {
                    name: "Bilirrubina Direta",
                    value: "0.3",
                    unit: "mg/dL",
                    reference_range: "< 0.4 mg/dL",
                    status: "normal"
                  },
                  {
                    name: "Albumina",
                    value: "4.2",
                    unit: "g/dL",
                    reference_range: "3.5-5.5 g/dL",
                    status: "normal"
                  }
                ]
              },
              {
                category_name: "Marcadores Inflamatórios",
                parameters: [
                  {
                    name: "PCR (Proteína C Reativa)",
                    value: "18.5",
                    unit: "mg/L",
                    reference_range: "< 5 mg/L",
                    status: "critico"
                  },
                  {
                    name: "VHS",
                    value: "35",
                    unit: "mm/h",
                    reference_range: "< 20 mm/h",
                    status: "alto"
                  },
                  {
                    name: "Ferritina",
                    value: "520",
                    unit: "ng/mL",
                    reference_range: "30-400 ng/mL",
                    status: "alto"
                  }
                ]
              }
            ],
            pre_diagnostics: [
              {
                name: "🔴 Esteatose Hepática (Fígado Gorduroso)",
                severity: "high",
                explanation: "Os níveis elevados de TGO/AST (89 U/L) e TGP/ALT (125 U/L) indicam comprometimento da função hepática. A relação AST/ALT < 1 sugere esteatose hepática (fígado gorduroso). Este quadro requer avaliação médica urgente.",
                related_parameters: [
                  { name: "TGO/AST", value: "89", unit: "U/L" },
                  { name: "TGP/ALT", value: "125", unit: "U/L" },
                  { name: "GGT", value: "78", unit: "U/L" }
                ],
                recommendations: [
                  "🏥 URGENTE: Consultar hepatologista ou gastroenterologista",
                  "🔬 Realizar ultrassonografia abdominal",
                  "📊 Avaliar função hepática completa",
                  "🥗 Iniciar dieta com restrição de gorduras",
                  "🚫 Evitar consumo de álcool",
                  "💊 Não automedicar - aguardar avaliação médica"
                ]
              },
              {
                name: "🔴 Processo Inflamatório Sistêmico Ativo",
                severity: "high",
                explanation: "PCR elevada (18.5 mg/L) indica processo inflamatório agudo intenso. VHS em 35 mm/h e ferritina em 520 ng/mL confirmam estado inflamatório sistêmico. Necessário investigação imediata da causa.",
                related_parameters: [
                  { name: "PCR", value: "18.5", unit: "mg/L" },
                  { name: "VHS", value: "35", unit: "mm/h" },
                  { name: "Ferritina", value: "520", unit: "ng/mL" }
                ],
                recommendations: [
                  "🏥 URGENTE: Consultar clínico geral ou imunologista",
                  "🔬 Investigar foco infeccioso ou inflamatório",
                  "📊 Solicitar hemograma completo e culturas",
                  "🌡️ Monitorar sintomas (febre, dor, mal-estar)",
                  "💊 Não usar anti-inflamatórios sem prescrição médica"
                ]
              },
              {
                name: "⚠️ Síndrome Metabólica - Risco Aumentado",
                severity: "medium",
                explanation: "A combinação de esteatose hepática com marcadores inflamatórios elevados sugere possível síndrome metabólica. Requer acompanhamento multidisciplinar.",
                related_parameters: [],
                recommendations: [
                  "📏 Verificar peso, IMC e circunferência abdominal",
                  "🩸 Solicitar perfil lipídico e glicemia",
                  "💓 Aferir pressão arterial regularmente",
                  "🏃 Iniciar atividade física supervisionada",
                  "🥗 Nutricionista para plano alimentar"
                ]
              }
            ]
          }
        },
        bioimpedance: [],
        wearable: [],
        exams: [],
        alerts: [
          {
            id: "alert-1",
            parameter_name: "TGP/ALT",
            value: 125,
            critical_threshold: 41,
            threshold_type: "high",
            severity: "critical",
            status: "unread",
            created_at: new Date().toISOString()
          },
          {
            id: "alert-2",
            parameter_name: "TGO/AST",
            value: 89,
            critical_threshold: 40,
            threshold_type: "high",
            severity: "critical",
            status: "unread",
            created_at: new Date().toISOString()
          },
          {
            id: "alert-3",
            parameter_name: "PCR",
            value: 18.5,
            critical_threshold: 5,
            threshold_type: "high",
            severity: "critical",
            status: "unread",
            created_at: new Date().toISOString()
          }
        ]
      };

      setHealthData(fictitiousData);

      // Preparar dados fictícios para gráficos
      const fictitiousChartData = [
        { date: "01/12", "TGO/AST": 45, "TGP/ALT": 52, "PCR": 8.2, "GGT": 55 },
        { date: "15/12", "TGO/AST": 58, "TGP/ALT": 68, "PCR": 10.5, "GGT": 62 },
        { date: "05/01", "TGO/AST": 72, "TGP/ALT": 95, "PCR": 14.2, "GGT": 70 },
        { date: "20/01", "TGO/AST": 89, "TGP/ALT": 125, "PCR": 18.5, "GGT": 78 }
      ];
      
      setChartData(fictitiousChartData);
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = async (analysisData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar histórico de exames dos últimos 6 meses
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: examImages } = await supabase
        .from('exam_images')
        .select('id, exam_date')
        .eq('user_id', user.id)
        .eq('processing_status', 'completed')
        .gte('exam_date', sixMonthsAgo.toISOString())
        .order('exam_date', { ascending: true });

      if (!examImages || examImages.length === 0) return;

      const examIds = examImages.map(e => e.id);
      const { data: results } = await supabase
        .from('exam_results')
        .select('exam_image_id, parameter_name, value, status')
        .in('exam_image_id', examIds)
        .not('value', 'is', null);

      // Identificar parâmetros críticos
      const criticalParams = new Set<string>();
      analysisData?.analysis_summary?.grouped_results?.forEach((group: any) => {
        group.parameters.forEach((param: any) => {
          if (param.status === 'critico' || param.status === 'alto') {
            criticalParams.add(param.name);
          }
        });
      });

      // Agrupar dados por data para gráfico
      const dataByDate: Record<string, any> = {};
      
      examImages.forEach(exam => {
        const dateKey = exam.exam_date || '';
        if (!dataByDate[dateKey]) {
          dataByDate[dateKey] = { date: format(new Date(dateKey), 'dd/MM') };
        }

        const examResults = results?.filter(r => r.exam_image_id === exam.id) || [];
        examResults.forEach(result => {
          if (criticalParams.has(result.parameter_name) && result.value) {
            const paramKey = result.parameter_name.substring(0, 20); // Limitar nome
            dataByDate[dateKey][paramKey] = Number(result.value);
          }
        });
      });

      setChartData(Object.values(dataByDate));
    } catch (error) {
      console.error('Error preparing chart data:', error);
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

  const score = (healthData?.analysis?.health_score || 0) * 100;
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
                {/* Pré-diagnósticos de Alta Severidade */}
                {highSeverityDiagnostics.map((diagnostic: any, idx: number) => (
                  <div key={`diag-${idx}`} className="p-4 bg-destructive/10 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-destructive text-white">ATENÇÃO</Badge>
                          <h4 
                            className="font-bold text-foreground"
                            dangerouslySetInnerHTML={{ 
                              __html: diagnostic.name
                                .replace(/Esteatose Hepática/gi, '<strong>Esteatose Hepática</strong>')
                                .replace(/Fígado Gorduroso/gi, '<strong>Fígado Gorduroso</strong>')
                                .replace(/Processo Inflamatório Sistêmico/gi, '<strong>Processo Inflamatório Sistêmico</strong>')
                                .replace(/Síndrome Metabólica/gi, '<strong>Síndrome Metabólica</strong>')
                            }}
                          />
                        </div>
                        <p 
                          className="text-sm text-foreground mb-3"
                          dangerouslySetInnerHTML={{ 
                            __html: diagnostic.explanation
                              .replace(/Função Hepática/gi, '<strong>Função Hepática</strong>')
                              .replace(/Esteatose Hepática/gi, '<strong>Esteatose Hepática</strong>')
                              .replace(/Fígado Gorduroso/gi, '<strong>Fígado Gorduroso</strong>')
                              .replace(/Processo Inflamatório Sistêmico/gi, '<strong>Processo Inflamatório Sistêmico</strong>')
                              .replace(/Síndrome Metabólica/gi, '<strong>Síndrome Metabólica</strong>')
                          }}
                        />
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
                  </div>
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

        {/* Gráficos de Evolução Temporal */}
        {chartData.length > 0 && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-semibold text-foreground">Evolução Temporal dos Parâmetros Críticos</h3>
                  <p className="text-xs text-muted-foreground">Últimos 6 meses - {selectedCategory === 'all' ? 'Todas as Categorias' : categoryLabels[selectedCategory]}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('period-comparison')}
                className="flex items-center gap-2"
              >
                <Activity className="w-4 h-4" />
                Comparar Períodos
              </Button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--foreground))"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <YAxis 
                  stroke="hsl(var(--foreground))"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                {Object.keys(chartData[0] || {})
                  .filter(key => key !== 'date')
                  .map((key, index) => (
                    <Line 
                      key={key}
                      type="monotone" 
                      dataKey={key} 
                      stroke={`hsl(${index * 60}, 70%, 50%)`}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Filtros por Categoria */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Filtrar por Categoria</h3>
          </div>
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="cardiovascular">Cardio</TabsTrigger>
              <TabsTrigger value="metabolico">Metab.</TabsTrigger>
              <TabsTrigger value="hepatico">Hepát.</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <p className="text-sm text-muted-foreground mb-3">Exibindo todos os parâmetros</p>
            </TabsContent>
            
            <TabsContent value="cardiovascular" className="mt-4 space-y-3">
              <p className="text-sm font-semibold text-foreground mb-3">Parâmetros Cardiovasculares</p>
              
              <div className="p-4 bg-success/5 rounded-lg">
                <h4 className="font-medium text-sm mb-2 text-success">Troponina T</h4>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Ref: &lt; 14 ng/L</span>
                  <span className="text-lg font-bold text-success">12 ng/L</span>
                </div>
              </div>

              <div className="p-4 bg-success/5 rounded-lg">
                <h4 className="font-medium text-sm mb-2 text-success">BNP (Peptídeo Natriurético)</h4>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Ref: &lt; 100 pg/mL</span>
                  <span className="text-lg font-bold text-success">85 pg/mL</span>
                </div>
              </div>

              <div className="p-4 bg-success/5 rounded-lg">
                <h4 className="font-medium text-sm mb-2 text-success">Colesterol Total</h4>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Ref: &lt; 200 mg/dL</span>
                  <span className="text-lg font-bold text-success">198 mg/dL</span>
                </div>
              </div>

              <div className="p-4 bg-success/5 rounded-lg">
                <h4 className="font-medium text-sm mb-2 text-success">LDL Colesterol</h4>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Ref: &lt; 130 mg/dL</span>
                  <span className="text-lg font-bold text-success">125 mg/dL</span>
                </div>
              </div>

              <div className="p-4 bg-success/5 rounded-lg">
                <h4 className="font-medium text-sm mb-2 text-success">HDL Colesterol</h4>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Ref: &gt; 40 mg/dL</span>
                  <span className="text-lg font-bold text-success">52 mg/dL</span>
                </div>
              </div>

              <div className="p-4 bg-success/5 rounded-lg">
                <h4 className="font-medium text-sm mb-2 text-success">Triglicerídeos</h4>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Ref: &lt; 150 mg/dL</span>
                  <span className="text-lg font-bold text-success">145 mg/dL</span>
                </div>
              </div>

              <div className="p-4 bg-success/5 rounded-lg">
                <h4 className="font-medium text-sm mb-2 text-success">Homocisteína</h4>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Ref: 5-15 µmol/L</span>
                  <span className="text-lg font-bold text-success">10.5 µmol/L</span>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="metabolico" className="mt-4 space-y-3">
              <p className="text-sm font-semibold text-foreground mb-3">Parâmetros Metabólicos</p>
              
              <div className="p-4 bg-success/5 rounded-lg">
                <h4 className="font-medium text-sm mb-2 text-success">Glicemia em Jejum</h4>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Ref: 70-100 mg/dL</span>
                  <span className="text-lg font-bold text-success">96 mg/dL</span>
                </div>
              </div>

              <div className="p-4 bg-success/5 rounded-lg">
                <h4 className="font-medium text-sm mb-2 text-success">Hemoglobina Glicada (HbA1c)</h4>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Ref: &lt; 5.7%</span>
                  <span className="text-lg font-bold text-success">5.6 %</span>
                </div>
              </div>

              <div className="p-4 bg-success/5 rounded-lg">
                <h4 className="font-medium text-sm mb-2 text-success">Insulina em Jejum</h4>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Ref: 2-25 µU/mL</span>
                  <span className="text-lg font-bold text-success">8.5 µU/mL</span>
                </div>
              </div>

              <div className="p-4 bg-success/5 rounded-lg">
                <h4 className="font-medium text-sm mb-2 text-success">HOMA-IR</h4>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Ref: &lt; 2.5</span>
                  <span className="text-lg font-bold text-success">2.0</span>
                </div>
              </div>

              <div className="p-4 bg-success/5 rounded-lg">
                <h4 className="font-medium text-sm mb-2 text-success">TSH</h4>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Ref: 0.4-4.0 mUI/L</span>
                  <span className="text-lg font-bold text-success">2.3 mUI/L</span>
                </div>
              </div>

              <div className="p-4 bg-success/5 rounded-lg">
                <h4 className="font-medium text-sm mb-2 text-success">T4 Livre</h4>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Ref: 0.8-1.8 ng/dL</span>
                  <span className="text-lg font-bold text-success">1.2 ng/dL</span>
                </div>
              </div>

              <div className="p-4 bg-success/5 rounded-lg">
                <h4 className="font-medium text-sm mb-2 text-success">Cortisol</h4>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Ref: 5-25 µg/dL</span>
                  <span className="text-lg font-bold text-success">12.5 µg/dL</span>
                </div>
              </div>

              <div className="p-4 bg-success/5 rounded-lg">
                <h4 className="font-medium text-sm mb-2 text-success">Vitamina D</h4>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Ref: 30-100 ng/mL</span>
                  <span className="text-lg font-bold text-success">32 ng/mL</span>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="hepatico" className="mt-4 space-y-3">
              <p className="text-sm font-semibold text-foreground mb-3">Parâmetros Hepáticos</p>
              
              <div className="p-4 bg-destructive/10 rounded-lg">
                <h4 className="font-medium text-sm mb-2 text-destructive">TGO/AST ⚠</h4>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Ref: até 40 U/L</span>
                  <span className="text-lg font-bold text-destructive">89 U/L</span>
                </div>
              </div>

              <div className="p-4 bg-destructive/10 rounded-lg">
                <h4 className="font-medium text-sm mb-2 text-destructive">TGP/ALT ⚠</h4>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Ref: até 41 U/L</span>
                  <span className="text-lg font-bold text-destructive">125 U/L</span>
                </div>
              </div>

              <div className="p-4 bg-warning/10 rounded-lg">
                <h4 className="font-medium text-sm mb-2 text-warning">GGT ↑</h4>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Ref: até 73 U/L</span>
                  <span className="text-lg font-bold text-warning">78 U/L</span>
                </div>
              </div>

              <div className="p-4 bg-warning/10 rounded-lg">
                <h4 className="font-medium text-sm mb-2 text-warning">Fosfatase Alcalina ↑</h4>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Ref: 40-150 U/L</span>
                  <span className="text-lg font-bold text-warning">156 U/L</span>
                </div>
              </div>

              <div className="p-4 bg-success/5 rounded-lg">
                <h4 className="font-medium text-sm mb-2 text-success">Bilirrubina Total</h4>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Ref: 0.3-1.2 mg/dL</span>
                  <span className="text-lg font-bold text-success">1.1 mg/dL</span>
                </div>
              </div>

              <div className="p-4 bg-success/5 rounded-lg">
                <h4 className="font-medium text-sm mb-2 text-success">Bilirrubina Direta</h4>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Ref: &lt; 0.4 mg/dL</span>
                  <span className="text-lg font-bold text-success">0.3 mg/dL</span>
                </div>
              </div>

              <div className="p-4 bg-success/5 rounded-lg">
                <h4 className="font-medium text-sm mb-2 text-success">Albumina</h4>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Ref: 3.5-5.5 g/dL</span>
                  <span className="text-lg font-bold text-success">4.2 g/dL</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Exames - Com Filtro Aplicado */}
        {healthData?.analysis?.analysis_summary?.grouped_results && (() => {
          const filteredGroups = selectedCategory === "all" 
            ? healthData.analysis.analysis_summary.grouped_results
            : healthData.analysis.analysis_summary.grouped_results.filter((group: any) => {
                const categoryLower = group.category_name?.toLowerCase() || '';
                return categoryLower.includes(selectedCategory);
              });

          if (filteredGroups.length === 0) return null;

          return (
          <Card className="p-5 border-l-4 border-l-[#3B82F6] bg-gradient-to-br from-[#3B82F6]/5 to-transparent">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#3B82F6]/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#3B82F6]" />
              </div>
              <h3 className="font-semibold text-foreground">Exames Laboratoriais</h3>
              <Badge variant="secondary" className="bg-[#3B82F6]/10 text-[#3B82F6]">{filteredGroups.length}</Badge>
            </div>
            <div className="space-y-3">
              {filteredGroups.map((group: any, idx: number) => (
                <div key={idx} className="p-4 bg-muted/30 rounded-lg">
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
                </div>
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
          );
        })()}

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
                  <div key={idx} className={`p-4 rounded-lg ${
                    diagnostic.severity === 'medium' ? 'bg-warning/10' :
                    'bg-info/10'
                  }`}>
                    <h4 className="font-medium text-sm mb-2">{diagnostic.name}</h4>
                    <p className="text-xs text-muted-foreground">{diagnostic.explanation}</p>
                  </div>
                ))}
              </div>
            </Card>
          );
        })()}

        {/* Bioimpedância */}
        {healthData?.bioimpedance && healthData.bioimpedance.length > 0 && (
          <Card className="p-5 border-l-4 border-l-[#10B981] bg-gradient-to-br from-[#10B981]/5 to-transparent">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center">
                <Scale className="w-5 h-5 text-[#10B981]" />
              </div>
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
          <Card className="p-5 border-l-4 border-l-[#8B5CF6] bg-gradient-to-br from-[#8B5CF6]/5 to-transparent">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#8B5CF6]/10 flex items-center justify-center">
                <Watch className="w-5 h-5 text-[#8B5CF6]" />
              </div>
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
