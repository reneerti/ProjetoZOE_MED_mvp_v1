import { useState } from "react";
import { ArrowLeft, Watch, TrendingUp, Activity, Heart, Moon, Flame, Plus, HelpCircle, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWearables } from "@/hooks/useWearables";
import { Badge } from "@/components/ui/badge";
import { WearablesEvolutionCharts } from "./WearablesEvolutionCharts";
import { GoogleFitSetupTutorial } from "./wearables/GoogleFitSetupTutorial";
import { ManualDataDialog } from "./wearables/ManualDataDialog";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals" | "resources" | "supplements" | "exam-charts" | "alerts" | "period-comparison" | "admin" | "controller" | "wearables";

interface WearablesModuleProps {
  onNavigate: (view: View) => void;
}

export const WearablesModule = ({ onNavigate }: WearablesModuleProps) => {
  const { 
    wearableData, 
    loading, 
    addManualData,
    initiateGoogleFitAuth,
    initiateAppleHealthAuth
  } = useWearables();
  
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const latestData = wearableData[0];
  const hasConnectedSource = wearableData.some(d => d.source !== 'manual');

  const handleManualSave = async (data: any) => {
    await addManualData(data);
  };

  const handleGoogleFitConnect = async () => {
    try {
      toast.info("Redirecionando para autenticação do Google...");
      const authUrl = await initiateGoogleFitAuth();
      if (authUrl) {
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error("Error connecting to Google Fit:", error);
      toast.error("Erro ao conectar com Google Fit. Verifique se as credenciais estão configuradas.");
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

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTutorial(true)}
            className="text-white/90 hover:bg-white/20"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            Como Configurar
          </Button>
        </div>

        {/* Alert se não houver fonte conectada */}
        {!hasConnectedSource && wearableData.length > 0 && (
          <Alert className="bg-blue-50 border-blue-200">
            <Smartphone className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              Você está usando entrada manual. Para sincronização automática, conecte o Google Fit abaixo.
            </AlertDescription>
          </Alert>
        )}

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
            <div className="space-y-2">
              <Button 
                onClick={handleGoogleFitConnect}
                className="w-full justify-between bg-white hover:bg-gray-50 text-gray-900 border h-auto py-3"
              >
                <div className="flex items-center">
                  <img 
                    src="https://www.gstatic.com/images/branding/product/2x/google_fit_2020q4_512dp.png" 
                    alt="Google Fit"
                    className="w-8 h-8 mr-3"
                  />
                  <div className="text-left">
                    <div className="font-semibold">Google Fit</div>
                    <div className="text-xs text-muted-foreground">Sincronização automática</div>
                  </div>
                </div>
                <Activity className="w-5 h-5 text-muted-foreground" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTutorial(true)}
                className="w-full text-xs text-muted-foreground"
              >
                <HelpCircle className="w-3 h-3 mr-1" />
                Precisa de ajuda para configurar?
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">ou</span>
              </div>
            </div>
            
            <Button 
              onClick={handleAppleHealthConnect}
              disabled
              className="w-full justify-between bg-gray-100 text-gray-400 border border-dashed h-auto py-3 cursor-not-allowed"
            >
              <div className="flex items-center">
                <Heart className="w-8 h-8 mr-3 text-gray-400" />
                <div className="text-left">
                  <div className="font-semibold">Apple Health</div>
                  <div className="text-xs">Requer app nativo iOS</div>
                </div>
              </div>
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">entrada manual</span>
              </div>
            </div>

            <Button 
              onClick={() => setShowManualDialog(true)}
              variant="outline" 
              className="w-full justify-start h-auto py-3"
            >
              <Plus className="w-5 h-5 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Adicionar Dados Manualmente</div>
                <div className="text-xs text-muted-foreground">Registre seus dados de saúde</div>
              </div>
            </Button>
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

      {/* Dialogs */}
      <GoogleFitSetupTutorial
        open={showTutorial}
        onOpenChange={setShowTutorial}
        onConnect={handleGoogleFitConnect}
      />

      <ManualDataDialog
        open={showManualDialog}
        onOpenChange={setShowManualDialog}
        onSave={handleManualSave}
      />
    </div>
  );
};
