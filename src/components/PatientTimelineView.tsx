import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingDown, TrendingUp, Minus, Download, Loader2, ArrowLeft, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import zoeMedLogo from "@/assets/zoe-med-logo-new.png";
import type { View } from "@/types/views";
import { TimelineAnnotation, type Annotation } from "./timeline/TimelineAnnotation";
import { Checkbox } from "@/components/ui/checkbox";

interface PatientTimelineViewProps {
  onNavigate: (view: View) => void;
}

interface TimelinePeriod {
  id: string;
  label: string;
  startDate: Date;
  endDate: Date;
  color: string;
}

interface ParameterData {
  name: string;
  unit: string;
  values: Array<{
    period: string;
    value: number;
    date: string;
  }>;
}

const PARAMETER_CATEGORIES = {
  cardiovascular: ['Colesterol Total', 'HDL', 'LDL', 'Triglicerídeos', 'Pressão Arterial'],
  metabolico: ['Glicose', 'Hemoglobina Glicada', 'Insulina', 'TSH', 'T4 Livre'],
  hepatico: ['TGO', 'TGP', 'Gama GT', 'Fosfatase Alcalina', 'Bilirrubina'],
  renal: ['Creatinina', 'Ureia', 'Ácido Úrico'],
  hematologico: ['Hemoglobina', 'Hematócrito', 'Leucócitos', 'Plaquetas']
};

export const PatientTimelineView = ({ onNavigate }: PatientTimelineViewProps) => {
  const [selectedParameters, setSelectedParameters] = useState<string[]>([]);
  const [availableParameters, setAvailableParameters] = useState<string[]>([]);
  const [timelineData, setTimelineData] = useState<ParameterData[]>([]);
  const [periods, setPeriods] = useState<TimelinePeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    initializePeriods();
    fetchAvailableParameters();
    loadAnnotations();
  }, []);

  useEffect(() => {
    if (selectedParameters.length > 0 && periods.length > 0) {
      fetchTimelineData();
    }
  }, [selectedParameters, periods]);

  useEffect(() => {
    if (selectedCategories.length > 0) {
      filterParametersByCategory();
    }
  }, [selectedCategories]);

  const loadAnnotations = () => {
    const stored = localStorage.getItem('timeline_annotations');
    if (stored) {
      setAnnotations(JSON.parse(stored));
    }
  };

  const saveAnnotations = (newAnnotations: Annotation[]) => {
    localStorage.setItem('timeline_annotations', JSON.stringify(newAnnotations));
    setAnnotations(newAnnotations);
  };

  const handleAddAnnotation = (annotation: Omit<Annotation, 'id'>) => {
    const newAnnotation = {
      ...annotation,
      id: Date.now().toString()
    };
    saveAnnotations([...annotations, newAnnotation]);
    toast.success("Anotação adicionada");
  };

  const handleEditAnnotation = (id: string, annotation: Omit<Annotation, 'id'>) => {
    const updated = annotations.map(a => a.id === id ? { ...annotation, id } : a);
    saveAnnotations(updated);
    toast.success("Anotação atualizada");
  };

  const handleDeleteAnnotation = (id: string) => {
    saveAnnotations(annotations.filter(a => a.id !== id));
    toast.success("Anotação removida");
  };

  const filterParametersByCategory = () => {
    if (selectedCategories.length === 0) return;

    const categoryParams = selectedCategories.flatMap(cat => PARAMETER_CATEGORIES[cat as keyof typeof PARAMETER_CATEGORIES] || []);
    const filtered = availableParameters.filter(p => 
      categoryParams.some(cp => p.toLowerCase().includes(cp.toLowerCase()))
    );
    
    if (filtered.length > 0) {
      setSelectedParameters(filtered.slice(0, 5));
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const initializePeriods = () => {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);

    setPeriods([
      {
        id: "period1",
        label: "Últimos 3 meses",
        startDate: threeMonthsAgo,
        endDate: now,
        color: "#3B82F6"
      },
      {
        id: "period2",
        label: "3-6 meses atrás",
        startDate: sixMonthsAgo,
        endDate: threeMonthsAgo,
        color: "#10B981"
      },
      {
        id: "period3",
        label: "6-12 meses atrás",
        startDate: twelveMonthsAgo,
        endDate: sixMonthsAgo,
        color: "#F59E0B"
      }
    ]);
  };

  const fetchAvailableParameters = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: examImages } = await supabase
        .from('exam_images')
        .select('id')
        .eq('user_id', user.id);

      if (!examImages || examImages.length === 0) {
        setAvailableParameters([]);
        setLoading(false);
        return;
      }

      const examImageIds = examImages.map(img => img.id);

      const { data, error } = await supabase
        .from('exam_results')
        .select('parameter_name')
        .in('exam_image_id', examImageIds);

      if (error) throw error;

      const uniqueParams = [...new Set(data?.map(r => r.parameter_name) || [])];
      setAvailableParameters(uniqueParams);
      
      if (uniqueParams.length > 0) {
        setSelectedParameters(uniqueParams.slice(0, 3));
      }
    } catch (error) {
      console.error('Error fetching parameters:', error);
      toast.error("Erro ao carregar parâmetros");
    } finally {
      setLoading(false);
    }
  };

  const fetchTimelineData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const timelineResults: ParameterData[] = [];

      for (const param of selectedParameters) {
        const paramData: ParameterData = {
          name: param,
          unit: '',
          values: []
        };

        for (const period of periods) {
          const { data: examImages } = await supabase
            .from('exam_images')
            .select('id, exam_date')
            .eq('user_id', user.id)
            .gte('exam_date', period.startDate.toISOString())
            .lte('exam_date', period.endDate.toISOString());

          if (!examImages || examImages.length === 0) continue;

          const examImageIds = examImages.map(img => img.id);

          const { data, error } = await supabase
            .from('exam_results')
            .select('value, unit, exam_image_id')
            .eq('parameter_name', param)
            .in('exam_image_id', examImageIds)
            .order('exam_image_id', { ascending: false })
            .limit(1);

          if (!error && data && data.length > 0 && examImages.length > 0) {
            const examImage = examImages.find(img => img.id === data[0].exam_image_id);
            paramData.unit = data[0].unit || '';
            paramData.values.push({
              period: period.label,
              value: Number(data[0].value),
              date: examImage?.exam_date || ''
            });
          }
        }

        if (paramData.values.length > 0) {
          timelineResults.push(paramData);
        }
      }

      setTimelineData(timelineResults);
    } catch (error) {
      console.error('Error fetching timeline data:', error);
      toast.error("Erro ao carregar dados da linha do tempo");
    }
  };

  const getTrendIndicator = (values: Array<{ value: number }>) => {
    if (values.length < 2) return <Minus className="w-4 h-4 text-muted-foreground" />;
    
    const latest = values[0].value;
    const oldest = values[values.length - 1].value;
    const change = ((latest - oldest) / oldest) * 100;

    if (Math.abs(change) < 5) {
      return <Minus className="w-4 h-4 text-muted-foreground" />;
    }

    if (change > 0) {
      return (
        <div className="flex items-center gap-1 text-warning">
          <TrendingUp className="w-4 h-4" />
          <span className="text-xs">+{change.toFixed(1)}%</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 text-success">
        <TrendingDown className="w-4 h-4" />
        <span className="text-xs">{change.toFixed(1)}%</span>
      </div>
    );
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px;
              color: #1f2937;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 3px solid #3B82F6;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo { height: 50px; }
            .title { 
              font-size: 28px; 
              font-weight: bold;
              color: #1f2937;
            }
            .subtitle {
              color: #6b7280;
              font-size: 14px;
              margin-top: 5px;
            }
            .parameter-card {
              background: white;
              padding: 15px;
              margin: 15px 0;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .param-name {
              font-weight: bold;
              font-size: 16px;
              color: #1f2937;
            }
            .values-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              margin-top: 15px;
            }
            .value-item {
              padding: 10px;
              background: #f3f4f6;
              border-radius: 6px;
            }
            .value-label {
              font-size: 11px;
              color: #6b7280;
              text-transform: uppercase;
              margin-bottom: 5px;
            }
            .value-number {
              font-size: 20px;
              font-weight: bold;
              color: #1f2937;
            }
            .disclaimer {
              margin-top: 40px;
              padding: 20px;
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              border-radius: 8px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">ZOE MED - Análise Timeline</div>
              <div class="subtitle">Evolução de Parâmetros ao Longo do Tempo</div>
              <div class="subtitle">Gerado em: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</div>
            </div>
            <img src="${zoeMedLogo}" alt="ZOE MED" class="logo" />
          </div>

          ${timelineData.map(param => `
            <div class="parameter-card">
              <div class="param-name">${param.name} ${param.unit ? `(${param.unit})` : ''}</div>
              <div class="values-grid">
                ${param.values.map(v => `
                  <div class="value-item">
                    <div class="value-label">${v.period}</div>
                    <div class="value-number">${v.value}</div>
                    <div class="value-label">${format(new Date(v.date), "dd/MM/yyyy")}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}

          <div class="disclaimer">
            <strong>⚕️ Aviso Médico Importante:</strong>
            <p style="margin: 10px 0 0 0;">Esta análise é baseada em dados fornecidos e não substitui consulta médica profissional. Sempre consulte seu médico antes de tomar decisões sobre tratamento ou medicação.</p>
          </div>

          <div class="footer">
            <p>ZOE MED - Sistema de Gestão de Saúde</p>
            <p>Relatório gerado automaticamente pelo sistema</p>
          </div>
        </body>
        </html>
      `;

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analise-timeline-${format(new Date(), 'yyyy-MM-dd')}.html`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Relatório exportado com sucesso!");
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error("Erro ao exportar relatório");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="sticky top-0 z-50 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate("evolution")}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2.4} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold drop-shadow-md">Linha do Tempo</h1>
            <p className="text-white/90 text-sm drop-shadow">Acompanhe a evolução dos seus parâmetros</p>
          </div>
          <Button 
            onClick={exportToPDF}
            disabled={exporting || timelineData.length === 0}
            variant="secondary"
            size="sm"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* Anotações */}
        <TimelineAnnotation
          annotations={annotations}
          onAdd={handleAddAnnotation}
          onEdit={handleEditAnnotation}
          onDelete={handleDeleteAnnotation}
        />

        {/* Filtros por categoria */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Filtrar por Categoria</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(PARAMETER_CATEGORIES).map(category => (
              <div key={category} className="flex items-center gap-2">
                <Checkbox
                  id={category}
                  checked={selectedCategories.includes(category)}
                  onCheckedChange={() => toggleCategory(category)}
                />
                <label htmlFor={category} className="text-sm capitalize cursor-pointer">
                  {category}
                </label>
              </div>
            ))}
          </div>
        </Card>

        {/* Toggle comparação */}
        <div className="flex gap-2">
          <Button
            variant={showComparison ? "default" : "outline"}
            onClick={() => setShowComparison(!showComparison)}
            className="flex-1"
          >
            {showComparison ? "Gráfico Individual" : "Comparação Multi-Parâmetros"}
          </Button>
        </div>

        {/* Period indicators */}
        <div className="flex flex-wrap gap-2">
          {periods.map(period => (
            <Badge key={period.id} variant="outline" style={{ borderColor: period.color }}>
              <Calendar className="w-3 h-3 mr-1" style={{ color: period.color }} />
              {period.label}
            </Badge>
          ))}
        </div>

        {/* Parameter selector */}
        <Card className="p-4">
          <label className="text-sm font-medium mb-2 block">Selecione os parâmetros (máx. 5)</label>
          <Select
            value={selectedParameters[0] || ""}
            onValueChange={(value) => {
              if (!selectedParameters.includes(value) && selectedParameters.length < 5) {
                setSelectedParameters([...selectedParameters, value]);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Adicionar parâmetro" />
            </SelectTrigger>
            <SelectContent>
              {availableParameters.map(param => (
                <SelectItem key={param} value={param} disabled={selectedParameters.includes(param)}>
                  {param}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2 mt-3">
            {selectedParameters.map(param => (
              <Badge key={param} variant="secondary" className="cursor-pointer" onClick={() => setSelectedParameters(prev => prev.filter(p => p !== param))}>
                {param} ×
              </Badge>
            ))}
          </div>
        </Card>

        {/* Timeline cards or comparison chart */}
        {timelineData.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Selecione parâmetros para visualizar a evolução</p>
          </Card>
        ) : showComparison ? (
          /* Multi-parameter comparison chart */
          <Card className="p-5">
            <h3 className="font-semibold text-lg text-foreground mb-4">Comparação Multi-Parâmetros</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={periods.map(period => {
                const dataPoint: any = { period: period.label };
                timelineData.forEach(param => {
                  const value = param.values.find(v => v.period === period.label);
                  dataPoint[param.name] = value?.value || null;
                });
                return dataPoint;
              })}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                {timelineData.map((param, index) => {
                  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
                  return (
                    <Line 
                      key={param.name}
                      type="monotone" 
                      dataKey={param.name}
                      stroke={colors[index % colors.length]}
                      strokeWidth={2}
                      dot={{ fill: colors[index % colors.length], r: 4 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Dica:</strong> Este gráfico permite visualizar múltiplos parâmetros simultaneamente para identificar correlações entre diferentes métricas de saúde.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {timelineData.map((param, index) => (
              <Card key={index} className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-foreground">{param.name}</h3>
                    {param.unit && <p className="text-xs text-muted-foreground">Unidade: {param.unit}</p>}
                  </div>
                  {getTrendIndicator(param.values)}
                </div>

                {/* Chart */}
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={param.values}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="period" 
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>

                {/* Values grid */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {param.values.map((value, vIndex) => {
                    const period = periods.find(p => p.label === value.period);
                    return (
                      <div key={vIndex} className="p-3 rounded-lg bg-muted/50" style={{ borderLeft: `3px solid ${period?.color}` }}>
                        <div className="text-xs text-muted-foreground mb-1">{value.period}</div>
                        <div className="text-lg font-bold text-foreground">{value.value}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(value.date), "dd/MM/yyyy")}</div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}

        <Card className="bg-info/10 border-info/30 p-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            ⚕️ <strong>Importante:</strong> Esta análise é baseada em dados fornecidos e não substitui consulta médica profissional. 
            Sempre consulte seu médico antes de tomar decisões sobre tratamento ou medicação.
          </p>
        </Card>
      </div>
    </div>
  );
};
