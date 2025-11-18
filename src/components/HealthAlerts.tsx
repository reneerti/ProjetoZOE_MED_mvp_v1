import { useEffect, useState } from "react";
import { AlertTriangle, X, Check, Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface HealthAlert {
  id: string;
  parameter_name: string;
  value: number;
  critical_threshold: number;
  threshold_type: "high" | "low";
  severity: "warning" | "critical";
  status: "unread" | "read" | "dismissed";
  created_at: string;
  exam_image_id: string;
}

export const HealthAlerts = () => {
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchAlerts();
    
    // Subscribe to real-time alerts
    const channel = supabase
      .channel('health-alerts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'health_alerts'
        },
        (payload) => {
          const newAlert = payload.new as HealthAlert;
          setAlerts(prev => [newAlert, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast notification
          toast.error(
            `⚠️ Alerta Crítico: ${newAlert.parameter_name}`,
            {
              description: `Valor ${newAlert.value} ${newAlert.threshold_type === 'high' ? 'acima' : 'abaixo'} do limite (${newAlert.critical_threshold})`,
              duration: 10000,
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('health_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setAlerts((data || []) as HealthAlert[]);
      setUnreadCount(data?.filter(a => a.status === 'unread').length || 0);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast.error('Erro ao carregar alertas');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('health_alerts')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId ? { ...alert, status: 'read' as const } : alert
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking alert as read:', error);
      toast.error('Erro ao marcar alerta como lido');
    }
  };

  const dismissAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('health_alerts')
        .update({ status: 'dismissed' })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      const alert = alerts.find(a => a.id === alertId);
      if (alert?.status === 'unread') {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      toast.success('Alerta dispensado');
    } catch (error) {
      console.error('Error dismissing alert:', error);
      toast.error('Erro ao dispensar alerta');
    }
  };

  const getSeverityColor = (severity: string) => {
    return severity === 'critical' ? 'bg-destructive' : 'bg-warning';
  };

  const getSeverityBadge = (severity: string) => {
    return severity === 'critical' ? 'Crítico' : 'Atenção';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Nenhum alerta no momento</p>
        <p className="text-sm text-muted-foreground mt-1">
          Você será notificado quando houver parâmetros críticos
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-warning-light rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <span className="text-sm font-medium text-warning">
              {unreadCount} {unreadCount === 1 ? 'alerta novo' : 'alertas novos'}
            </span>
          </div>
        </div>
      )}

      {alerts.map((alert) => (
        <Card
          key={alert.id}
          className={`p-4 ${
            alert.status === 'unread'
              ? 'border-l-4 border-l-warning bg-warning-light/50'
              : 'opacity-75'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  variant="destructive"
                  className={getSeverityColor(alert.severity)}
                >
                  {getSeverityBadge(alert.severity)}
                </Badge>
                {alert.status === 'unread' && (
                  <Badge variant="outline" className="text-xs">
                    Novo
                  </Badge>
                )}
              </div>

              <h4 className="font-semibold text-foreground mb-1">
                {alert.parameter_name}
              </h4>

              <p className="text-sm text-muted-foreground mb-2">
                Valor detectado: <span className="font-semibold text-destructive">{alert.value}</span>
                {' '}({alert.threshold_type === 'high' ? 'acima' : 'abaixo'} do limite crítico de {alert.critical_threshold})
              </p>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {new Date(alert.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {alert.status === 'unread' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => markAsRead(alert.id)}
                  className="h-8 w-8"
                >
                  <Check className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => dismissAlert(alert.id)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {alert.severity === 'critical' && (
            <div className="mt-3 p-3 bg-destructive-light rounded-lg">
              <p className="text-xs text-destructive font-medium">
                ⚠️ Atenção: Este valor requer atenção médica imediata. Consulte seu médico o quanto antes.
              </p>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};
