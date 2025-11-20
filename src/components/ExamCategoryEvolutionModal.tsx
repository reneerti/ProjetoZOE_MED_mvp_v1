import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface ExamCategoryEvolutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  parameters: Array<{
    name: string;
    value: string | number;
    unit?: string;
    status: "normal" | "alto" | "baixo" | "critico";
  }>;
}

export const ExamCategoryEvolutionModal = ({ 
  open, 
  onOpenChange, 
  categoryName,
  parameters 
}: ExamCategoryEvolutionModalProps) => {
  const [loading, setLoading] = useState(false);
  const [evolutionData, setEvolutionData] = useState<any[]>([]);

  useEffect(() => {
    if (open && parameters.length > 0) {
      fetchEvolutionData();
    }
  }, [open, parameters]);

  const fetchEvolutionData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const parameterNames = parameters.map(p => p.name);

      const { data: examImages } = await supabase
        .from('exam_images')
        .select('id, exam_date')
        .eq('user_id', user.id)
        .not('exam_date', 'is', null)
        .order('exam_date', { ascending: true });

      if (!examImages || examImages.length === 0) {
        setEvolutionData([]);
        return;
      }

      const examIds = examImages.map(img => img.id);

      const { data: results } = await supabase
        .from('exam_results')
        .select('exam_image_id, parameter_name, value, unit')
        .in('exam_image_id', examIds)
        .in('parameter_name', parameterNames)
        .not('value', 'is', null);

      if (!results || results.length === 0) {
        setEvolutionData([]);
        return;
      }

      const dataByDate = new Map();

      results.forEach(result => {
        const examImage = examImages.find(img => img.id === result.exam_image_id);
        if (!examImage) return;

        const dateKey = examImage.exam_date;
        if (!dataByDate.has(dateKey)) {
          dataByDate.set(dateKey, {
            date: dateKey,
            formattedDate: format(new Date(dateKey), 'dd/MM/yyyy')
          });
        }

        const dateData = dataByDate.get(dateKey);
        dateData[result.parameter_name] = result.value;
      });

      const sortedData = Array.from(dataByDate.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      setEvolutionData(sortedData);
    } catch (error) {
      console.error('Error fetching evolution data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (paramName: string) => {
    if (evolutionData.length < 2) return <Minus className="w-4 h-4" />;

    const lastValue = evolutionData[evolutionData.length - 1][paramName];
    const previousValue = evolutionData[evolutionData.length - 2][paramName];

    if (!lastValue || !previousValue) return <Minus className="w-4 h-4" />;

    if (lastValue > previousValue) {
      return <TrendingUp className="w-4 h-4 text-destructive" />;
    } else if (lastValue < previousValue) {
      return <TrendingDown className="w-4 h-4 text-success" />;
    }
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "normal":
        return "text-success";
      case "alto":
      case "critico":
        return "text-destructive";
      case "baixo":
        return "text-warning";
      default:
        return "text-foreground";
    }
  };

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Evolução: {categoryName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : evolutionData.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              Não há dados históricos suficientes para mostrar a evolução destes parâmetros.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {parameters.map((param, index) => (
                <Card key={index} className="p-3">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">{param.name}</p>
                      <p className={`text-lg font-semibold ${getStatusColor(param.status)}`}>
                        {param.value}{param.unit ? ` ${param.unit}` : ""}
                      </p>
                    </div>
                    {getTrendIcon(param.name)}
                  </div>
                  <Badge 
                    variant={param.status === "normal" ? "outline" : "default"}
                    className={`text-xs ${
                      param.status === "normal" 
                        ? "bg-success-light text-success border-success" 
                        : param.status === "alto" || param.status === "critico"
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-warning text-warning-foreground"
                    }`}
                  >
                    {param.status === "normal" ? "Normal" : 
                     param.status === "alto" ? "Elevado" :
                     param.status === "critico" ? "Crítico" : "Baixo"}
                  </Badge>
                </Card>
              ))}
            </div>

            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-4">Evolução Temporal</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="formattedDate" 
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  {parameters.map((param, index) => (
                    <Line
                      key={index}
                      type="monotone"
                      dataKey={param.name}
                      stroke={colors[index % colors.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card className="bg-info/10 border-info/30 p-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                📊 <strong>Sobre a evolução:</strong> Este gráfico mostra como seus parâmetros mudaram ao longo do tempo. 
                Tendências ascendentes ou descendentes podem indicar necessidade de ajustes. Sempre consulte seu médico.
              </p>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
