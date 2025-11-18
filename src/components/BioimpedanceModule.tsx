import { ArrowLeft, Upload, Camera, Sparkles, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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
      // Upload para storage
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
      
      // Process with AI
      const { data: processResult, error: processError } = await supabase.functions.invoke('process-bioimpedance', {
        body: { imageUrl: publicUrl }
      });

      if (processError) {
        console.error("Process error:", processError);
        
        // Mensagem específica se for erro de dados não encontrados
        if (processError.message?.includes('peso') || processError.message?.includes('Weight')) {
          toast.error("Não foi possível ler os dados da imagem. Certifique-se de que a imagem está nítida e mostra claramente o peso e outros valores de bioimpedância.");
        } else {
          toast.error("Erro ao processar arquivo. Tente novamente.");
        }
        return;
      }

      // Verificar se houve erro na resposta
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
  const previousMeasurement = measurements[1];

  const renderMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
  };

  const calculateChange = (current: number | null, previous: number | null) => {
    if (!current || !previous) return null;
    return (current - previous).toFixed(1);
  };

  const calculateBMI = (weight: number) => {
    const heightInMeters = 1.75; // Altura padrão, pode ser ajustada
    return (weight / (heightInMeters * heightInMeters)).toFixed(1);
  };

  // Preparar dados para o gráfico de evolução
  const chartData = measurements
    .slice()
    .reverse()
    .map((m) => ({
      date: new Date(m.measurement_date).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' }),
      peso: m.weight ? Number(m.weight) : null,
      gordura: m.body_fat_percentage ? Number(m.body_fat_percentage) : null,
      musculo: m.muscle_mass ? Number(m.muscle_mass) : null,
      agua: m.water_percentage ? Number(m.water_percentage) : null,
    }));

  // Calcular estatísticas de tendência
  const calculateStats = () => {
    if (measurements.length < 2) return null;

    const weights = measurements.map(m => m.weight ? Number(m.weight) : 0).filter(v => v > 0);
    const fats = measurements.map(m => m.body_fat_percentage ? Number(m.body_fat_percentage) : 0).filter(v => v > 0);
    const muscles = measurements.map(m => m.muscle_mass ? Number(m.muscle_mass) : 0).filter(v => v > 0);
    const waters = measurements.map(m => m.water_percentage ? Number(m.water_percentage) : 0).filter(v => v > 0);

    const avg = (arr: number[]) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : '-';
    const min = (arr: number[]) => arr.length > 0 ? Math.min(...arr).toFixed(1) : '-';
    const max = (arr: number[]) => arr.length > 0 ? Math.max(...arr).toFixed(1) : '-';
    const variation = (arr: number[]) => arr.length > 1 ? (arr[arr.length - 1] - arr[0]).toFixed(1) : '-';

    return {
      weight: { avg: avg(weights), best: min(weights), variation: variation(weights) },
      fat: { avg: avg(fats), best: min(fats), variation: variation(fats) },
      muscle: { avg: avg(muscles), best: max(muscles), variation: variation(muscles) },
      water: { avg: avg(waters), best: max(waters), variation: variation(waters) },
    };
  };

  const stats = calculateStats();

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-header text-white p-6 rounded-b-3xl mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={() => onNavigate("dashboard")}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Bioimpedância</h1>
            <p className="text-white/90 text-sm">Composição corporal</p>
          </div>
        </div>
      </div>

      {/* Upload Buttons */}
      <div className="px-6 mb-6">
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
              <Camera className="w-6 h-6 text-warning" />
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
      </div>

      {/* Métricas Principais */}
      {latestMeasurement && previousMeasurement && (
        <div className="px-6 mb-6 space-y-4">
          {/* Cards de Métricas */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-4">
              <div className="text-xs uppercase opacity-90 mb-2">Peso</div>
              <div className="text-2xl font-bold mb-1">
                {latestMeasurement.weight ? Number(latestMeasurement.weight).toFixed(1) : '-'} kg
              </div>
              {previousMeasurement.weight && (
                <div className="text-xs bg-white/20 rounded px-2 py-1 inline-block">
                  {Number(calculateChange(Number(latestMeasurement.weight), Number(previousMeasurement.weight))) < 0 ? '↓' : '↑'} 
                  {' '}{Math.abs(Number(calculateChange(Number(latestMeasurement.weight), Number(previousMeasurement.weight))))} kg
                </div>
              )}
            </Card>

            <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-4">
              <div className="text-xs uppercase opacity-90 mb-2">IMC</div>
              <div className="text-2xl font-bold mb-1">
                {latestMeasurement.weight ? calculateBMI(Number(latestMeasurement.weight)) : '-'}
              </div>
              {previousMeasurement.weight && (
                <div className="text-xs bg-white/20 rounded px-2 py-1 inline-block">
                  {Number(calculateBMI(Number(latestMeasurement.weight))) < Number(calculateBMI(Number(previousMeasurement.weight))) ? '↓' : '↑'} 
                  {' '}{Math.abs(Number(calculateBMI(Number(latestMeasurement.weight))) - Number(calculateBMI(Number(previousMeasurement.weight)))).toFixed(1)}
                </div>
              )}
            </Card>

            <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-4">
              <div className="text-xs uppercase opacity-90 mb-2">Gordura</div>
              <div className="text-2xl font-bold mb-1">
                {latestMeasurement.body_fat_percentage ? Number(latestMeasurement.body_fat_percentage).toFixed(1) : '-'}%
              </div>
              {previousMeasurement.body_fat_percentage && (
                <div className="text-xs bg-white/20 rounded px-2 py-1 inline-block">
                  {Number(calculateChange(Number(latestMeasurement.body_fat_percentage), Number(previousMeasurement.body_fat_percentage))) < 0 ? '↓' : '↑'} 
                  {' '}{Math.abs(Number(calculateChange(Number(latestMeasurement.body_fat_percentage), Number(previousMeasurement.body_fat_percentage))))}%
                </div>
              )}
            </Card>

            <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-4">
              <div className="text-xs uppercase opacity-90 mb-2">Massa Muscular</div>
              <div className="text-2xl font-bold mb-1">
                {latestMeasurement.muscle_mass ? Number(latestMeasurement.muscle_mass).toFixed(1) : '-'} kg
              </div>
              {previousMeasurement.muscle_mass && (
                <div className="text-xs bg-white/20 rounded px-2 py-1 inline-block">
                  {Number(calculateChange(Number(latestMeasurement.muscle_mass), Number(previousMeasurement.muscle_mass))) > 0 ? '↑' : '↓'} 
                  {' '}{Math.abs(Number(calculateChange(Number(latestMeasurement.muscle_mass), Number(previousMeasurement.muscle_mass))))} kg
                </div>
              )}
            </Card>

            <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-4">
              <div className="text-xs uppercase opacity-90 mb-2">Água</div>
              <div className="text-2xl font-bold mb-1">
                {latestMeasurement.water_percentage ? Number(latestMeasurement.water_percentage).toFixed(1) : '-'}%
              </div>
              {previousMeasurement.water_percentage && (
                <div className="text-xs bg-white/20 rounded px-2 py-1 inline-block">
                  {Number(calculateChange(Number(latestMeasurement.water_percentage), Number(previousMeasurement.water_percentage))) > 0 ? '↑' : '↓'} 
                  {' '}{Math.abs(Number(calculateChange(Number(latestMeasurement.water_percentage), Number(previousMeasurement.water_percentage))))}%
                </div>
              )}
            </Card>
          </div>

          {/* Tabela Comparativa */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              📊 Comparação de Semanas
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Parâmetro</th>
                    <th className="text-center py-3 px-2">Anterior</th>
                    <th className="text-center py-3 px-2">Atual</th>
                    <th className="text-center py-3 px-2">Variação</th>
                    <th className="text-center py-3 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2 font-medium">⚖️ Peso</td>
                    <td className="text-center py-3 px-2">{previousMeasurement.weight ? Number(previousMeasurement.weight).toFixed(1) : '-'} kg</td>
                    <td className="text-center py-3 px-2">{latestMeasurement.weight ? Number(latestMeasurement.weight).toFixed(1) : '-'} kg</td>
                    <td className={`text-center py-3 px-2 font-semibold ${
                      Number(calculateChange(Number(latestMeasurement.weight), Number(previousMeasurement.weight))) < 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {calculateChange(Number(latestMeasurement.weight), Number(previousMeasurement.weight))} kg
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        Number(calculateChange(Number(latestMeasurement.weight), Number(previousMeasurement.weight))) < -0.5
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {Number(calculateChange(Number(latestMeasurement.weight), Number(previousMeasurement.weight))) < -0.5 ? '✓ Excelente' : '→ Estável'}
                      </span>
                    </td>
                  </tr>

                  <tr className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2 font-medium">📏 IMC</td>
                    <td className="text-center py-3 px-2">{previousMeasurement.weight ? calculateBMI(Number(previousMeasurement.weight)) : '-'}</td>
                    <td className="text-center py-3 px-2">{latestMeasurement.weight ? calculateBMI(Number(latestMeasurement.weight)) : '-'}</td>
                    <td className={`text-center py-3 px-2 font-semibold ${
                      (Number(calculateBMI(Number(latestMeasurement.weight))) - Number(calculateBMI(Number(previousMeasurement.weight)))) < 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {(Number(calculateBMI(Number(latestMeasurement.weight))) - Number(calculateBMI(Number(previousMeasurement.weight)))).toFixed(1)}
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 font-semibold">
                        ✓ Bom
                      </span>
                    </td>
                  </tr>

                  <tr className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2 font-medium">🍖 Gordura (%)</td>
                    <td className="text-center py-3 px-2">{previousMeasurement.body_fat_percentage ? Number(previousMeasurement.body_fat_percentage).toFixed(1) : '-'}%</td>
                    <td className="text-center py-3 px-2">{latestMeasurement.body_fat_percentage ? Number(latestMeasurement.body_fat_percentage).toFixed(1) : '-'}%</td>
                    <td className={`text-center py-3 px-2 font-semibold ${
                      Number(calculateChange(Number(latestMeasurement.body_fat_percentage), Number(previousMeasurement.body_fat_percentage))) < 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {calculateChange(Number(latestMeasurement.body_fat_percentage), Number(previousMeasurement.body_fat_percentage))}%
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        Number(calculateChange(Number(latestMeasurement.body_fat_percentage), Number(previousMeasurement.body_fat_percentage))) < -1
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {Number(calculateChange(Number(latestMeasurement.body_fat_percentage), Number(previousMeasurement.body_fat_percentage))) < -1 ? '✓ Excelente' : '→ Bom'}
                      </span>
                    </td>
                  </tr>

                  <tr className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2 font-medium">💪 Massa Muscular</td>
                    <td className="text-center py-3 px-2">{previousMeasurement.muscle_mass ? Number(previousMeasurement.muscle_mass).toFixed(1) : '-'} kg</td>
                    <td className="text-center py-3 px-2">{latestMeasurement.muscle_mass ? Number(latestMeasurement.muscle_mass).toFixed(1) : '-'} kg</td>
                    <td className={`text-center py-3 px-2 font-semibold ${
                      Number(calculateChange(Number(latestMeasurement.muscle_mass), Number(previousMeasurement.muscle_mass))) > 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {Number(calculateChange(Number(latestMeasurement.muscle_mass), Number(previousMeasurement.muscle_mass))) > 0 ? '+' : ''}
                      {calculateChange(Number(latestMeasurement.muscle_mass), Number(previousMeasurement.muscle_mass))} kg
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        Number(calculateChange(Number(latestMeasurement.muscle_mass), Number(previousMeasurement.muscle_mass))) > 0.3
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {Number(calculateChange(Number(latestMeasurement.muscle_mass), Number(previousMeasurement.muscle_mass))) > 0.3 ? '✓ Ganho!' : '→ Estável'}
                      </span>
                    </td>
                  </tr>

                  <tr className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2 font-medium">💧 Água (%)</td>
                    <td className="text-center py-3 px-2">{previousMeasurement.water_percentage ? Number(previousMeasurement.water_percentage).toFixed(1) : '-'}%</td>
                    <td className="text-center py-3 px-2">{latestMeasurement.water_percentage ? Number(latestMeasurement.water_percentage).toFixed(1) : '-'}%</td>
                    <td className={`text-center py-3 px-2 font-semibold ${
                      Number(calculateChange(Number(latestMeasurement.water_percentage), Number(previousMeasurement.water_percentage))) > 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {Number(calculateChange(Number(latestMeasurement.water_percentage), Number(previousMeasurement.water_percentage))) > 0 ? '+' : ''}
                      {calculateChange(Number(latestMeasurement.water_percentage), Number(previousMeasurement.water_percentage))}%
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 font-semibold">
                        ✓ Bom
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* Box de Status */}
          <Card className="p-4 bg-green-50 border-l-4 border-green-500">
            <div className="flex items-start gap-3">
              <div className="text-2xl">✓</div>
              <div>
                <h4 className="font-semibold text-green-900 mb-1">Progresso Positivo</h4>
                <p className="text-sm text-green-800">
                  Suas métricas estão evoluindo bem! Continue mantendo o acompanhamento regular para melhores resultados.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Gráfico de Evolução Temporal */}
      {measurements.length > 2 && (
        <div className="px-6 mb-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Evolução Temporal
            </h3>
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Peso (kg) / Massa (kg)', angle: -90, position: 'insideLeft', fontSize: 12 }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Percentual (%)', angle: 90, position: 'insideRight', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ fontSize: 12 }}
                    formatter={(value: any) => value ? Number(value).toFixed(1) : '-'}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="peso" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    name="Peso (kg)"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="musculo" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Massa Muscular (kg)"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="gordura" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Gordura (%)"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="agua" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Água (%)"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              * O gráfico mostra a evolução das suas métricas ao longo do tempo. Use-o para identificar tendências e padrões.
            </p>

            {/* Estatísticas de Tendência */}
            {stats && (
              <div className="mt-6 space-y-4">
                <h4 className="text-sm font-semibold text-foreground">📈 Estatísticas de Tendência</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Peso */}
                  <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="font-semibold text-sm">Peso</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <div className="text-muted-foreground mb-1">Média</div>
                        <div className="font-bold text-lg">{stats.weight.avg} kg</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Menor</div>
                        <div className="font-bold text-lg text-green-600">{stats.weight.best} kg</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Variação</div>
                        <div className={`font-bold text-lg ${Number(stats.weight.variation) < 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {Number(stats.weight.variation) > 0 ? '+' : ''}{stats.weight.variation} kg
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Gordura */}
                  <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="font-semibold text-sm">Gordura Corporal</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <div className="text-muted-foreground mb-1">Média</div>
                        <div className="font-bold text-lg">{stats.fat.avg}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Menor</div>
                        <div className="font-bold text-lg text-green-600">{stats.fat.best}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Variação</div>
                        <div className={`font-bold text-lg ${Number(stats.fat.variation) < 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {Number(stats.fat.variation) > 0 ? '+' : ''}{stats.fat.variation}%
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Massa Muscular */}
                  <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-semibold text-sm">Massa Muscular</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <div className="text-muted-foreground mb-1">Média</div>
                        <div className="font-bold text-lg">{stats.muscle.avg} kg</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Maior</div>
                        <div className="font-bold text-lg text-green-600">{stats.muscle.best} kg</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Variação</div>
                        <div className={`font-bold text-lg ${Number(stats.muscle.variation) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {Number(stats.muscle.variation) > 0 ? '+' : ''}{stats.muscle.variation} kg
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Água */}
                  <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="font-semibold text-sm">Água Corporal</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <div className="text-muted-foreground mb-1">Média</div>
                        <div className="font-bold text-lg">{stats.water.avg}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Maior</div>
                        <div className="font-bold text-lg text-green-600">{stats.water.best}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Variação</div>
                        <div className={`font-bold text-lg ${Number(stats.water.variation) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {Number(stats.water.variation) > 0 ? '+' : ''}{stats.water.variation}%
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="px-6 flex justify-center py-12">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      ) : measurements.length === 0 ? (
        <div className="px-6 mb-8">
          <Card className="p-8 text-center">
            <Sparkles className="w-12 h-12 text-accent mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Comece suas medições</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Faça upload de uma foto ou PDF dos seus exames de bioimpedância e deixe a IA analisar seus resultados.
            </p>
          </Card>
        </div>
      ) : (
        <>
          {/* Latest Measurement */}
          {latestMeasurement && (
            <div className="px-6 mb-6">
              <Card className="p-6 bg-gradient-to-br from-primary to-accent text-primary-foreground">
                <div className="text-center mb-4">
                  <div className="text-sm font-medium mb-2">Última Medição</div>
                  <div className="text-5xl font-bold mb-1">{Number(latestMeasurement.weight).toFixed(1)}kg</div>
                  <div className="text-sm opacity-90">
                    {new Date(latestMeasurement.measurement_date).toLocaleDateString("pt-BR")}
                  </div>
                </div>

                {latestMeasurement.body_fat_percentage && (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                      <div className="text-xs opacity-80 mb-1">Gordura</div>
                      <div className="text-2xl font-bold">{Number(latestMeasurement.body_fat_percentage).toFixed(1)}%</div>
                    </div>
                    {latestMeasurement.muscle_mass && (
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                        <div className="text-xs opacity-80 mb-1">Massa Magra</div>
                        <div className="text-2xl font-bold">{Number(latestMeasurement.muscle_mass).toFixed(1)}kg</div>
                      </div>
                    )}
                  </div>
                )}

                {latestMeasurement.notes && (
                  <div className="mt-4 text-sm opacity-90">
                    <strong>Observações:</strong> {latestMeasurement.notes}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* AI Analysis */}
          {latestAnalysis && (
            <div className="px-6 mb-6">
              <Card className="p-6 bg-gradient-to-br from-accent/10 to-primary/10 border-accent/20">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  Análise Inteligente
                </h3>
                
                {latestAnalysis.summary && (
                  <div className="mb-4 text-sm text-muted-foreground" 
                       dangerouslySetInnerHTML={{ __html: renderMarkdown(latestAnalysis.summary) }} />
                )}

                {latestAnalysis.critical_points && latestAnalysis.critical_points.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-warning mb-2">⚠️ Pontos de Atenção</h4>
                    <div className="space-y-2">
                      {latestAnalysis.critical_points.map((point: string, idx: number) => (
                        <div key={idx} className="text-sm text-foreground bg-warning/10 p-3 rounded-lg border border-warning/20"
                             dangerouslySetInnerHTML={{ __html: renderMarkdown(point) }} />
                      ))}
                    </div>
                  </div>
                )}

                {latestAnalysis.positive_points && latestAnalysis.positive_points.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-success mb-2">✅ Pontos Positivos</h4>
                    <div className="space-y-2">
                      {latestAnalysis.positive_points.map((point: string, idx: number) => (
                        <div key={idx} className="text-sm text-foreground bg-success/10 p-3 rounded-lg border border-success/20"
                             dangerouslySetInnerHTML={{ __html: renderMarkdown(point) }} />
                      ))}
                    </div>
                  </div>
                )}

                {latestAnalysis.recommendations && latestAnalysis.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-accent mb-2">💡 Recomendações</h4>
                    <div className="space-y-2">
                      {latestAnalysis.recommendations.map((rec: string, idx: number) => (
                        <div key={idx} className="text-sm text-foreground bg-accent/10 p-3 rounded-lg border border-accent/20"
                             dangerouslySetInnerHTML={{ __html: renderMarkdown(rec) }} />
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Evolution Comparison */}
          {measurements.length > 1 && (
            <div className="px-6 mb-6">
              <Card className="p-6 bg-accent-light">
                <h3 className="font-semibold text-foreground mb-4">Comparativo de Evolução</h3>
                <div className="space-y-3">
                  {(() => {
                    const latest = measurements[0];
                    const previous = measurements[1];
                    const weightDiff = Number(latest.weight) - Number(previous.weight);
                    const bodyFatDiff = latest.body_fat_percentage && previous.body_fat_percentage 
                      ? Number(latest.body_fat_percentage) - Number(previous.body_fat_percentage)
                      : null;
                    const muscleDiff = latest.muscle_mass && previous.muscle_mass
                      ? Number(latest.muscle_mass) - Number(previous.muscle_mass)
                      : null;

                    return (
                      <>
                        <div className="flex items-center justify-between py-2 border-b border-border">
                          <span className="text-sm text-muted-foreground">Peso</span>
                          <span className={`font-semibold ${weightDiff <= 0 ? 'text-success' : 'text-warning'}`}>
                            {weightDiff > 0 ? '+' : ''}{weightDiff.toFixed(1)}kg
                          </span>
                        </div>
                        {bodyFatDiff !== null && (
                          <div className="flex items-center justify-between py-2 border-b border-border">
                            <span className="text-sm text-muted-foreground">Gordura Corporal</span>
                            <span className={`font-semibold ${bodyFatDiff <= 0 ? 'text-success' : 'text-warning'}`}>
                              {bodyFatDiff > 0 ? '+' : ''}{bodyFatDiff.toFixed(1)}%
                            </span>
                          </div>
                        )}
                        {muscleDiff !== null && (
                          <div className="flex items-center justify-between py-2">
                            <span className="text-sm text-muted-foreground">Massa Magra</span>
                            <span className={`font-semibold ${muscleDiff >= 0 ? 'text-success' : 'text-warning'}`}>
                              {muscleDiff > 0 ? '+' : ''}{muscleDiff.toFixed(1)}kg
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </Card>
            </div>
          )}

          {/* Measurements History */}
          <div className="px-6 mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-3">Histórico de Medições</h2>
            <div className="space-y-3">
              {measurements.map((measurement, index) => {
                const nextMeasurement = measurements[index + 1];
                const weightChange = nextMeasurement 
                  ? Number(measurement.weight) - Number(nextMeasurement.weight)
                  : null;

                return (
                  <Card key={measurement.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-foreground">{Number(measurement.weight).toFixed(1)}kg</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(measurement.measurement_date).toLocaleDateString("pt-BR")}
                        </div>
                        {measurement.body_fat_percentage && (
                          <div className="text-sm text-muted-foreground mt-1">
                            Gordura: {Number(measurement.body_fat_percentage).toFixed(1)}%
                          </div>
                        )}
                        {measurement.muscle_mass && (
                          <div className="text-sm text-muted-foreground">
                            Massa Magra: {Number(measurement.muscle_mass).toFixed(1)}kg
                          </div>
                        )}
                      </div>
                      {weightChange !== null && (
                        <div className={`text-sm font-semibold ${weightChange <= 0 ? 'text-success' : 'text-warning'}`}>
                          {weightChange <= 0 ? '↓' : '↑'} {Math.abs(weightChange).toFixed(1)}kg
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
