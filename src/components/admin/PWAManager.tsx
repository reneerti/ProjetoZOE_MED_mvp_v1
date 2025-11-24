import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Check, Smartphone, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAManager = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(checkInstalled);

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      toast.error("Não é possível instalar neste momento. O prompt de instalação não está disponível.");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      toast.success('App instalado com sucesso!');
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  const resetDismissed = () => {
    localStorage.removeItem('pwa-install-dismissed');
    toast.success('Preferências de instalação resetadas. O prompt aparecerá novamente.');
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">Status do Aplicativo</h3>
            <p className="text-sm text-muted-foreground">
              Informações sobre instalação e modo offline
            </p>
          </div>
          <Smartphone className="w-8 h-8 text-primary" />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              {isInstalled ? (
                <Check className="w-5 h-5 text-success" />
              ) : (
                <Download className="w-5 h-5 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">Status de Instalação</span>
            </div>
            <Badge variant={isInstalled ? "default" : "secondary"}>
              {isInstalled ? "Instalado" : "Não Instalado"}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="w-5 h-5 text-success" />
              ) : (
                <WifiOff className="w-5 h-5 text-destructive" />
              )}
              <span className="text-sm font-medium">Status de Conexão</span>
            </div>
            <Badge variant={isOnline ? "default" : "destructive"}>
              {isOnline ? "Online" : "Offline"}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Installation Card */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Instalação do Aplicativo</h3>
        
        <div className="space-y-4">
          {!isInstalled ? (
            <>
              <p className="text-sm text-muted-foreground">
                Instale o ZoeMed como um aplicativo no seu dispositivo para acesso rápido e funcionamento offline.
              </p>
              
              {deferredPrompt ? (
                <Button 
                  onClick={handleInstall}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Instalar Aplicativo
                </Button>
              ) : (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    O prompt de instalação não está disponível. Isso pode acontecer se:
                  </p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                    <li>O app já está instalado</li>
                    <li>Você já dispensou o prompt antes</li>
                    <li>O navegador não suporta PWA</li>
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-5 h-5 text-success" />
                <p className="text-sm font-medium text-success">Aplicativo Instalado</p>
              </div>
              <p className="text-xs text-muted-foreground">
                O ZoeMed está instalado e pode ser acessado diretamente da tela inicial do seu dispositivo.
              </p>
            </div>
          )}

          <Button 
            onClick={resetDismissed}
            variant="outline"
            className="w-full"
          >
            Resetar Preferências de Instalação
          </Button>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="p-6 bg-muted/30">
        <h3 className="text-sm font-semibold mb-3">Sobre o Modo Offline</h3>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>
            ✓ Acesse o aplicativo sem conexão com internet
          </p>
          <p>
            ✓ Dados são salvos localmente e sincronizados quando online
          </p>
          <p>
            ✓ Interface rápida e responsiva
          </p>
          <p>
            ✓ Notificações push quando disponível
          </p>
        </div>
      </Card>
    </div>
  );
};
