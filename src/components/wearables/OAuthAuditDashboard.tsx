import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Activity, 
  Key, 
  RefreshCw, 
  Trash2, 
  Shield,
  TrendingUp,
  AlertCircle
} from "lucide-react";

interface AuditLog {
  id: string;
  connection_id: string;
  action: string;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

interface AuditStats {
  totalRotations: number;
  totalRevocations: number;
  totalStored: number;
  totalRefreshes: number;
  recentActivity: number;
}

export const OAuthAuditDashboard = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats>({
    totalRotations: 0,
    totalRevocations: 0,
    totalStored: 0,
    totalRefreshes: 0,
    recentActivity: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditData();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('oauth-audit-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wearable_token_audit',
        },
        () => {
          loadAuditData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAuditData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's connections
      const { data: connections } = await supabase
        .from('wearable_connections')
        .select('id')
        .eq('user_id', user.id);

      if (!connections || connections.length === 0) {
        setLoading(false);
        return;
      }

      const connectionIds = connections.map(c => c.id);

      // Get audit logs for user's connections
      const { data: logs, error } = await supabase
        .from('wearable_token_audit')
        .select('*')
        .in('connection_id', connectionIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setAuditLogs(logs || []);

      // Calculate stats
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const stats: AuditStats = {
        totalRotations: logs?.filter(l => l.action === 'token_rotated').length || 0,
        totalRevocations: logs?.filter(l => l.action === 'token_revoked').length || 0,
        totalStored: logs?.filter(l => l.action === 'token_stored').length || 0,
        totalRefreshes: logs?.filter(l => 
          l.action === 'token_refreshed' || l.action === 'token_proactive_refresh'
        ).length || 0,
        recentActivity: logs?.filter(l => 
          new Date(l.created_at) > last24Hours
        ).length || 0,
      };

      setStats(stats);
    } catch (error) {
      console.error('Error loading audit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'token_stored':
        return <Key className="h-4 w-4" />;
      case 'token_rotated':
      case 'token_refreshed':
      case 'token_proactive_refresh':
        return <RefreshCw className="h-4 w-4" />;
      case 'token_revoked':
        return <Trash2 className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'token_stored': 'Token Armazenado',
      'token_rotated': 'Token Rotacionado',
      'token_refreshed': 'Token Atualizado',
      'token_proactive_refresh': 'Refresh Proativo',
      'token_revoked': 'Token Revogado',
    };
    return labels[action] || action;
  };

  const getActionVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (action) {
      case 'token_revoked':
        return 'destructive';
      case 'token_stored':
        return 'default';
      case 'token_proactive_refresh':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Auditoria OAuth</CardTitle>
          <CardDescription>Carregando dados de auditoria...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rotações</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRotations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atualizações</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRefreshes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Armazenados</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStored}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revogações</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRevocations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">24h</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentActivity}</div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Histórico de Auditoria OAuth
          </CardTitle>
          <CardDescription>
            Últimas 50 operações de segurança em suas conexões OAuth
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma atividade registrada ainda
                </p>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getActionIcon(log.action)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={getActionVariant(log.action)}>
                            {getActionLabel(log.action)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                        {log.ip_address && (
                          <p className="text-xs text-muted-foreground">
                            IP: {log.ip_address}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
