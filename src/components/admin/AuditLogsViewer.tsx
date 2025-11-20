import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, FileText, User, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: any;
  new_values: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface ProfileData {
  display_name: string | null;
}

export const AuditLogsViewer = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data: logsData, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      if (logsData && logsData.length > 0) {
        // Fetch profiles separately
        const userIds = [...new Set(logsData.map(log => log.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', userIds);

        const profilesMap: Record<string, ProfileData> = {};
        profilesData?.forEach(profile => {
          profilesMap[profile.id] = { display_name: profile.display_name };
        });

        setProfiles(profilesMap);
      }
      
      setLogs(logsData || []);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      toast.error("Erro ao carregar logs de auditoria");
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'bg-green-500/10 text-green-700 dark:text-green-400';
    if (action.includes('delete')) return 'bg-red-500/10 text-red-700 dark:text-red-400';
    if (action.includes('update')) return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
    return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'user_created': 'Usuário Criado',
      'user_deleted': 'Usuário Excluído',
      'user_updated': 'Usuário Atualizado',
      'role_changed': 'Papel Alterado',
      'plan_created': 'Plano Criado',
      'plan_updated': 'Plano Atualizado',
      'plan_deleted': 'Plano Excluído',
      'subscription_created': 'Assinatura Criada',
      'subscription_updated': 'Assinatura Atualizada',
      'config_updated': 'Configuração Atualizada'
    };
    return labels[action] || action;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Logs de Auditoria</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Histórico de ações administrativas importantes
          </p>
        </div>
        <Button
          onClick={fetchLogs}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {logs.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Nenhum log de auditoria encontrado
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getActionColor(log.action)}>
                      {getActionLabel(log.action)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {log.entity_type}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{profiles[log.user_id]?.display_name || 'Usuário desconhecido'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>

                  {log.ip_address && (
                    <p className="text-xs text-muted-foreground">
                      IP: {log.ip_address}
                    </p>
                  )}
                </div>

                {(log.old_values || log.new_values) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      console.log('Old values:', log.old_values);
                      console.log('New values:', log.new_values);
                      toast.info("Detalhes logados no console");
                    }}
                  >
                    Ver Detalhes
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
