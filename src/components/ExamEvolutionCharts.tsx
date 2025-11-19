import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, ZoomIn, ZoomOut, Filter, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals";

interface ExamEvolutionChartsProps {
  onNavigate: (view: View) => void;
}

interface DataPoint {
  date: string;
  [key: string]: number | string;
}

interface Parameter {
  id: string;
  name: string;
  unit: string;
  color: string;
  referenceMin: number | null;
  referenceMax: number | null;
}

const CHART_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#14B8A6'
];

export const ExamEvolutionCharts = ({ onNavigate }: ExamEvolutionChartsProps) => {
  const { user } = useAuth();
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [selectedParameters, setSelectedParameters] = useState<Set<string>>(new Set());
  const [chartData, setChartData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<string>("all");
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    if (user) {
      loadAvailableParameters();
    }
  }, [user]);

  useEffect(() => {
    if (selectedParameters.size > 0) {
      loadChartData();
    }
  }, [selectedParameters, dateRange]);

  const loadAvailableParameters = async () => {
    try {
      // Buscar todos os parâmetros que o usuário tem resultados
      const { data: results } = await supabase
        .from('exam_results')
        .select(`
          parameter_name,
          unit,
          exam_images!inner(user_id, exam_date)
        `)
        .eq('exam_images.user_id', user?.id)
        .not('value', 'is', null);

      if (!results) return;

      // Buscar informações de referência dos parâmetros
      const { data: paramInfo } = await supabase
        .from('exam_parameters')
        .select('parameter_name, reference_min, reference_max');

      const paramMap = new Map(
        paramInfo?.map(p => [p.parameter_name, { min: p.reference_min, max: p.reference_max }]) || []
      );

      // Agrupar parâmetros únicos
      const uniqueParams = new Map<string, { unit: string; count: number }>();
      
      results.forEach((result: any) => {
        const key = result.parameter_name;
        if (!uniqueParams.has(key)) {
          uniqueParams.set(key, { unit: result.unit || '', count: 1 });
        } else {
          const current = uniqueParams.get(key)!;
          uniqueParams.set(key, { ...current, count: current.count + 1 });
        }
      });

      // Converter para array e adicionar cores
      const paramsArray: Parameter[] = Array.from(uniqueParams.entries())
        .map(([name, info], index) => {
          const refInfo = paramMap.get(name);
          return {
            id: name,
            name,
            unit: info.unit,
            color: CHART_COLORS[index % CHART_COLORS.length],
            referenceMin: refInfo?.min || null,
            referenceMax: refInfo?.max || null,
          };
        })
        .sort((a, b) => b.name.localeCompare(a.name));

      setParameters(paramsArray);

      // Selecionar automaticamente os 3 primeiros parâmetros
      if (paramsArray.length > 0) {
        const initialSelection = new Set(paramsArray.slice(0, Math.min(3, paramsArray.length)).map(p => p.id));
        setSelectedParameters(initialSelection);
      }
    } catch (error) {
      console.error("Error loading parameters:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async () => {
    try {
      setLoading(true);

      // Calcular data inicial baseada no range selecionado
      let dateFilter = '';
      const now = new Date();
      
      switch(dateRange) {
        case '1m':
          const oneMonthAgo = new Date(now.setMonth(now.getMonth() - 1));
          dateFilter = oneMonthAgo.toISOString().split('T')[0];
          break;
        case '3m':
          const threeMonthsAgo = new Date(now.setMonth(now.getMonth() - 3));
          dateFilter = threeMonthsAgo.toISOString().split('T')[0];
          break;
        case '6m':
          const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6));
          dateFilter = sixMonthsAgo.toISOString().split('T')[0];
          break;
        case '1y':
          const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
          dateFilter = oneYearAgo.toISOString().split('T')[0];
          break;
        default:
          dateFilter = '';
      }

      let query = supabase
        .from('exam_results')
        .select(`
          parameter_name,
          value,
          exam_images!inner(exam_date, user_id)
        `)
        .eq('exam_images.user_id', user?.id)
        .in('parameter_name', Array.from(selectedParameters))
        .not('value', 'is', null)
        .order('exam_images(exam_date)', { ascending: true });

      if (dateFilter) {
        query = query.gte('exam_images.exam_date', dateFilter);
      }

      const { data } = await query;

      if (!data) return;

      // Organizar dados por data
      const dataByDate = new Map<string, Record<string, number>>();

      data.forEach((result: any) => {
        const date = new Date(result.exam_images.exam_date).toLocaleDateString('pt-BR');
        
        if (!dataByDate.has(date)) {
          dataByDate.set(date, {});
        }
        
        const dateData = dataByDate.get(date)!;
        dateData[result.parameter_name] = Number(result.value);
      });

      // Converter para array para o gráfico
      const chartArray: DataPoint[] = Array.from(dataByDate.entries()).map(([date, values]) => ({
        date,
        ...values
      }));

      setChartData(chartArray);
    } catch (error) {
      console.error("Error loading chart data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleParameter = (paramId: string) => {
    const newSelected = new Set(selectedParameters);
    if (newSelected.has(paramId)) {
      newSelected.delete(paramId);
    } else {
      newSelected.add(paramId);
    }
    setSelectedParameters(newSelected);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  };

  const getTrendIcon = (paramId: string) => {
    if (chartData.length < 2) return <Minus className="w-4 h-4" />;
    
    const firstValue = chartData[0][paramId] as number;
    const lastValue = chartData[chartData.length - 1][paramId] as number;
    
    if (!firstValue || !lastValue) return <Minus className="w-4 h-4" />;
    
    if (lastValue > firstValue) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (lastValue < firstValue) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#3B82F6] backdrop-blur supports-[backdrop-filter]:bg-[#3B82F6]">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate("myexams")}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Evolução Comparativa</h1>
              <p className="text-sm text-white/80">Análise temporal de parâmetros</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-24">
        {/* Controles */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-muted-foreground" />
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo período</SelectItem>
                  <SelectItem value="1m">Último mês</SelectItem>
                  <SelectItem value="3m">Últimos 3 meses</SelectItem>
                  <SelectItem value="6m">Últimos 6 meses</SelectItem>
                  <SelectItem value="1y">Último ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[60px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 2}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Seleção de Parâmetros */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Parâmetros ({selectedParameters.size} selecionados)
          </h3>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {parameters.map((param) => (
                <div
                  key={param.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      checked={selectedParameters.has(param.id)}
                      onCheckedChange={() => toggleParameter(param.id)}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: param.color }}
                      />
                      <span className="font-medium text-sm">{param.name}</span>
                      {param.unit && (
                        <Badge variant="outline" className="text-xs">
                          {param.unit}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {getTrendIcon(param.id)}
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Gráfico */}
        {selectedParameters.size > 0 && chartData.length > 0 ? (
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Evolução Temporal</h3>
            <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  {Array.from(selectedParameters).map((paramId) => {
                    const param = parameters.find(p => p.id === paramId);
                    if (!param) return null;
                    
                    return (
                      <Line
                        key={paramId}
                        type="monotone"
                        dataKey={paramId}
                        stroke={param.color}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        name={`${param.name} (${param.unit})`}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Legendas de Referência */}
            <div className="mt-4 pt-4 border-t space-y-2">
              {Array.from(selectedParameters).map((paramId) => {
                const param = parameters.find(p => p.id === paramId);
                if (!param || (!param.referenceMin && !param.referenceMax)) return null;

                return (
                  <div key={paramId} className="flex items-center justify-between text-sm">
                    <span className="font-medium" style={{ color: param.color }}>
                      {param.name}
                    </span>
                    <span className="text-muted-foreground">
                      Referência: {param.referenceMin || '?'} - {param.referenceMax || '?'} {param.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : selectedParameters.size === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              Selecione pelo menos um parâmetro para visualizar o gráfico
            </p>
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              Nenhum dado disponível para o período selecionado
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};
