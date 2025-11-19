import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, AlertTriangle, Bell, BellOff, CheckCircle, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals" | "resources" | "supplements" | "exam-charts" | "alerts";

interface CriticalAlertsDashboardProps {
  onNavigate: (view: View) => void;
}

interface Alert {
  id: string;
  parameter_name: string;
  value: number;
  critical_threshold: number;
  threshold_type: string;
  severity: string;
  status: string;
  created_at: string;
  exam_image_id: string;
  exam_images?: {
    exam_date: string;
    lab_name: string;
  };
}

export const CriticalAlertsDashboard = ({ onNavigate }: CriticalAlertsDashboardProps) => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if (user) {
      loadAlerts();
      checkNotificationPermission();
      setupRealtimeListener();
    }
  }, [user]);

  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      
      if (permission === 'granted') {
        toast.success("Notificações ativadas com sucesso!");
      } else {
        toast.error("Permissão de notificações negada");
      }
    }
  };

  const setupRealtimeListener = () => {
    const channel = supabase
      .channel('critical-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'health_alerts',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          const newAlert = payload.new as Alert;
          
          if (newAlert.severity === 'critical' || newAlert.severity === 'high') {
            // Mostrar notificação push
            if (notificationsEnabled && 'Notification' in window) {
              new Notification('Alerta Crítico de Saúde', {
                body: `${newAlert.parameter_name}: ${newAlert.value} (Limite: ${newAlert.critical_threshold})`,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: newAlert.id,
                requireInteraction: true
              });
            }
            
            // Mostrar toast
            toast.error(
              `Alerta: ${newAlert.parameter_name} está ${newAlert.threshold_type === 'high' ? 'acima' : 'abaixo'} do limite crítico!`,
              { duration: 10000 }
            );
            
            loadAlerts();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('health_alerts')
        .select(`
          *,
          exam_images (
            exam_date,
            lab_name
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error("Error loading alerts:", error);
      toast.error("Erro ao carregar alertas");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('health_alerts')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('id', alertId)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      toast.success("Alerta marcado como lido");
      loadAlerts();
    } catch (error) {
      console.error("Error marking alert as read:", error);
      toast.error("Erro ao atualizar alerta");
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('health_alerts')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('user_id', user?.id)
        .eq('status', 'unread');

      if (error) throw error;
      
      toast.success("Todos os alertas marcados como lidos");
      loadAlerts();
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Erro ao atualizar alertas");
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-destructive text-destructive-foreground';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-warning text-warning-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5" />;
      case 'high':
        return <TrendingUp className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const unreadAlerts = alerts.filter(a => a.status === 'unread');
  const readAlerts = alerts.filter(a => a.status === 'read');
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#EF4444] backdrop-blur supports-[backdrop-filter]:bg-[#EF4444]">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate("dashboard")}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Alertas Críticos</h1>
              <p className="text-sm text-white/80">
                {unreadAlerts.length} não lido(s) • {criticalAlerts.length} crítico(s)
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={notificationsEnabled ? undefined : requestNotificationPermission}
            className="text-white hover:bg-white/10"
          >
            {notificationsEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-24">
        {/* Notification Settings */}
        {!notificationsEnabled && (
          <Card className="p-4 border-warning bg-warning/10">
            <div className="flex items-start gap-3">
              <BellOff className="w-5 h-5 text-warning mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">Notificações desativadas</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Ative as notificações push para receber alertas em tempo real quando parâmetros críticos forem detectados.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={requestNotificationPermission}
                >
                  Ativar Notificações
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{criticalAlerts.length}</div>
              <div className="text-xs text-muted-foreground">Críticos</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">{unreadAlerts.length}</div>
              <div className="text-xs text-muted-foreground">Não Lidos</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">{alerts.length}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="unread" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="unread">
              Não Lidos ({unreadAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="critical">
              Críticos ({criticalAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              Todos ({alerts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unread" className="space-y-3 mt-4">
            {unreadAlerts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="w-full"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Marcar Todos Como Lidos
              </Button>
            )}
            
            <ScrollArea className="h-[calc(100vh-400px)]">
              <div className="space-y-3">
                {unreadAlerts.length === 0 ? (
                  <Card className="p-8 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto text-success mb-3" />
                    <p className="text-muted-foreground">Nenhum alerta não lido</p>
                  </Card>
                ) : (
                  unreadAlerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onMarkAsRead={markAsRead}
                      getSeverityColor={getSeverityColor}
                      getSeverityIcon={getSeverityIcon}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="critical" className="space-y-3 mt-4">
            <ScrollArea className="h-[calc(100vh-400px)]">
              <div className="space-y-3">
                {criticalAlerts.length === 0 ? (
                  <Card className="p-8 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto text-success mb-3" />
                    <p className="text-muted-foreground">Nenhum alerta crítico</p>
                  </Card>
                ) : (
                  criticalAlerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onMarkAsRead={markAsRead}
                      getSeverityColor={getSeverityColor}
                      getSeverityIcon={getSeverityIcon}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="all" className="space-y-3 mt-4">
            <ScrollArea className="h-[calc(100vh-400px)]">
              <div className="space-y-3">
                {alerts.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Nenhum alerta registrado</p>
                  </Card>
                ) : (
                  alerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onMarkAsRead={markAsRead}
                      getSeverityColor={getSeverityColor}
                      getSeverityIcon={getSeverityIcon}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

interface AlertCardProps {
  alert: Alert;
  onMarkAsRead: (id: string) => void;
  getSeverityColor: (severity: string) => string;
  getSeverityIcon: (severity: string) => React.ReactNode;
}

const AlertCard = ({ alert, onMarkAsRead, getSeverityColor, getSeverityIcon }: AlertCardProps) => {
  return (
    <Card className={`p-4 ${alert.status === 'unread' ? 'border-l-4 border-l-destructive' : ''}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${getSeverityColor(alert.severity)}`}>
          {getSeverityIcon(alert.severity)}
        </div>
        
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="font-semibold">{alert.parameter_name}</h3>
              <p className="text-xs text-muted-foreground">
                {alert.exam_images?.exam_date && new Date(alert.exam_images.exam_date).toLocaleDateString('pt-BR')}
                {alert.exam_images?.lab_name && ` • ${alert.exam_images.lab_name}`}
              </p>
            </div>
            <Badge className={getSeverityColor(alert.severity)}>
              {alert.severity === 'critical' ? 'Crítico' : alert.severity === 'high' ? 'Alto' : 'Médio'}
            </Badge>
          </div>
          
          <div className="space-y-1 mb-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Valor:</span>
              <span className="font-semibold">{alert.value}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Limite {alert.threshold_type === 'high' ? 'máximo' : 'mínimo'}:</span>
              <span className="font-semibold">{alert.critical_threshold}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
              <Clock className="w-3 h-3" />
              {new Date(alert.created_at).toLocaleString('pt-BR')}
            </div>
          </div>
          
          {alert.status === 'unread' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onMarkAsRead(alert.id)}
              className="w-full"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Marcar como Lido
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
