import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface TokenStatus {
  provider: string;
  expiresAt: string;
  daysUntilExpiry: number;
  status: 'healthy' | 'warning' | 'expired';
}

export const WearableTokenNotifications = () => {
  const [tokenStatuses, setTokenStatuses] = useState<TokenStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkTokenStatuses();

    // Subscribe to changes in wearable_connections
    const channel = supabase
      .channel('token-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wearable_connections',
        },
        () => {
          checkTokenStatuses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkTokenStatuses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: connections, error } = await supabase
        .from('wearable_connections')
        .select('provider, token_expires_at')
        .eq('user_id', user.id)
        .eq('sync_enabled', true);

      if (error) throw error;

      const statuses: TokenStatus[] = [];
      const now = new Date();

      for (const conn of connections || []) {
        if (conn.token_expires_at) {
          const expiresAt = new Date(conn.token_expires_at);
          const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          let status: 'healthy' | 'warning' | 'expired' = 'healthy';
          if (daysUntilExpiry < 0) {
            status = 'expired';
          } else if (daysUntilExpiry <= 7) {
            status = 'warning';
          }

          if (status !== 'healthy') {
            statuses.push({
              provider: conn.provider,
              expiresAt: conn.token_expires_at,
              daysUntilExpiry,
              status,
            });
          }
        }
      }

      setTokenStatuses(statuses);
    } catch (error) {
      console.error('Error checking token statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReconnect = () => {
    navigate('/metrics-evolution?view=wearables');
  };

  if (loading || tokenStatuses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-4">
      {tokenStatuses.map((status) => (
        <Alert 
          key={status.provider}
          variant={status.status === 'expired' ? 'destructive' : 'default'}
          className={status.status === 'warning' ? 'border-warning bg-warning/10' : ''}
        >
          {status.status === 'expired' ? (
            <XCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-warning" />
          )}
          <AlertTitle>
            {status.status === 'expired' 
              ? `Conexão ${status.provider} Expirada`
              : `Conexão ${status.provider} Expirando em Breve`
            }
          </AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              {status.status === 'expired' 
                ? 'Sua conexão expirou e os dados não estão sendo sincronizados.'
                : `Sua conexão expirará em ${status.daysUntilExpiry} dia(s). Reconecte para continuar a sincronização.`
              }
            </span>
            <Button 
              size="sm" 
              variant={status.status === 'expired' ? 'destructive' : 'default'}
              onClick={handleReconnect}
            >
              Reconectar
            </Button>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};
