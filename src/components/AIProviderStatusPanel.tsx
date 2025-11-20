import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface ProviderStatus {
  provider: 'lovable_ai' | 'gemini_api' | 'groq_api';
  status: 'active' | 'idle' | 'error';
  lastUsed: Date | null;
  requestsLast5Min: number;
  lastError: string | null;
}

interface FallbackEvent {
  id: string;
  timestamp: Date;
  fromProvider: string;
  toProvider: string;
  reason: string;
  functionName: string;
}

export const AIProviderStatusPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [providers, setProviders] = useState<ProviderStatus[]>([
    { provider: 'lovable_ai', status: 'idle', lastUsed: null, requestsLast5Min: 0, lastError: null },
    { provider: 'gemini_api', status: 'idle', lastUsed: null, requestsLast5Min: 0, lastError: null },
    { provider: 'groq_api', status: 'idle', lastUsed: null, requestsLast5Min: 0, lastError: null }
  ]);
  const [fallbackEvents, setFallbackEvents] = useState<FallbackEvent[]>([]);
  const [groqFallbackAlerted, setGroqFallbackAlerted] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Buscar logs recentes inicialmente
    const fetchRecentLogs = async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: logs } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false });

      if (logs) {
        updateProviderStatus(logs);
        detectFallbacks(logs);
      }
    };

    fetchRecentLogs();

    // Configurar realtime subscription
    const channel = supabase
      .channel('ai-usage-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_usage_logs'
        },
        (payload) => {
          console.log('🔴 REALTIME: Novo log de IA recebido', payload.new);
          handleNewLog(payload.new as any);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const updateProviderStatus = (logs: any[]) => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    
    const updatedProviders = providers.map(p => {
      const providerLogs = logs.filter(l => l.provider === p.provider);
      const recentLogs = providerLogs.filter(l => new Date(l.created_at).getTime() > fiveMinutesAgo);
      
      const lastLog = providerLogs[0];
      const lastError = providerLogs.find(l => !l.success)?.error_message || null;
      
      return {
        ...p,
        lastUsed: lastLog ? new Date(lastLog.created_at) : p.lastUsed,
        requestsLast5Min: recentLogs.length,
        status: recentLogs.length > 0 ? 'active' : 'idle',
        lastError: lastError
      } as ProviderStatus;
    });

    setProviders(updatedProviders);
  };

  const detectFallbacks = (logs: any[]) => {
    const events: FallbackEvent[] = [];
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    for (let i = 1; i < sortedLogs.length; i++) {
      const prev = sortedLogs[i - 1];
      const curr = sortedLogs[i];
      
      // Detectar mudança de provider no mesmo minuto
      if (prev.provider !== curr.provider && 
          Math.abs(new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()) < 60000) {
        
        events.push({
          id: curr.id,
          timestamp: new Date(curr.created_at),
          fromProvider: prev.provider,
          toProvider: curr.provider,
          reason: prev.error_message || 'Fallback automático',
          functionName: curr.function_name
        });

        // Alerta crítico se caiu para Groq (terceiro fallback)
        if (curr.provider === 'groq_api' && !groqFallbackAlerted) {
          toast({
            title: "⚠️ Alerta Crítico: Terceiro Fallback Ativado",
            description: `Sistema está usando Groq API. Providers primários (Lovable AI e Gemini) falharam.`,
            variant: "destructive"
          });
          setGroqFallbackAlerted(true);
          
          // Reset alerta após 30 minutos
          setTimeout(() => setGroqFallbackAlerted(false), 30 * 60 * 1000);
        }
      }
    }

    setFallbackEvents(prev => {
      const combined = [...events, ...prev];
      const unique = combined.filter((e, i, arr) => 
        arr.findIndex(x => x.id === e.id) === i
      );
      return unique.slice(0, 10); // Manter apenas últimos 10
    });
  };

  const handleNewLog = (log: any) => {
    // Atualizar status do provider
    setProviders(prev => prev.map(p => {
      if (p.provider === log.provider) {
        return {
          ...p,
          lastUsed: new Date(log.created_at),
          requestsLast5Min: p.requestsLast5Min + 1,
          status: 'active',
          lastError: log.success ? p.lastError : log.error_message
        };
      }
      return p;
    }));

    // Detectar fallback em tempo real
    if (log.provider === 'groq_api' && !groqFallbackAlerted) {
      toast({
        title: "⚠️ Alerta Crítico: Terceiro Fallback Ativado",
        description: `Sistema está usando Groq API. Providers primários falharam.`,
        variant: "destructive"
      });
      setGroqFallbackAlerted(true);
      setTimeout(() => setGroqFallbackAlerted(false), 30 * 60 * 1000);
    }
  };

  const getProviderIcon = (status: string) => {
    switch (status) {
      case 'active': return <Activity className="h-4 w-4 text-green-500 animate-pulse" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'lovable_ai': return 'bg-purple-500';
      case 'gemini_api': return 'bg-green-500';
      case 'groq_api': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'lovable_ai': return 'Lovable AI';
      case 'gemini_api': return 'Gemini API';
      case 'groq_api': return 'Groq API';
      default: return provider;
    }
  };

  return (
    <div className="space-y-4">
      {/* Status dos Providers em Tempo Real */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Status dos Providers (Tempo Real)
          </CardTitle>
          <CardDescription>
            Monitoramento ao vivo do uso dos provedores de IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {providers.map((provider) => (
              <div key={provider.provider} className="flex flex-col gap-2 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${getProviderColor(provider.provider)} ${provider.status === 'active' ? 'animate-pulse' : ''}`} />
                    <span className="font-semibold">{getProviderName(provider.provider)}</span>
                  </div>
                  {getProviderIcon(provider.status)}
                </div>
                
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Último uso:</span>
                    <span>{provider.lastUsed ? format(provider.lastUsed, 'HH:mm:ss', { locale: ptBR }) : 'Nunca'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Últimos 5min:</span>
                    <Badge variant="secondary">{provider.requestsLast5Min} req</Badge>
                  </div>
                  {provider.lastError && (
                    <div className="text-xs text-red-500 mt-2 truncate" title={provider.lastError}>
                      {provider.lastError.substring(0, 40)}...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Trocas de Fallback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Histórico de Fallbacks
          </CardTitle>
          <CardDescription>
            Registro das últimas trocas automáticas de provider
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fallbackEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>Nenhum fallback detectado recentemente</p>
              <p className="text-sm">Sistema operando normalmente no provider primário</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {fallbackEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <AlertCircle className={`h-5 w-5 mt-0.5 ${event.toProvider === 'groq_api' ? 'text-red-500' : 'text-yellow-500'}`} />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{getProviderName(event.fromProvider)}</Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant={event.toProvider === 'groq_api' ? 'destructive' : 'secondary'}>
                          {getProviderName(event.toProvider)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {event.functionName} • {format(event.timestamp, "dd/MM/yy 'às' HH:mm:ss", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">{event.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
