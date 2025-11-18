import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, TrendingUp, Trophy, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GoalNotificationsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: any[];
  onRead: () => void;
}

export const GoalNotifications = ({ open, onOpenChange, notifications, onRead }: GoalNotificationsProps) => {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'progress':
        return <TrendingUp className="w-5 h-5 text-accent" />;
      case 'milestone':
        return <CheckCircle className="w-5 h-5 text-primary" />;
      case 'completed':
        return <Trophy className="w-5 h-5 text-success" />;
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'progress':
        return 'border-accent/20 bg-accent/5';
      case 'milestone':
        return 'border-primary/20 bg-primary/5';
      case 'completed':
        return 'border-success/20 bg-success/5';
      default:
        return 'border-border bg-card';
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('goal_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      onRead();
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Erro ao marcar notificação");
    }
  };

  const markAllAsRead = async () => {
    try {
      const ids = notifications.map(n => n.id);
      const { error } = await supabase
        .from('goal_notifications')
        .update({ is_read: true })
        .in('id', ids);

      if (error) throw error;
      toast.success("Todas notificações marcadas como lidas");
      onRead();
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Erro ao marcar notificações");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Notificações de Progresso</DialogTitle>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </DialogHeader>

        {notifications.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-sm text-muted-foreground">
              Nenhuma notificação no momento
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`p-4 ${getNotificationColor(notification.notification_type)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-foreground text-sm">
                        {notification.title}
                      </h4>
                      {notification.progress_percentage !== null && (
                        <Badge variant="outline" className="shrink-0">
                          {Math.round(notification.progress_percentage)}%
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(notification.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs h-auto py-1"
                      >
                        Marcar como lida
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
