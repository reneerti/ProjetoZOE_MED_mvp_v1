import { ArrowLeft, Upload, Camera, Sparkles, TrendingDown, TrendingUp, Scale, Droplets, GitCompare, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from "recharts";
import { ChartContainer, ChartTooltipContent, ChartTooltip } from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals";

interface BioimpedanceModuleProps {
  onNavigate: (view: View) => void;
}

export const BioimpedanceModule = ({ onNavigate }: BioimpedanceModuleProps) => {
  const { user } = useAuth();
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState<any>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMeasurements();
    }
  }, [user]);

  const fetchMeasurements = async () => {
    try {
      const { data, error } = await supabase
        .from('bioimpedance_measurements')
        .select('*')
        .eq('user_id', user?.id)
        .order('measurement_date', { ascending: false });

      if (error) throw error;
      setMeasurements(data || []);
    } catch (error) {
      console.error("Error fetching measurements:", error);
      toast.error("Erro ao carregar medições");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('bioimpedance-scans')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('bioimpedance-scans')
        .getPublicUrl(filePath);

      toast.success("Arquivo enviado! Processando com IA...");
      
      const { data: processResult, error: processError } = await supabase.functions.invoke('process-bioimpedance', {
        body: { imageUrl: publicUrl }
      });

      if (processError) {
        console.error("Process error:", processError);
        if (processError.message?.includes('peso') || processError.message?.includes('Weight')) {
          toast.error("Não foi possível ler os dados da imagem. Certifique-se de que a imagem está nítida e mostra claramente o peso e outros valores de bioimpedância.");
        } else {
          toast.error("Erro ao processar arquivo. Tente novamente.");
        }
        return;
      }

      if (processResult?.error) {
        console.error("Process result error:", processResult.error);
        toast.error(processResult.error);
        return;
      }

      toast.success("Medição processada com sucesso!");
      
      if (processResult?.analysis) {
        setLatestAnalysis(processResult.analysis);
      }
      
      await fetchMeasurements();
      
    } catch (error) {
      console.error("Error uploading:", error);
      toast.error("Erro ao processar arquivo");
    } finally {
      setUploading(false);
    }
  };

  const handleLoadSampleData = async () => {
    if (!user) return;
    
    const confirmLoad = window.confirm(
      "Deseja adicionar dados de exemplo de uma jornada de 11 semanas?\n\n" +
      "Isso irá adicionar 8 medições simulando uma evolução real.\n\n" +
      "Continuar?"
    );
    
    if (!confirmLoad) return;

    setLoading(true);
    try {
      toast.loading("Carregando dados de exemplo...");
      
      const { data, error } = await supabase.functions.invoke('seed-bioimpedance-data');

      if (error) {
        console.error("Seed error:", error);
        toast.error("Erro ao carregar dados de exemplo");
        return;
      }

      toast.success("Dados de exemplo carregados com sucesso!");
      await fetchMeasurements();
      
    } catch (error) {
      console.error("Error loading sample data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const latestMeasurement = measurements[0];
  const firstMeasurement = measurements[measurements.length - 1];

  const renderMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
  };

  const calculateTotalChange = (metric: 'weight' | 'body_fat_percentage' | 'muscle_mass' | 'water_percentage') => {
    if (!latestMeasurement || !firstMeasurement) return null;
    const latest = Number(latestMeasurement[metric]) || 0;
    const first = Number(firstMeasurement[metric]) || 0;
    return (latest - first).toFixed(1);
  };

  const chartData = measurements
    .slice()
    .reverse()
    .map((m, index) => ({
      semana: `S${index + 1}`,
      date: new Date(m.measurement_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      peso: m.weight ? Number(m.weight) : null,
      gordura: m.body_fat_percentage ? Number(m.body_fat_percentage) : null,
      musculo: m.muscle_mass ? Number(m.muscle_mass) : null,
      agua: m.water_percentage ? Number(m.water_percentage) : null,
    }));

  const getAdditionalData = (measurement: any) => {
    if (!measurement.notes) return null;
    try {
      return JSON.parse(measurement.notes);
    } catch {
      return null;
    }
  };

  const toggleCompareSelection = (id: string) => {
    setSelectedForCompare(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      } else {
        if (prev.length >= 3) {
          toast.error("Máximo de 3 medições para comparação");
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  const getComparisonData = () => {
    if (selectedForCompare.length < 2) return null;
    
    const selected = measurements
      .filter(m => selectedForCompare.includes(m.id))
      .sort((a, b) => new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime());

    return selected.map(m => ({
      id: m.id,
      date: new Date(m.measurement_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      fullDate: new Date(m.measurement_date).toLocaleDateString('pt-BR'),
      weight: Number(m.weight),
      bodyFat: m.body_fat_percentage ? Number(m.body_fat_percentage) : null,
      muscle: m.muscle_mass ? Number(m.muscle_mass) : null,
      water: m.water_percentage ? Number(m.water_percentage) : null,
    }));
  };

  const calculateDifference = (val1: number, val2: number) => {
    return (val2 - val1).toFixed(1);
  };

  const comparisonData = getComparisonData();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground p-6 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate("dashboard")}
            className="text-primary-foreground hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">📊 Bioimpedância - Análise Completa</h1>
            <p className="text-sm opacity-90">Evolução detalhada com gráficos de progressão</p>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Nova Medição</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="cursor-pointer">
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <div className="w-full h-auto py-4 flex flex-col items-center gap-2 bg-primary hover:bg-primary/90 rounded-lg cursor-pointer transition-colors">
                <Camera className="w-6 h-6 text-primary-foreground" />
                <span className="text-sm text-primary-foreground">Tirar Foto</span>
              </div>
            </label>
            <label className="cursor-pointer">
              <input 
                type="file" 
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <div className="w-full h-auto py-4 flex flex-col items-center gap-2 bg-secondary hover:bg-secondary/90 rounded-lg cursor-pointer transition-colors">
                <Upload className="w-6 h-6 text-accent" />
                <span className="text-sm text-secondary-foreground">{uploading ? "Enviando..." : "Upload de Arquivo"}</span>
              </div>
            </label>
          </div>
        </Card>
        
        {measurements.length === 0 && (
          <Card className="bg-muted/50 border-dashed border-2 p-4 mt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                <strong>💡 Dica:</strong> Quer ver como funciona? Carregue dados de exemplo!
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadSampleData}
                disabled={loading}
                className="shrink-0"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Dados de Exemplo
              </Button>
            </div>
          </Card>
        )}
      </div>

      {measurements.length >= 2 && (
        <div className="px-6 mb-6">
          <Card className="bg-success-light border-success p-4">
            <p className="text-sm text-success-foreground leading-relaxed">
              <strong>🎯 RESUMO EXECUTIVO:</strong> {measurements.length} semanas de evolução registradas. 
              {calculateTotalChange('weight') && (
                <> Perda total de <strong>{Math.abs(Number(calculateTotalChange('weight')))} kg</strong></>
              )}
              {calculateTotalChange('body_fat_percentage') && (
                <>, <strong>{Math.abs(Number(calculateTotalChange('body_fat_percentage')))}%</strong> de redução na gordura corporal</>
              )}
              .
            </p>
          </Card>
        </div>
      )}

      {latestMeasurement && firstMeasurement && measurements.length >= 2 && (
        <div className="px-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground p-4">
              <div className="flex items-center gap-2 mb-2">
                <Scale className="w-4 h-4" />
                <div className="text-xs uppercase opacity-90">Peso Total</div>
              </div>
              <div className="text-2xl font-bold">
                {calculateTotalChange('weight')} kg
              </div>
              <div className="text-xs mt-1 bg-white/20 rounded px-2 py-1 inline-block">
                {Number(firstMeasurement.weight).toFixed(1)} → {Number(latestMeasurement.weight).toFixed(1)} kg
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-destructive to-destructive/80 text-destructive-foreground p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4" />
                <div className="text-xs uppercase opacity-90">Gordura Corporal</div>
              </div>
              <div className="text-2xl font-bold">
                {calculateTotalChange('body_fat_percentage')}%
              </div>
              <div className="text-xs mt-1 bg-white/20 rounded px-2 py-1 inline-block">
                {Number(firstMeasurement.body_fat_percentage).toFixed(1)}% → {Number(latestMeasurement.body_fat_percentage).toFixed(1)}%
              </div>
            </Card>

            {latestMeasurement.muscle_mass && firstMeasurement.muscle_mass && (
              <Card className="bg-gradient-to-br from-success to-success/80 text-success-foreground p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <div className="text-xs uppercase opacity-90">Massa Muscular</div>
                </div>
                <div className="text-2xl font-bold">
                  {calculateTotalChange('muscle_mass')} kg
                </div>
                <div className="text-xs mt-1 bg-white/20 rounded px-2 py-1 inline-block">
                  {Number(firstMeasurement.muscle_mass).toFixed(1)} → {Number(latestMeasurement.muscle_mass).toFixed(1)} kg
                </div>
              </Card>
            )}

            {latestMeasurement.water_percentage && firstMeasurement.water_percentage && (
              <Card className="bg-gradient-to-br from-accent to-accent/80 text-accent-foreground p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="w-4 h-4" />
                  <div className="text-xs uppercase opacity-90">Hidratação</div>
                </div>
                <div className="text-2xl font-bold">
                  {calculateTotalChange('water_percentage')}%
                </div>
                <div className="text-xs mt-1 bg-white/20 rounded px-2 py-1 inline-block">
                  {Number(firstMeasurement.water_percentage).toFixed(1)}% → {Number(latestMeasurement.water_percentage).toFixed(1)}%
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {chartData.length > 1 && (
        <div className="px-6 mb-6">
          <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b-2 border-primary">
            📈 Gráficos de Evolução
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="text-sm font-bold text-center text-foreground mb-4">Evolução do Peso (kg)</h3>
              <ChartContainer config={{
                peso: { label: "Peso", color: "hsl(var(--primary))" }
              }} className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="pesoGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="semana" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <YAxis 
                      domain={['dataMin - 2', 'dataMax + 2']}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area 
                      type="monotone" 
                      dataKey="peso" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      fill="url(#pesoGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-bold text-center text-foreground mb-4">Gordura Corporal (%)</h3>
              <ChartContainer config={{
                gordura: { label: "Gordura", color: "hsl(var(--destructive))" }
              }} className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gorduraGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="semana" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <YAxis 
                      domain={['dataMin - 2', 'dataMax + 2']}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area 
                      type="monotone" 
                      dataKey="gordura" 
                      stroke="hsl(var(--destructive))" 
                      strokeWidth={3}
                      fill="url(#gorduraGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </Card>

            {chartData.some(d => d.musculo) && (
              <Card className="p-4">
                <h3 className="text-sm font-bold text-center text-foreground mb-4">Massa Muscular (kg)</h3>
                <ChartContainer config={{
                  musculo: { label: "Músculo", color: "hsl(var(--success))" }
                }} className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="musculoGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="semana" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <YAxis 
                        domain={['dataMin - 2', 'dataMax + 2']}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area 
                        type="monotone" 
                        dataKey="musculo" 
                        stroke="hsl(var(--success))" 
                        strokeWidth={3}
                        fill="url(#musculoGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </Card>
            )}

            {chartData.some(d => d.agua) && (
              <Card className="p-4">
                <h3 className="text-sm font-bold text-center text-foreground mb-4">Água Corporal (%)</h3>
                <ChartContainer config={{
                  agua: { label: "Água", color: "hsl(var(--accent))" }
                }} className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="aguaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="semana" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <YAxis 
                        domain={['dataMin - 2', 'dataMax + 2']}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area 
                        type="monotone" 
                        dataKey="agua" 
                        stroke="hsl(var(--accent))" 
                        strokeWidth={3}
                        fill="url(#aguaGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </Card>
            )}
          </div>
        </div>
      )}

      {measurements.length > 0 && (
        <div className="px-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground pb-2 border-b-2 border-primary">
              📋 Evolução Detalhada
            </h2>
            {selectedForCompare.length >= 2 && (
              <Button
                onClick={() => setShowComparison(true)}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                size="sm"
              >
                <GitCompare className="w-4 h-4 mr-2" />
                Comparar ({selectedForCompare.length})
              </Button>
            )}
          </div>
          
          <Card className="p-4 overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="p-2 text-center font-semibold w-12">
                    <GitCompare className="w-4 h-4 mx-auto" />
                  </th>
                  <th className="p-2 text-left font-semibold">Data</th>
                  <th className="p-2 text-center font-semibold">Peso (kg)</th>
                  <th className="p-2 text-center font-semibold">Gordura (%)</th>
                  <th className="p-2 text-center font-semibold">Músculo (kg)</th>
                  <th className="p-2 text-center font-semibold">Água (%)</th>
                  <th className="p-2 text-left font-semibold">Observações</th>
                </tr>
              </thead>
              <tbody>
                {measurements.slice().reverse().map((m, idx) => {
                  const additionalData = getAdditionalData(m);
                  const prevM = idx > 0 ? measurements[measurements.length - idx] : null;
                  
                  return (
                    <tr key={m.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-2 text-center">
                        <Checkbox
                          checked={selectedForCompare.includes(m.id)}
                          onCheckedChange={() => toggleCompareSelection(m.id)}
                        />
                      </td>
                      <td className="p-2 font-medium bg-muted/30">
                        {new Date(m.measurement_date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-2 text-center">
                        {Number(m.weight).toFixed(1)}
                        {prevM && (
                          <span className={`ml-1 text-xs ${Number(m.weight) < Number(prevM.weight) ? 'text-success' : 'text-destructive'}`}>
                            {Number(m.weight) < Number(prevM.weight) ? '↓' : '↑'}
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        {m.body_fat_percentage ? Number(m.body_fat_percentage).toFixed(1) : '-'}%
                        {prevM && prevM.body_fat_percentage && (
                          <span className={`ml-1 text-xs ${Number(m.body_fat_percentage) < Number(prevM.body_fat_percentage) ? 'text-success' : 'text-destructive'}`}>
                            {Number(m.body_fat_percentage) < Number(prevM.body_fat_percentage) ? '↓' : '↑'}
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        {m.muscle_mass ? Number(m.muscle_mass).toFixed(1) : '-'}
                        {prevM && prevM.muscle_mass && (
                          <span className={`ml-1 text-xs ${Number(m.muscle_mass) > Number(prevM.muscle_mass) ? 'text-success' : 'text-destructive'}`}>
                            {Number(m.muscle_mass) > Number(prevM.muscle_mass) ? '↑' : '↓'}
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        {m.water_percentage ? Number(m.water_percentage).toFixed(1) : '-'}%
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {additionalData && Object.keys(additionalData).length > 0 && (
                          <div className="space-y-1">
                            {additionalData.bmi && <div>IMC: {additionalData.bmi}</div>}
                            {additionalData.visceral_fat && <div>Visceral: {additionalData.visceral_fat}</div>}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Modal de Comparação */}
      {showComparison && comparisonData && comparisonData.length >= 2 && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold">Comparação de Medições</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowComparison(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              {/* Cards de Comparação */}
              <div className="grid md:grid-cols-3 gap-4">
                {comparisonData.map((data, idx) => (
                  <Card key={data.id} className="p-4 bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-2">Medição {idx + 1}</div>
                    <div className="text-sm font-bold mb-3">{data.fullDate}</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Peso:</span>
                        <span className="font-semibold">{data.weight.toFixed(1)} kg</span>
                      </div>
                      {data.bodyFat && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Gordura:</span>
                          <span className="font-semibold">{data.bodyFat.toFixed(1)}%</span>
                        </div>
                      )}
                      {data.muscle && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Músculo:</span>
                          <span className="font-semibold">{data.muscle.toFixed(1)} kg</span>
                        </div>
                      )}
                      {data.water && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Água:</span>
                          <span className="font-semibold">{data.water.toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Diferenças entre primeira e última medição */}
              {comparisonData.length >= 2 && (
                <Card className="p-4 bg-accent-light border-accent">
                  <h4 className="font-semibold text-sm mb-3 text-accent-foreground">
                    📊 Evolução: {comparisonData[0].fullDate} → {comparisonData[comparisonData.length - 1].fullDate}
                  </h4>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center justify-between p-2 bg-card rounded">
                      <span className="text-muted-foreground">Peso:</span>
                      <span className={`font-bold ${Number(calculateDifference(comparisonData[0].weight, comparisonData[comparisonData.length - 1].weight)) < 0 ? 'text-success' : 'text-destructive'}`}>
                        {Number(calculateDifference(comparisonData[0].weight, comparisonData[comparisonData.length - 1].weight)) < 0 ? '↓' : '↑'} 
                        {Math.abs(Number(calculateDifference(comparisonData[0].weight, comparisonData[comparisonData.length - 1].weight)))} kg
                      </span>
                    </div>
                    {comparisonData[0].bodyFat && comparisonData[comparisonData.length - 1].bodyFat && (
                      <div className="flex items-center justify-between p-2 bg-card rounded">
                        <span className="text-muted-foreground">Gordura:</span>
                        <span className={`font-bold ${Number(calculateDifference(comparisonData[0].bodyFat, comparisonData[comparisonData.length - 1].bodyFat)) < 0 ? 'text-success' : 'text-destructive'}`}>
                          {Number(calculateDifference(comparisonData[0].bodyFat, comparisonData[comparisonData.length - 1].bodyFat)) < 0 ? '↓' : '↑'} 
                          {Math.abs(Number(calculateDifference(comparisonData[0].bodyFat, comparisonData[comparisonData.length - 1].bodyFat)))}%
                        </span>
                      </div>
                    )}
                    {comparisonData[0].muscle && comparisonData[comparisonData.length - 1].muscle && (
                      <div className="flex items-center justify-between p-2 bg-card rounded">
                        <span className="text-muted-foreground">Músculo:</span>
                        <span className={`font-bold ${Number(calculateDifference(comparisonData[0].muscle, comparisonData[comparisonData.length - 1].muscle)) > 0 ? 'text-success' : 'text-destructive'}`}>
                          {Number(calculateDifference(comparisonData[0].muscle, comparisonData[comparisonData.length - 1].muscle)) > 0 ? '↑' : '↓'} 
                          {Math.abs(Number(calculateDifference(comparisonData[0].muscle, comparisonData[comparisonData.length - 1].muscle)))} kg
                        </span>
                      </div>
                    )}
                    {comparisonData[0].water && comparisonData[comparisonData.length - 1].water && (
                      <div className="flex items-center justify-between p-2 bg-card rounded">
                        <span className="text-muted-foreground">Água:</span>
                        <span className={`font-bold ${Number(calculateDifference(comparisonData[0].water, comparisonData[comparisonData.length - 1].water)) > 0 ? 'text-success' : 'text-destructive'}`}>
                          {Number(calculateDifference(comparisonData[0].water, comparisonData[comparisonData.length - 1].water)) > 0 ? '↑' : '↓'} 
                          {Math.abs(Number(calculateDifference(comparisonData[0].water, comparisonData[comparisonData.length - 1].water)))}%
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Gráfico de Comparação */}
              <Card className="p-4">
                <h4 className="text-sm font-bold text-center text-foreground mb-4">Comparação Visual</h4>
                <ChartContainer config={{
                  weight: { label: "Peso", color: "hsl(var(--primary))" },
                  bodyFat: { label: "Gordura", color: "hsl(var(--destructive))" },
                  muscle: { label: "Músculo", color: "hsl(var(--success))" }
                }} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <YAxis 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar 
                        dataKey="weight" 
                        fill="hsl(var(--primary))" 
                        name="Peso (kg)"
                        radius={[4, 4, 0, 0]}
                      />
                      {comparisonData[0].bodyFat && (
                        <Bar 
                          dataKey="bodyFat" 
                          fill="hsl(var(--destructive))" 
                          name="Gordura (%)"
                          radius={[4, 4, 0, 0]}
                        />
                      )}
                      {comparisonData[0].muscle && (
                        <Bar 
                          dataKey="muscle" 
                          fill="hsl(var(--success))" 
                          name="Músculo (kg)"
                          radius={[4, 4, 0, 0]}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </Card>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedForCompare([]);
                    setShowComparison(false);
                  }}
                >
                  Limpar Seleção
                </Button>
                <Button
                  onClick={() => setShowComparison(false)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {latestAnalysis && (
        <div className="px-6 mb-6">
          <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b-2 border-primary">
            🤖 Insights da IA
          </h2>
          
          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-accent-foreground">Análise Completa da Última Medição</h3>
            </div>
            
            {latestAnalysis.summary && (
              <div className="mb-6 p-4 bg-card rounded-lg border text-sm text-card-foreground leading-relaxed" 
                   dangerouslySetInnerHTML={{ __html: renderMarkdown(latestAnalysis.summary) }} />
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {latestAnalysis.critical_points?.length > 0 && (
                <Card className="p-4 bg-destructive/5 border-destructive/20">
                  <h4 className="font-semibold text-sm mb-3 text-destructive flex items-center gap-2">
                    ⚠️ Pontos de Atenção
                  </h4>
                  <ul className="space-y-2">
                    {latestAnalysis.critical_points.map((point: string, idx: number) => (
                      <li key={idx} className="text-sm text-card-foreground pl-2 border-l-2 border-destructive/40" 
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(point) }} />
                    ))}
                  </ul>
                </Card>
              )}

              {latestAnalysis.positive_points?.length > 0 && (
                <Card className="p-4 bg-success/5 border-success/20">
                  <h4 className="font-semibold text-sm mb-3 text-success flex items-center gap-2">
                    ✅ Pontos Positivos
                  </h4>
                  <ul className="space-y-2">
                    {latestAnalysis.positive_points.map((point: string, idx: number) => (
                      <li key={idx} className="text-sm text-card-foreground pl-2 border-l-2 border-success/40" 
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(point) }} />
                    ))}
                  </ul>
                </Card>
              )}
            </div>

            {latestAnalysis.health_insights && (
              <Card className="p-4 mt-4 bg-primary/5 border-primary/20">
                <h4 className="font-semibold text-sm mb-3 text-primary flex items-center gap-2">
                  🏥 Análise de Saúde Detalhada
                </h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  {latestAnalysis.health_insights.body_composition && (
                    <div>
                      <strong className="text-primary">Composição Corporal:</strong>
                      <p className="text-muted-foreground mt-1">{latestAnalysis.health_insights.body_composition}</p>
                    </div>
                  )}
                  {latestAnalysis.health_insights.hydration_status && (
                    <div>
                      <strong className="text-primary">Hidratação:</strong>
                      <p className="text-muted-foreground mt-1">{latestAnalysis.health_insights.hydration_status}</p>
                    </div>
                  )}
                  {latestAnalysis.health_insights.metabolic_health && (
                    <div>
                      <strong className="text-primary">Saúde Metabólica:</strong>
                      <p className="text-muted-foreground mt-1">{latestAnalysis.health_insights.metabolic_health}</p>
                    </div>
                  )}
                  {latestAnalysis.health_insights.risk_factors && (
                    <div>
                      <strong className="text-destructive">Fatores de Risco:</strong>
                      <p className="text-muted-foreground mt-1">{latestAnalysis.health_insights.risk_factors}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {latestAnalysis.recommendations?.length > 0 && (
              <Card className="p-4 mt-4 bg-accent/5 border-accent/20">
                <h4 className="font-semibold text-sm mb-3 text-accent-foreground flex items-center gap-2">
                  💡 Recomendações Personalizadas
                </h4>
                <ul className="space-y-2">
                  {latestAnalysis.recommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="text-sm text-card-foreground p-2 bg-card rounded" 
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(rec) }} />
                  ))}
                </ul>
              </Card>
            )}
          </Card>
        </div>
      )}

      {measurements.length === 0 && (
        <div className="px-6 py-12 text-center">
          <div className="text-muted-foreground mb-4">
            <Scale className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Nenhuma medição registrada ainda.</p>
            <p className="text-sm mt-2">Faça upload de uma foto do seu exame para começar!</p>
          </div>
        </div>
      )}
    </div>
  );
};