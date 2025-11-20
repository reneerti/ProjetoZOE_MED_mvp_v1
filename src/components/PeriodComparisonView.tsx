import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, Minus, ArrowRight, BarChart3, Download, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, ReferenceLine } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import zoeMedLogo from "@/assets/zoe-med-logo-new.png";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals" | "resources" | "supplements" | "exam-charts" | "alerts" | "period-comparison";

interface PeriodComparisonViewProps {
  onNavigate: (view: View) => void;
}

interface PeriodData {
  parameters: Map<string, { value: number; unit: string; status: string; date: string }>;
  examCount: number;
  dateRange: string;
}

interface ComparisonResult {
  parameter: string;
  period1Value: number;
  period2Value: number;
  unit: string;
  change: number;
  changePercent: number;
  trend: 'improved' | 'worsened' | 'stable';
  period1Status: string;
  period2Status: string;
}

export const PeriodComparisonView = ({ onNavigate }: PeriodComparisonViewProps) => {
  const { user } = useAuth();
  const [period1, setPeriod1] = useState<string>("3m");
  const [period2, setPeriod2] = useState<string>("now");
  const [loading, setLoading] = useState(false);
  const [comparisons, setComparisons] = useState<ComparisonResult[]>([]);
  const [period1Data, setPeriod1Data] = useState<PeriodData | null>(null);
  const [period2Data, setPeriod2Data] = useState<PeriodData | null>(null);

  useEffect(() => {
    if (user) {
      loadComparison();
    }
  }, [user, period1, period2]);

  const getPeriodDates = (periodKey: string): { start: Date; end: Date } => {
    const now = new Date();
    const end = new Date();
    
    if (periodKey === "now") {
      // Últimos 30 dias
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return { start, end };
    }
    
    // Para períodos históricos, calcular o range
    let monthsAgo = 3;
    switch(periodKey) {
      case "1m": monthsAgo = 1; break;
      case "3m": monthsAgo = 3; break;
      case "6m": monthsAgo = 6; break;
      case "1y": monthsAgo = 12; break;
    }
    
    const start = new Date();
    start.setMonth(start.getMonth() - monthsAgo - 1);
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() - monthsAgo);
    
    return { start, end: periodEnd };
  };

  const loadPeriodData = async (periodKey: string): Promise<PeriodData> => {
    const { start, end } = getPeriodDates(periodKey);
    
    const { data: results, error } = await supabase
      .from('exam_results')
      .select(`
        parameter_name,
        value,
        unit,
        status,
        exam_images!inner(exam_date, user_id)
      `)
      .eq('exam_images.user_id', user?.id)
      .gte('exam_images.exam_date', start.toISOString().split('T')[0])
      .lte('exam_images.exam_date', end.toISOString().split('T')[0])
      .not('value', 'is', null);

    if (error) throw error;

    const parameters = new Map<string, { value: number; unit: string; status: string; date: string }>();
    
    // Pegar o valor mais recente de cada parâmetro no período
    results?.forEach((result: any) => {
      const existing = parameters.get(result.parameter_name);
      if (!existing || new Date(result.exam_images.exam_date) > new Date(existing.date)) {
        parameters.set(result.parameter_name, {
          value: Number(result.value),
          unit: result.unit || '',
          status: result.status || 'normal',
          date: result.exam_images.exam_date
        });
      }
    });

    return {
      parameters,
      examCount: new Set(results?.map((r: any) => r.exam_images.exam_date)).size || 0,
      dateRange: `${start.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`
    };
  };

  const loadComparison = async () => {
    try {
      setLoading(true);
      
      const [data1, data2] = await Promise.all([
        loadPeriodData(period1),
        loadPeriodData(period2)
      ]);

      setPeriod1Data(data1);
      setPeriod2Data(data2);

      // Comparar parâmetros comuns
      const commonParameters = new Set<string>();
      data1.parameters.forEach((_, key) => {
        if (data2.parameters.has(key)) {
          commonParameters.add(key);
        }
      });

      const results: ComparisonResult[] = [];
      
      commonParameters.forEach(param => {
        const p1 = data1.parameters.get(param)!;
        const p2 = data2.parameters.get(param)!;
        
        const change = p2.value - p1.value;
        const changePercent = ((change / p1.value) * 100);
        
        // Determinar se a mudança é uma melhora ou piora
        let trend: 'improved' | 'worsened' | 'stable' = 'stable';
        
        if (Math.abs(changePercent) < 5) {
          trend = 'stable';
        } else if (p2.status === 'normal' && p1.status !== 'normal') {
          trend = 'improved';
        } else if (p1.status === 'normal' && p2.status !== 'normal') {
          trend = 'worsened';
        } else if (p1.status === p2.status) {
          trend = 'stable';
        } else {
          // Baseado apenas na mudança de valor se os status são diferentes mas ambos não normais
          trend = Math.abs(changePercent) < 10 ? 'stable' : (changePercent > 0 ? 'worsened' : 'improved');
        }
        
        results.push({
          parameter: param,
          period1Value: p1.value,
          period2Value: p2.value,
          unit: p1.unit,
          change,
          changePercent,
          trend,
          period1Status: p1.status,
          period2Status: p2.status
        });
      });

      // Ordenar por maior mudança absoluta
      results.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
      
      setComparisons(results);
    } catch (error) {
      console.error("Error loading comparison:", error);
      toast.error("Erro ao carregar comparação");
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improved':
        return <TrendingUp className="w-5 h-5 text-success" />;
      case 'worsened':
        return <TrendingDown className="w-5 h-5 text-destructive" />;
      default:
        return <Minus className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improved':
        return 'text-success';
      case 'worsened':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'high':
      case 'low':
      case 'critical':
        return <Badge variant="destructive" className="text-xs">Alterado</Badge>;
      default:
        return <Badge variant="outline" className="text-xs bg-success/10 text-success border-success">Normal</Badge>;
    }
  };

  const getPeriodLabel = (periodKey: string) => {
    if (periodKey === "now") return "Período Atual (últimos 30 dias)";
    const labels: Record<string, string> = {
      "1m": "Há 1 mês",
      "3m": "Há 3 meses",
      "6m": "Há 6 meses",
      "1y": "Há 1 ano"
    };
    return labels[periodKey] || periodKey;
  };

  const improvedCount = comparisons.filter(c => c.trend === 'improved').length;
  const worsenedCount = comparisons.filter(c => c.trend === 'worsened').length;
  const stableCount = comparisons.filter(c => c.trend === 'stable').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#8B5CF6] backdrop-blur supports-[backdrop-filter]:bg-[#8B5CF6]">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate("exam-charts")}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Comparação de Períodos</h1>
              <p className="text-sm text-white/80">Análise de evolução entre períodos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-24">
        {/* Period Selectors */}
        <Card className="p-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Período Inicial</label>
              <Select value={period1} onValueChange={setPeriod1}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">Há 1 mês</SelectItem>
                  <SelectItem value="3m">Há 3 meses</SelectItem>
                  <SelectItem value="6m">Há 6 meses</SelectItem>
                  <SelectItem value="1y">Há 1 ano</SelectItem>
                </SelectContent>
              </Select>
              {period1Data && (
                <p className="text-xs text-muted-foreground mt-1">
                  {period1Data.dateRange} • {period1Data.examCount} exame(s)
                </p>
              )}
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="w-6 h-6 text-muted-foreground" />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Período Final</label>
              <Select value={period2} onValueChange={setPeriod2}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="now">Período Atual</SelectItem>
                  <SelectItem value="1m">Há 1 mês</SelectItem>
                  <SelectItem value="3m">Há 3 meses</SelectItem>
                  <SelectItem value="6m">Há 6 meses</SelectItem>
                </SelectContent>
              </Select>
              {period2Data && (
                <p className="text-xs text-muted-foreground mt-1">
                  {period2Data.dateRange} • {period2Data.examCount} exame(s)
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 bg-success/10 border-success/20">
            <div className="text-center">
              <TrendingUp className="w-6 h-6 mx-auto text-success mb-1" />
              <div className="text-2xl font-bold text-success">{improvedCount}</div>
              <div className="text-xs text-muted-foreground">Melhorou</div>
            </div>
          </Card>
          <Card className="p-3 bg-muted/50">
            <div className="text-center">
              <Minus className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
              <div className="text-2xl font-bold">{stableCount}</div>
              <div className="text-xs text-muted-foreground">Estável</div>
            </div>
          </Card>
          <Card className="p-3 bg-destructive/10 border-destructive/20">
            <div className="text-center">
              <TrendingDown className="w-6 h-6 mx-auto text-destructive mb-1" />
              <div className="text-2xl font-bold text-destructive">{worsenedCount}</div>
              <div className="text-xs text-muted-foreground">Piorou</div>
            </div>
          </Card>
        </div>

        {/* Comparisons with Tabs */}
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">Lista</TabsTrigger>
            <TabsTrigger value="charts">
              <BarChart3 className="w-4 h-4 mr-2" />
              Gráficos
            </TabsTrigger>
          </TabsList>

          {/* List View */}
          <TabsContent value="list" className="space-y-0">
            <ScrollArea className="h-[calc(100vh-480px)]">
              <div className="space-y-3 pr-4">
                {loading ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">Carregando comparação...</p>
                  </Card>
                ) : comparisons.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">
                      Nenhum parâmetro comum encontrado entre os períodos selecionados
                    </p>
                  </Card>
                ) : (
                  comparisons.map((comp, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          {getTrendIcon(comp.trend)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <h3 className="font-semibold">{comp.parameter}</h3>
                            <Badge variant={comp.trend === 'improved' ? 'default' : comp.trend === 'worsened' ? 'destructive' : 'outline'}>
                              {comp.trend === 'improved' ? 'Melhorou' : comp.trend === 'worsened' ? 'Piorou' : 'Estável'}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">{getPeriodLabel(period1)}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-lg font-semibold">{comp.period1Value.toFixed(2)}</span>
                                <span className="text-xs text-muted-foreground">{comp.unit}</span>
                              </div>
                              {getStatusBadge(comp.period1Status)}
                            </div>
                            
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">{getPeriodLabel(period2)}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-lg font-semibold">{comp.period2Value.toFixed(2)}</span>
                                <span className="text-xs text-muted-foreground">{comp.unit}</span>
                              </div>
                              {getStatusBadge(comp.period2Status)}
                            </div>
                          </div>
                          
                          <div className={`text-sm font-medium ${getTrendColor(comp.trend)}`}>
                            {comp.change > 0 ? '+' : ''}{comp.change.toFixed(2)} {comp.unit} 
                            ({comp.changePercent > 0 ? '+' : ''}{comp.changePercent.toFixed(1)}%)
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Charts View */}
          <TabsContent value="charts" className="space-y-0">
            <ScrollArea className="h-[calc(100vh-480px)]">
              <div className="space-y-6 pr-4">
                {loading ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">Carregando comparação...</p>
                  </Card>
                ) : comparisons.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">
                      Nenhum parâmetro comum encontrado entre os períodos selecionados
                    </p>
                  </Card>
                ) : (
                  comparisons.slice(0, 10).map((comp, index) => {
                    const chartData = [
                      {
                        name: getPeriodLabel(period1),
                        value: comp.period1Value,
                        period: 'Inicial'
                      },
                      {
                        name: getPeriodLabel(period2),
                        value: comp.period2Value,
                        period: 'Final'
                      }
                    ];

                    const barColor = comp.trend === 'improved' 
                      ? 'hsl(var(--success))' 
                      : comp.trend === 'worsened' 
                      ? 'hsl(var(--destructive))' 
                      : 'hsl(var(--muted-foreground))';

                    return (
                      <Card key={index} className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-muted">
                              {getTrendIcon(comp.trend)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{comp.parameter}</h3>
                              <p className="text-sm text-muted-foreground">
                                {comp.change > 0 ? '+' : ''}{comp.change.toFixed(2)} {comp.unit} 
                                ({comp.changePercent > 0 ? '+' : ''}{comp.changePercent.toFixed(1)}%)
                              </p>
                            </div>
                          </div>
                          <Badge 
                            variant={comp.trend === 'improved' ? 'default' : comp.trend === 'worsened' ? 'destructive' : 'outline'}
                            className="text-sm"
                          >
                            {comp.trend === 'improved' ? 'Melhorou' : comp.trend === 'worsened' ? 'Piorou' : 'Estável'}
                          </Badge>
                        </div>

                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              dataKey="name" 
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                              angle={-15}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis 
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                              label={{ 
                                value: comp.unit, 
                                angle: -90, 
                                position: 'insideLeft',
                                style: { fill: 'hsl(var(--muted-foreground))' }
                              }}
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                fontSize: '12px'
                              }}
                              formatter={(value: any) => [`${Number(value).toFixed(2)} ${comp.unit}`, 'Valor']}
                            />
                            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                              <Cell fill="hsl(var(--primary))" fillOpacity={0.6} />
                              <Cell fill={barColor} fillOpacity={0.9} />
                            </Bar>
                            {/* Trend Arrow Overlay */}
                            {comp.trend !== 'stable' && (
                              <ReferenceLine 
                                y={Math.max(comp.period1Value, comp.period2Value)} 
                                stroke="transparent"
                              />
                            )}
                          </BarChart>
                        </ResponsiveContainer>

                        {/* Status badges below chart */}
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">Status Inicial</p>
                            {getStatusBadge(comp.period1Status)}
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">Status Final</p>
                            {getStatusBadge(comp.period2Status)}
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
                {comparisons.length > 10 && (
                  <Card className="p-4 bg-muted/50 text-center">
                    <p className="text-sm text-muted-foreground">
                      Mostrando os 10 parâmetros com maiores mudanças
                    </p>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
