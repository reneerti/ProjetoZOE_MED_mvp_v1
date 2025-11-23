import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ParameterTrendChartProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parameterName: string;
  currentValue: string | number;
  unit?: string;
  status: string;
}

interface DataPoint {
  date: string;
  value: number;
}

export const ParameterTrendChart = ({
  open,
  onOpenChange,
  parameterName,
  currentValue,
  unit,
  status
}: ParameterTrendChartProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<DataPoint[]>([]);
  const [referenceMin, setReferenceMin] = useState<number | null>(null);
  const [referenceMax, setReferenceMax] = useState<number | null>(null);
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable');

  useEffect(() => {
    if (open && user) {
      loadHistoricalData();
    }
  }, [open, user, parameterName]);

  const loadHistoricalData = async () => {
    try {
      setLoading(true);

      // Get reference ranges
      const { data: paramInfo } = await supabase
        .from('exam_parameters')
        .select('reference_min, reference_max')
        .eq('parameter_name', parameterName)
        .maybeSingle();

      if (paramInfo) {
        setReferenceMin(paramInfo.reference_min);
        setReferenceMax(paramInfo.reference_max);
      }

      // Get historical data
      const { data: results } = await supabase
        .from('exam_results')
        .select(`
          value,
          exam_images!inner(exam_date, user_id)
        `)
        .eq('exam_images.user_id', user?.id)
        .eq('parameter_name', parameterName)
        .not('value', 'is', null)
        .order('exam_images(exam_date)', { ascending: true });

      if (results && results.length > 0) {
        const formattedData: DataPoint[] = results.map((result: any) => ({
          date: new Date(result.exam_images.exam_date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short'
          }),
          value: Number(result.value)
        }));

        setChartData(formattedData);

        // Calculate trend
        if (formattedData.length >= 2) {
          const firstValue = formattedData[0].value;
          const lastValue = formattedData[formattedData.length - 1].value;
          const percentChange = ((lastValue - firstValue) / firstValue) * 100;

          if (Math.abs(percentChange) < 5) {
            setTrend('stable');
          } else if (percentChange > 0) {
            setTrend('up');
          } else {
            setTrend('down');
          }
        }
      }
    } catch (error) {
      console.error('Error loading historical data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      default:
        return <Minus className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getTrendText = () => {
    switch (trend) {
      case 'up':
        return 'Tendência de alta';
      case 'down':
        return 'Tendência de baixa';
      default:
        return 'Tendência estável';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Evolução: {parameterName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Não há dados históricos suficientes para este parâmetro
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current Value Card */}
            <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Valor Atual</p>
                  <p className="text-3xl font-bold text-foreground">
                    {currentValue} {unit}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    {getTrendIcon()}
                    <span className="text-sm font-medium">{getTrendText()}</span>
                  </div>
                  <Badge 
                    variant={status === 'normal' ? 'outline' : 'destructive'}
                    className={status === 'normal' ? 'bg-success-light text-success border-success' : ''}
                  >
                    {status === 'normal' ? '✓ Normal' : '⚠ Alterado'}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Historical Chart */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Histórico de Medições</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value} ${unit}`, parameterName]}
                  />
                  <Legend />
                  
                  {/* Reference Lines */}
                  {referenceMin !== null && (
                    <ReferenceLine 
                      y={referenceMin} 
                      stroke="hsl(var(--success))" 
                      strokeDasharray="3 3"
                      label={{ value: 'Mín', position: 'right', fontSize: 10 }}
                    />
                  )}
                  {referenceMax !== null && (
                    <ReferenceLine 
                      y={referenceMax} 
                      stroke="hsl(var(--destructive))" 
                      strokeDasharray="3 3"
                      label={{ value: 'Máx', position: 'right', fontSize: 10 }}
                    />
                  )}
                  
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ r: 5, fill: 'hsl(var(--primary))' }}
                    activeDot={{ r: 7 }}
                    name={parameterName}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Statistics */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Estatísticas</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Primeira Medição</p>
                  <p className="font-semibold">{chartData[0].value} {unit}</p>
                  <p className="text-xs text-muted-foreground">{chartData[0].date}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Última Medição</p>
                  <p className="font-semibold">{chartData[chartData.length - 1].value} {unit}</p>
                  <p className="text-xs text-muted-foreground">{chartData[chartData.length - 1].date}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Variação</p>
                  <p className="font-semibold">
                    {(chartData[chartData.length - 1].value - chartData[0].value).toFixed(1)} {unit}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {((chartData[chartData.length - 1].value - chartData[0].value) / chartData[0].value * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </Card>

            {/* Reference Range Info */}
            {(referenceMin !== null || referenceMax !== null) && (
              <Card className="p-4 bg-muted/30">
                <p className="text-sm">
                  <strong>Valores de Referência:</strong>{' '}
                  {referenceMin !== null && `${referenceMin}`}
                  {referenceMin !== null && referenceMax !== null && ' - '}
                  {referenceMax !== null && `${referenceMax}`}
                  {' '}{unit}
                </p>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
