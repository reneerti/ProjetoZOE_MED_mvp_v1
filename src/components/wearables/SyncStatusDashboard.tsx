import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RefreshCw, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WearableConnection {
  id: string;
  provider: string;
  connected_at: string;
  last_sync_at: string | null;
  sync_enabled: boolean;
  token_expires_at: string | null;
}

export const SyncStatusDashboard = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<WearableConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchConnections = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wearable_connections')
        .select('*')
        .eq('user_id', user.id)
        .order('connected_at', { ascending: false });

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
      toast.error('Erro ao carregar status de sincronização');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchConnections, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('sync-google-fit-data');
      
      if (error) throw error;
      
      toast.success('Sincronização manual iniciada com sucesso!');
      
      // Atualizar status após 5 segundos
      setTimeout(fetchConnections, 5000);
    } catch (error) {
      console.error('Error triggering manual sync:', error);
      toast.error('Erro ao iniciar sincronização manual');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async (connectionId: string, provider: string) => {
    if (!confirm(`Deseja realmente desconectar do ${provider}? Os dados já sincronizados serão mantidos.`)) {
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('disconnect-wearable', {
        body: { connectionId }
      });
      
      if (error) throw error;
      
      toast.success('Dispositivo desconectado com sucesso!');
      fetchConnections();
    } catch (error) {
      console.error('Error disconnecting wearable:', error);
      toast.error('Erro ao desconectar dispositivo');
    }
  };

  const getStatusBadge = (connection: WearableConnection) => {
    const now = new Date();
    const tokenExpires = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
    
    if (!connection.sync_enabled) {
      return <Badge variant="secondary" className="gap-1"><XCircle className="w-3 h-3" />Desativado</Badge>;
    }
    
    if (tokenExpires && tokenExpires < now) {
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />Token Expirado</Badge>;
    }
    
    if (!connection.last_sync_at) {
      return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />Aguardando Primeira Sync</Badge>;
    }
    
    const lastSync = new Date(connection.last_sync_at);
    const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceSync > 12) {
      return <Badge variant="outline" className="gap-1 text-orange-600"><AlertCircle className="w-3 h-3" />Sincronização Atrasada</Badge>;
    }
    
    return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle2 className="w-3 h-3" />Ativo</Badge>;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Carregando status...</div>
        </CardContent>
      </Card>
    );
  }

  if (connections.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            Nenhuma conexão ativa. Conecte o Google Fit para começar.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Status de Sincronização</CardTitle>
        <Button
          onClick={handleManualSync}
          disabled={syncing}
          size="sm"
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          Sincronizar Agora
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {connections.map((connection) => (
          <div
            key={connection.id}
            className="flex items-start justify-between p-4 border rounded-lg bg-card"
          >
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium capitalize">{connection.provider.replace('_', ' ')}</h3>
                {getStatusBadge(connection)}
              </div>
              
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>Conectado em: {formatDate(connection.connected_at)}</span>
                </div>
                
                {connection.last_sync_at && (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-3 h-3" />
                    <span>Última sincronização: {formatDate(connection.last_sync_at)}</span>
                  </div>
                )}
                
                {connection.token_expires_at && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-3 h-3" />
                    <span>Token expira em: {formatDate(connection.token_expires_at)}</span>
                  </div>
                )}
              </div>
            </div>
            
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => handleDisconnect(connection.id, connection.provider)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              Desconectar
            </Button>
          </div>
        ))}
        
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            A sincronização automática ocorre a cada 6 horas. Você pode forçar uma sincronização manual a qualquer momento.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
