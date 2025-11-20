import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Trash2, TestTube, Plus } from "lucide-react";
import { useWebhookConfigs, useUpsertWebhookConfig, useDeleteWebhookConfig, useTestWebhook } from "@/hooks/useAIRecommendations";
import { toast } from "sonner";

export function WebhookConfigDialog() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [webhookType, setWebhookType] = useState<'slack' | 'discord'>('slack');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [selectedAlertTypes, setSelectedAlertTypes] = useState<string[]>(['critical', 'threshold_breach', 'anomaly']);

  const { data: configs } = useWebhookConfigs();
  const upsertConfig = useUpsertWebhookConfig();
  const deleteConfig = useDeleteWebhookConfig();
  const testWebhook = useTestWebhook();

  const alertTypeOptions = [
    { value: 'critical', label: 'Crítico' },
    { value: 'threshold_breach', label: 'Threshold Ultrapassado' },
    { value: 'anomaly', label: 'Anomalia Detectada' },
    { value: 'warning', label: 'Avisos' },
    { value: 'recommendation', label: 'Recomendações' }
  ];

  const handleSave = () => {
    if (!webhookUrl) {
      toast.error("URL do webhook é obrigatória");
      return;
    }

    upsertConfig.mutate({
      id: editingId || undefined,
      webhook_type: webhookType,
      webhook_url: webhookUrl,
      enabled: enabled,
      alert_types: selectedAlertTypes
    }, {
      onSuccess: () => {
        toast.success(editingId ? "Webhook atualizado!" : "Webhook criado!");
        resetForm();
      },
      onError: (error) => {
        toast.error(`Erro ao salvar webhook: ${error.message}`);
      }
    });
  };

  const handleEdit = (config: any) => {
    setEditingId(config.id);
    setWebhookType(config.webhook_type);
    setWebhookUrl(config.webhook_url);
    setEnabled(config.enabled);
    setSelectedAlertTypes(config.alert_types);
  };

  const handleDelete = (id: string) => {
    deleteConfig.mutate(id, {
      onSuccess: () => {
        toast.success("Webhook deletado!");
      },
      onError: (error) => {
        toast.error(`Erro ao deletar webhook: ${error.message}`);
      }
    });
  };

  const handleTest = (url: string) => {
    testWebhook.mutate(url, {
      onSuccess: () => {
        toast.success("Mensagem de teste enviada! Verifique seu canal.");
      },
      onError: (error) => {
        toast.error(`Erro ao enviar teste: ${error.message}`);
      }
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setWebhookType('slack');
    setWebhookUrl('');
    setEnabled(true);
    setSelectedAlertTypes(['critical', 'threshold_breach', 'anomaly']);
  };

  const toggleAlertType = (type: string) => {
    setSelectedAlertTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Bell className="h-4 w-4 mr-2" />
          Configurar Notificações
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuração de Webhooks</DialogTitle>
          <DialogDescription>
            Configure notificações para Slack ou Discord quando alertas forem detectados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lista de webhooks existentes */}
          {configs && configs.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Webhooks Configurados</h4>
              {configs.map((config) => (
                <Card key={config.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm capitalize">{config.webhook_type}</CardTitle>
                        <Badge variant={config.enabled ? "default" : "secondary"}>
                          {config.enabled ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTest(config.webhook_url)}
                          disabled={testWebhook.isPending}
                        >
                          <TestTube className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(config)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(config.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription className="text-xs mt-1 truncate">
                      {config.webhook_url}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {config.alert_types.map((type: string) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Formulário de criação/edição */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">
                {editingId ? "Editar Webhook" : "Novo Webhook"}
              </h4>
              {editingId && (
                <Button size="sm" variant="ghost" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="webhook-type">Tipo de Webhook</Label>
                <Select value={webhookType} onValueChange={(v) => setWebhookType(v as 'slack' | 'discord')}>
                  <SelectTrigger id="webhook-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slack">Slack</SelectItem>
                    <SelectItem value="discord">Discord</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="webhook-url">URL do Webhook</Label>
                <Input
                  id="webhook-url"
                  placeholder={webhookType === 'slack' 
                    ? "https://hooks.slack.com/services/..." 
                    : "https://discord.com/api/webhooks/..."}
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="webhook-enabled">Webhook Ativo</Label>
                <Switch
                  id="webhook-enabled"
                  checked={enabled}
                  onCheckedChange={setEnabled}
                />
              </div>

              <div>
                <Label>Tipos de Alerta</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {alertTypeOptions.map((option) => (
                    <Badge
                      key={option.value}
                      variant={selectedAlertTypes.includes(option.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleAlertType(option.value)}
                    >
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={upsertConfig.isPending}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {editingId ? "Atualizar Webhook" : "Adicionar Webhook"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
