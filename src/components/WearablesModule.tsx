import { useState, useEffect } from "react";
import { ArrowLeft, Watch, TrendingUp, Activity, Heart, Moon, Flame, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWearables } from "@/hooks/useWearables";
import { Badge } from "@/components/ui/badge";
import { WearablesEvolutionCharts } from "./WearablesEvolutionCharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals" | "resources" | "supplements" | "exam-charts" | "alerts" | "period-comparison" | "admin" | "controller" | "wearables";

interface WearablesModuleProps {
  onNavigate: (view: View) => void;
}

export const WearablesModule = ({ onNavigate }: WearablesModuleProps) => {
  const { 
    wearableData, 
    loading, 
    connectGoogleFit, 
    connectAppleHealth,
    addManualData,
    initiateGoogleFitAuth,
    initiateAppleHealthAuth
  } = useWearables();
  
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [manualData, setManualData] = useState({
    date: new Date().toISOString().split('T')[0],
    steps: "",
    heart_rate: "",
    sleep_hours: "",
    calories: ""
  });

  const latestData = wearableData[0];

  const handleManualAdd = async () => {
    const data = {
      date: manualData.date,
      steps: manualData.steps ? parseInt(manualData.steps) : null,
      heart_rate: manualData.heart_rate ? parseInt(manualData.heart_rate) : null,
      sleep_hours: manualData.sleep_hours ? parseFloat(manualData.sleep_hours) : null,
      calories: manualData.calories ? parseInt(manualData.calories) : null
    };

    await addManualData(data);
    setShowManualDialog(false);
    setManualData({
      date: new Date().toISOString().split('T')[0],
      steps: "",
      heart_rate: "",
      sleep_hours: "",
      calories: ""
    });
  };

  const handleGoogleFitConnect = async () => {
    try {
      const authUrl = await initiateGoogleFitAuth();
      if (authUrl) {
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error("Error connecting to Google Fit:", error);
      toast.error("Erro ao conectar com Google Fit");
    }
  };

  const handleAppleHealthConnect = async () => {
    try {
      const authUrl = await initiateAppleHealthAuth();
      if (authUrl) {
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error("Error connecting to Apple Health:", error);
      toast.error("Erro ao conectar com Apple Health");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-header text-white p-4 pb-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate("dashboard")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Watch className="w-6 h-6" />
            <div>
              <h1 className="text-2xl font-bold">Wearables</h1>
              <p className="text-sm text-white/80">Dados de dispositivos conectados</p>
            </div>
          </div>
        </div>

        {/* Resumo Rápido */}
        {latestData && (
          <div className="grid grid-cols-4 gap-2 mt-4">
            <Card className="bg-white/10 border-0">
              <CardContent className="p-3 text-center">
                <Activity className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-xs text-white/70">Passos</p>
                <p className="text-lg font-bold">{latestData.steps?.toLocaleString() || "-"}</p>
              </CardContent>
            </Card>
            <Card className="bg-white/10 border-0">
              <CardContent className="p-3 text-center">
                <Heart className="w-5 h-5 mx-auto mb-1 text-destructive" />
                <p className="text-xs text-white/70">BPM</p>
                <p className="text-lg font-bold">{latestData.heart_rate || "-"}</p>
              </CardContent>
            </Card>
            <Card className="bg-white/10 border-0">
              <CardContent className="p-3 text-center">
                <Moon className="w-5 h-5 mx-auto mb-1 text-info" />
                <p className="text-xs text-white/70">Sono</p>
                <p className="text-lg font-bold">{latestData.sleep_hours ? `${latestData.sleep_hours}h` : "-"}</p>
              </CardContent>
            </Card>
            <Card className="bg-white/10 border-0">
              <CardContent className="p-3 text-center">
                <Flame className="w-5 h-5 mx-auto mb-1 text-warning" />
                <p className="text-xs text-white/70">Calorias</p>
                <p className="text-lg font-bold">{latestData.calories || "-"}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-4 space-y-4">
        {/* Conexão com Dispositivos */}
        <Card className="border-accent/20 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Watch className="w-5 h-5 text-primary" />
              Conectar Dispositivos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={handleGoogleFitConnect}
              className="w-full"
              variant="outline"
            >
              <img 
                src="https://www.gstatic.com/images/branding/product/1x/gfit_512dp.png" 
                alt="Google Fit" 
                className="w-5 h-5 mr-2"
              />
              Conectar Google Fit
            </Button>
            <Button 
              onClick={handleAppleHealthConnect}
              className="w-full"
              variant="outline"
            >
              <Activity className="w-5 h-5 mr-2" />
              Conectar Apple Health
            </Button>
            <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
              <DialogTrigger asChild>
                <Button className="w-full" variant="secondary">
                  <Plus className="w-5 h-5 mr-2" />
                  Adicionar Dados Manualmente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Dados Manualmente</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="date">Data</Label>
                    <Input
                      id="date"
                      type="date"
                      value={manualData.date}
                      onChange={(e) => setManualData({ ...manualData, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="steps">Passos</Label>
                    <Input
                      id="steps"
                      type="number"
                      placeholder="Ex: 10000"
                      value={manualData.steps}
                      onChange={(e) => setManualData({ ...manualData, steps: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="heart_rate">Frequência Cardíaca (BPM)</Label>
                    <Input
                      id="heart_rate"
                      type="number"
                      placeholder="Ex: 75"
                      value={manualData.heart_rate}
                      onChange={(e) => setManualData({ ...manualData, heart_rate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sleep_hours">Horas de Sono</Label>
                    <Input
                      id="sleep_hours"
                      type="number"
                      step="0.1"
                      placeholder="Ex: 7.5"
                      value={manualData.sleep_hours}
                      onChange={(e) => setManualData({ ...manualData, sleep_hours: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="calories">Calorias Queimadas</Label>
                    <Input
                      id="calories"
                      type="number"
                      placeholder="Ex: 2000"
                      value={manualData.calories}
                      onChange={(e) => setManualData({ ...manualData, calories: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleManualAdd} className="w-full">
                    Adicionar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Gráficos de Evolução */}
        {wearableData.length > 0 && (
          <WearablesEvolutionCharts data={wearableData} />
        )}

        {/* Histórico */}
        <Card className="border-accent/20 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Histórico de Atividades
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground">Carregando...</p>
            ) : wearableData.length === 0 ? (
              <p className="text-center text-muted-foreground">
                Nenhum dado registrado ainda. Conecte um dispositivo ou adicione dados manualmente.
              </p>
            ) : (
              <div className="space-y-3">
                {wearableData.slice(0, 10).map((data) => (
                  <div key={data.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{new Date(data.date).toLocaleDateString('pt-BR')}</p>
                      <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                        {data.steps && <span>🚶 {data.steps.toLocaleString()}</span>}
                        {data.heart_rate && <span>❤️ {data.heart_rate} BPM</span>}
                        {data.sleep_hours && <span>😴 {data.sleep_hours}h</span>}
                        {data.calories && <span>🔥 {data.calories} kcal</span>}
                      </div>
                    </div>
                    <Badge variant={data.source === 'manual' ? 'secondary' : 'default'}>
                      {data.source === 'manual' ? 'Manual' : data.source}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
