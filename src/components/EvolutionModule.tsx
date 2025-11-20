import { useEffect, useState } from "react";
import { ArrowLeft, Sparkles, TrendingUp, AlertCircle, User, Loader2, LineChart as LineChartIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals" | "resources" | "supplements" | "exam-charts" | "alerts" | "period-comparison";

interface EvolutionModuleProps {
  onNavigate: (view: View) => void;
}

interface HealthAnalysis {
  health_score: number;
  analysis_summary: {
    summary: string;
    evolution: Array<{
      category: string;
      trend: string;
      details: string;
    }>;
  };
  attention_points: Array<{
    category: string;
    parameter: string;
    value: string;
    status: string;
    recommendation: string;
  }>;
  specialist_recommendations: Array<{
    specialty: string;
    reason: string;
    priority: string;
  }>;
  updated_at: string;
}

interface ExamDataPoint {
  date: string;
  value: number;
  parameter_name: string;
  unit: string;
  reference_min?: number;
  reference_max?: number;
}

interface ParameterHistory {
  parameter_name: string;
  unit: string;
  data: Array<{
    date: string;
    value: number;
  }>;
  reference_min?: number;
  reference_max?: number;
}

export const EvolutionModule = ({ onNavigate }: EvolutionModuleProps) => {
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<HealthAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [parameterHistory, setParameterHistory] = useState<ParameterHistory[]>([]);
  const [selectedParameter, setSelectedParameter] = useState<string>("");
  const [loadingCharts, setLoadingCharts] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAnalysis();
      fetchParameterHistory();
    }
  }, [user]);

  const fetchAnalysis = async () => {
    try {
      const { data, error } = await supabase
        .from('health_analysis')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setAnalysis(data as unknown as HealthAnalysis);
    } catch (error) {
      console.error("Error fetching analysis:", error);
    } finally {
      setLoading(false);
    }
  };

  const runIntegratedAnalysis = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-exams-integrated');

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Análise integrada concluída!");
      setAnalysis(data.analysis as unknown as HealthAnalysis);
    } catch (error: any) {
      console.error("Error running analysis:", error);
      toast.error(error.message || "Erro ao executar análise");
    } finally {
      setAnalyzing(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'alta': return 'bg-destructive text-destructive-foreground';
      case 'média': return 'bg-warning text-warning-foreground';
      case 'baixa': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'text-muted-foreground';
    switch (status.toLowerCase()) {
      case 'crítico': return 'text-destructive';
      case 'alto': return 'text-warning';
      case 'baixo': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  const getTrendEmoji = (trend: string) => {
    switch (trend.toLowerCase()) {
      case 'melhorando': return '📈';
      case 'piorando': return '📉';
      case 'estável': return '➡️';
      default: return '📊';
    }
  };

  const fetchParameterHistory = async () => {
    setLoadingCharts(true);
    try {
      // Buscar resultados de exames com suas datas
      const { data: examResults, error } = await supabase
        .from('exam_results')
        .select(`
          parameter_name,
          value,
          unit,
          exam_image_id,
          exam_images!inner (
            exam_date,
            user_id
          )
        `)
        .eq('exam_images.user_id', user?.id)
        .not('value', 'is', null);

      if (error) throw error;

      // Buscar parâmetros de referência
      const { data: parameters, error: paramError } = await supabase
        .from('exam_parameters')
        .select('parameter_name, unit, reference_min, reference_max');

      if (paramError) throw paramError;

      // Criar mapa de referências
      const refMap = new Map(
        parameters?.map(p => [p.parameter_name, p]) || []
      );

      // Agrupar por parâmetro
      const grouped = new Map<string, ExamDataPoint[]>();
      
      examResults?.forEach((result: any) => {
        const date = result.exam_images.exam_date;
        const value = parseFloat(result.value);
        
        if (!isNaN(value) && date) {
          const key = result.parameter_name;
          if (!grouped.has(key)) {
            grouped.set(key, []);
          }
          
          const ref = refMap.get(result.parameter_name);
          grouped.get(key)!.push({
            date,
            value,
            parameter_name: result.parameter_name,
            unit: result.unit || ref?.unit || '',
            reference_min: ref?.reference_min,
            reference_max: ref?.reference_max
          });
        }
      });

      // Converter para array e ordenar por data
      const history: ParameterHistory[] = Array.from(grouped.entries())
        .filter(([_, points]) => points.length >= 2) // Só parâmetros com pelo menos 2 medições
        .map(([name, points]) => {
          const sortedPoints = points.sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          
          return {
            parameter_name: name,
            unit: points[0].unit,
            data: sortedPoints.map(p => ({
              date: new Date(p.date).toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: 'short',
                year: '2-digit'
              }),
              value: p.value
            })),
            reference_min: points[0].reference_min,
            reference_max: points[0].reference_max
          };
        })
        .sort((a, b) => a.parameter_name.localeCompare(b.parameter_name));

      setParameterHistory(history);
      
      // Selecionar o primeiro parâmetro por padrão
      if (history.length > 0 && !selectedParameter) {
        setSelectedParameter(history[0].parameter_name);
      }
    } catch (error) {
      console.error("Error fetching parameter history:", error);
      toast.error("Erro ao carregar histórico de parâmetros");
    } finally {
      setLoadingCharts(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white p-6 shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={() => onNavigate("dashboard")}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2.4} />
          </button>
          <div>
            <h1 className="text-2xl font-bold drop-shadow-md">Evolução Geral</h1>
            <p className="text-white/90 text-sm drop-shadow">Análise integrada com IA</p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-24">
        {loading ? (
          <Card className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-muted-foreground">Carregando análise...</p>
          </Card>
        ) : !analysis ? (
          <Card className="p-8 text-center">
            <Sparkles className="w-16 h-16 text-accent mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-3">Análise Integrada com IA</h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Execute a análise integrada de todos os seus exames para receber insights personalizados.
            </p>
            <Button 
              onClick={runIntegratedAnalysis}
              disabled={analyzing}
              className="bg-primary hover:bg-primary/90"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Executar Análise
                </>
              )}
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Health Score */}
            <Card className="p-6 bg-gradient-to-br from-primary to-accent text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium mb-1 text-white/90">Score de Saúde</div>
                  <div className="text-5xl font-bold">{Number(analysis.health_score).toFixed(1)}</div>
                  <div className="text-sm mt-3 text-white/90">
                    Última atualização: {new Date(analysis.updated_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div className="relative w-28 h-28">
                  <svg className="transform -rotate-90 w-28 h-28">
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      stroke="white"
                      strokeOpacity="0.2"
                      strokeWidth="10"
                      fill="none"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      stroke="white"
                      strokeWidth="10"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 48}`}
                      strokeDashoffset={`${2 * Math.PI * 48 * (1 - Number(analysis.health_score) / 10)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <TrendingUp className="w-10 h-10 text-white" />
                  </div>
                </div>
              </div>
            </Card>

            {/* Summary */}
            {analysis.analysis_summary?.summary && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  Resumo Geral
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {analysis.analysis_summary.summary}
                </p>
              </Card>
            )}

            {/* Attention Points */}
            {analysis.attention_points && analysis.attention_points.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-warning" />
                  Pontos de Atenção
                </h3>
                <div className="space-y-4">
                  {analysis.attention_points.map((point, idx) => (
                    <div key={idx} className="border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{point.parameter}</div>
                          <div className="text-sm text-muted-foreground">{point.category}</div>
                        </div>
                        <Badge variant="outline" className={getStatusColor(point.status)}>
                          {point.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        Valor: <span className="font-medium text-foreground">{point.value}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {point.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Evolution */}
            {analysis.analysis_summary.evolution && analysis.analysis_summary.evolution.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-success" />
                  Evolução dos Exames
                </h3>
                <div className="space-y-4">
                  {analysis.analysis_summary.evolution.map((evo, idx) => (
                    <div key={idx} className="border border-border rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-2">
                        <span className="text-2xl">{getTrendEmoji(evo.trend)}</span>
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{evo.category}</div>
                          <Badge variant="outline" className="mt-1">
                            {evo.trend}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {evo.details}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Specialist Recommendations */}
            {analysis.specialist_recommendations && analysis.specialist_recommendations.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Recomendações de Especialistas
                </h3>
                <div className="space-y-4">
                  {analysis.specialist_recommendations.map((spec, idx) => (
                    <div key={idx} className="border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-medium text-foreground">{spec.specialty}</div>
                        <Badge className={getPriorityColor(spec.priority)}>
                          Prioridade {spec.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {spec.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Parameter Evolution Charts */}
            {parameterHistory.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <LineChartIcon className="w-5 h-5 text-primary" />
                  Evolução Temporal dos Parâmetros
                </h3>
                
                <div className="mb-4">
                  <Select value={selectedParameter} onValueChange={setSelectedParameter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione um parâmetro" />
                    </SelectTrigger>
                    <SelectContent>
                      {parameterHistory.map((param) => (
                        <SelectItem key={param.parameter_name} value={param.parameter_name}>
                          {param.parameter_name} ({param.data.length} medições)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedParameter && (() => {
                  const param = parameterHistory.find(p => p.parameter_name === selectedParameter);
                  if (!param) return null;

                  return (
                    <div>
                      <div className="mb-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{param.parameter_name}</span>
                        {param.unit && <span> ({param.unit})</span>}
                        {param.reference_min !== undefined && param.reference_max !== undefined && (
                          <span className="ml-2">
                            • Referência: {param.reference_min} - {param.reference_max}
                          </span>
                        )}
                      </div>

                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={param.data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="date" 
                            className="text-xs"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <YAxis 
                            className="text-xs"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            domain={[
                              (dataMin: number) => {
                                const min = param.reference_min !== undefined 
                                  ? Math.min(dataMin, param.reference_min) 
                                  : dataMin;
                                return Math.floor(min * 0.9);
                              },
                              (dataMax: number) => {
                                const max = param.reference_max !== undefined 
                                  ? Math.max(dataMax, param.reference_max) 
                                  : dataMax;
                                return Math.ceil(max * 1.1);
                              }
                            ]}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                          
                          {/* Faixa de referência */}
                          {param.reference_min !== undefined && param.reference_max !== undefined && (
                            <>
                              <Line 
                                type="monotone" 
                                dataKey={() => param.reference_min}
                                stroke="hsl(var(--muted-foreground))" 
                                strokeDasharray="5 5"
                                dot={false}
                                name="Mínimo"
                                strokeWidth={1}
                              />
                              <Line 
                                type="monotone" 
                                dataKey={() => param.reference_max}
                                stroke="hsl(var(--muted-foreground))" 
                                strokeDasharray="5 5"
                                dot={false}
                                name="Máximo"
                                strokeWidth={1}
                              />
                            </>
                          )}
                          
                          {/* Linha de valores reais */}
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={3}
                            dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                            activeDot={{ r: 7 }}
                            name={param.parameter_name}
                          />
                        </LineChart>
                      </ResponsiveContainer>

                      {/* Estatísticas */}
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div className="bg-muted/50 rounded-lg p-2">
                          <div className="text-xs text-muted-foreground">Último</div>
                          <div className="text-sm font-semibold text-foreground">
                            {param.data[param.data.length - 1].value}
                          </div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2">
                          <div className="text-xs text-muted-foreground">Média</div>
                          <div className="text-sm font-semibold text-foreground">
                            {(param.data.reduce((sum, d) => sum + d.value, 0) / param.data.length).toFixed(1)}
                          </div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2">
                          <div className="text-xs text-muted-foreground">Variação</div>
                          <div className="text-sm font-semibold text-foreground">
                            {((param.data[param.data.length - 1].value - param.data[0].value) / param.data[0].value * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </Card>
            )}

            {/* Refresh Button */}
            <Button 
              onClick={runIntegratedAnalysis}
              disabled={analyzing}
              variant="outline"
              className="w-full"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Atualizando análise...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Atualizar Análise
                </>
              )}
            </Button>
          </div>
        )}

        {/* Medical Disclaimer */}
        <Card className="p-4 bg-muted border-border mt-6">
          <div className="flex gap-3">
            <div className="text-2xl">⚕️</div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">AVISO IMPORTANTE:</strong> Esta análise é educacional e não substitui consulta médica. Leve seus resultados para seu médico avaliar.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
