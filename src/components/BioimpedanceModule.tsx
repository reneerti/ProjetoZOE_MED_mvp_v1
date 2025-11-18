import { ArrowLeft, Upload, Camera, Sparkles, TrendingDown, TrendingUp, Scale, Droplets } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltipContent, ChartTooltip } from "@/components/ui/chart";

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
          <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b-2 border-primary">
            📋 Evolução Detalhada
          </h2>
          
          <Card className="p-4 overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="bg-muted">
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

      {latestAnalysis && (
        <div className="px-6 mb-6">
          <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b-2 border-primary">
            🤖 Insights da IA
          </h2>
          
          <Card className="bg-accent-light border-accent p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-accent-foreground">Análise da Última Medição</h3>
            </div>
            
            {latestAnalysis.summary && (
              <div className="mb-4 text-sm text-card-foreground" 
                   dangerouslySetInnerHTML={{ __html: renderMarkdown(latestAnalysis.summary) }} />
            )}

            {latestAnalysis.critical_points?.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-sm mb-2 text-card-foreground">⚠️ Pontos de Atenção:</h4>
                <ul className="space-y-1">
                  {latestAnalysis.critical_points.map((point: string, idx: number) => (
                    <li key={idx} className="text-sm text-card-foreground" 
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(`• ${point}`) }} />
                  ))}
                </ul>
              </div>
            )}

            {latestAnalysis.positive_points?.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-sm mb-2 text-card-foreground">✅ Pontos Positivos:</h4>
                <ul className="space-y-1">
                  {latestAnalysis.positive_points.map((point: string, idx: number) => (
                    <li key={idx} className="text-sm text-card-foreground" 
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(`• ${point}`) }} />
                  ))}
                </ul>
              </div>
            )}

            {latestAnalysis.recommendations?.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 text-card-foreground">💡 Recomendações:</h4>
                <ul className="space-y-1">
                  {latestAnalysis.recommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="text-sm text-card-foreground" 
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(`• ${rec}`) }} />
                  ))}
                </ul>
              </div>
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