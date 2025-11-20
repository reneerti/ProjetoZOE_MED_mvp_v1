import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SystemConfig {
  id: string;
  config_key: string;
  config_value: any;
  description: string | null;
}

export const SystemConfigManager = () => {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .order('config_key');

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error("Error fetching system configs:", error);
      toast.error("Erro ao carregar configurações do sistema");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (configId: string, newValue: number) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('system_config')
        .update({ 
          config_value: { value: newValue },
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', configId);

      if (error) throw error;

      toast.success("Configuração atualizada com sucesso");
      await fetchConfigs();
    } catch (error) {
      console.error("Error updating config:", error);
      toast.error("Erro ao atualizar configuração");
    } finally {
      setSaving(false);
    }
  };

  const getConfigLabel = (key: string) => {
    const labels: Record<string, string> = {
      max_upload_size_mb: "Tamanho Máximo de Upload (MB)",
      cache_ttl_hours: "Tempo de Vida do Cache (horas)",
      alert_threshold_critical: "Threshold Crítico de Alertas (%)",
      alert_threshold_warning: "Threshold de Aviso de Alertas (%)",
      max_exams_per_month_free: "Máximo de Exames/Mês (Plano Gratuito)",
      auto_cleanup_days: "Dias para Limpeza Automática"
    };
    return labels[key] || key;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configurações do Sistema</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Ajuste os parâmetros globais da aplicação
          </p>
        </div>
        <Button
          onClick={fetchConfigs}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {configs.map((config) => (
          <Card key={config.id} className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor={config.config_key} className="text-base font-semibold">
                  {getConfigLabel(config.config_key)}
                </Label>
                {config.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {config.description}
                  </p>
                )}
              </div>
              
              <div className="flex gap-2">
                <Input
                  id={config.config_key}
                  type="number"
                  defaultValue={config.config_value?.value || 0}
                  min={0}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.currentTarget;
                      handleSave(config.id, parseInt(input.value));
                    }
                  }}
                />
                <Button
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    handleSave(config.id, parseInt(input.value));
                  }}
                  disabled={saving}
                  size="sm"
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
