import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFunctionThresholds, useThresholdAlerts, useUpsertThreshold, useDeleteThreshold, useAlertHistory, useAcknowledgeAlert } from "@/hooks/useAITrends";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { AlertTriangle, Bell, CheckCircle, Clock, DollarSign, Settings, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "./ui/skeleton";
import { ScrollArea } from "./ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function AIThresholdManager() {
  const { data: thresholds, isLoading: thresholdsLoading } = useFunctionThresholds();
  const { data: alerts, isLoading: alertsLoading } = useThresholdAlerts();
  const { data: history, isLoading: historyLoading } = useAlertHistory(20);
  const upsertThreshold = useUpsertThreshold();
  const deleteThreshold = useDeleteThreshold();
  const acknowledgeAlert = useAcknowledgeAlert();

  const [editingFunction, setEditingFunction] = useState<string>('');
  const [formData, setFormData] = useState({
    function_name: '',
    max_response_time_ms: '',
    max_cost_per_request: '',
    max_failure_rate: '',
    enable_alerts: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await upsertThreshold.mutateAsync({
        function_name: formData.function_name,
        max_response_time_ms: formData.max_response_time_ms ? parseInt(formData.max_response_time_ms) : null,
        max_cost_per_request: formData.max_cost_per_request ? parseFloat(formData.max_cost_per_request) : null,
        max_failure_rate: formData.max_failure_rate ? parseFloat(formData.max_failure_rate) : null,
        enable_alerts: formData.enable_alerts
      });

      toast.success('Threshold configurado com sucesso');
      setFormData({
        function_name: '',
        max_response_time_ms: '',
        max_cost_per_request: '',
        max_failure_rate: '',
        enable_alerts: true
      });
      setEditingFunction('');
    } catch (error) {
      toast.error('Erro ao configurar threshold');
      console.error(error);
    }
  };

  const handleEdit = (threshold: any) => {
    setEditingFunction(threshold.function_name);
    setFormData({
      function_name: threshold.function_name,
      max_response_time_ms: threshold.max_response_time_ms?.toString() || '',
      max_cost_per_request: threshold.max_cost_per_request?.toString() || '',
      max_failure_rate: threshold.max_failure_rate?.toString() || '',
      enable_alerts: threshold.enable_alerts
    });
  };

  const handleDelete = async (functionName: string) => {
    if (!confirm('Tem certeza que deseja remover este threshold?')) return;
    
    try {
      await deleteThreshold.mutateAsync(functionName);
      toast.success('Threshold removido');
    } catch (error) {
      toast.error('Erro ao remover threshold');
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlert.mutateAsync(alertId);
      toast.success('Alerta reconhecido');
    } catch (error) {
      toast.error('Erro ao reconhecer alerta');
    }
  };

  const getSeverityIcon = (severity: string) => {
    if (severity === 'critical') return <AlertTriangle className="h-4 w-4 text-red-600" />;
    if (severity === 'error') return <XCircle className="h-4 w-4 text-red-500" />;
    if (severity === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <Bell className="h-4 w-4 text-blue-500" />;
  };

  const getSeverityColor = (severity: string) => {
    if (severity === 'critical') return 'destructive';
    if (severity === 'error') return 'destructive';
    if (severity === 'warning') return 'default';
    return 'default';
  };

  if (thresholdsLoading || alertsLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      {/* Alertas Ativos */}
      {alerts && alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Alertas Ativos de Threshold
            </CardTitle>
            <CardDescription>
              {alerts.length} função(ões) ultrapassaram os limites configurados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <Alert key={index} variant="destructive">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <AlertTitle className="flex items-center gap-2">
                        {getSeverityIcon(alert.severity)}
                        {alert.function_name}
                      </AlertTitle>
                      <AlertDescription>
                        <p className="mt-2">
                          <strong>Tipo:</strong> {
                            alert.alert_type === 'response_time' ? 'Tempo de Resposta' :
                            alert.alert_type === 'cost' ? 'Custo' : 'Taxa de Falhas'
                          }
                        </p>
                        <p>
                          <strong>Limite:</strong> {alert.threshold_value.toFixed(4)} • 
                          <strong> Atual:</strong> {alert.actual_value.toFixed(4)}
                        </p>
                        <Badge 
                          variant={alert.severity === 'critical' ? 'destructive' : 'default'}
                          className="mt-2"
                        >
                          {alert.severity === 'critical' ? 'CRÍTICO' : 'AVISO'}
                        </Badge>
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulário de Configuração */}
      <Card>
        <CardHeader>
          <CardTitle>
            {editingFunction ? 'Editar Threshold' : 'Novo Threshold'}
          </CardTitle>
          <CardDescription>
            Configure limites de alerta para funções específicas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="function_name">Nome da Função</Label>
                <Input
                  id="function_name"
                  value={formData.function_name}
                  onChange={(e) => setFormData({ ...formData, function_name: e.target.value })}
                  placeholder="analyze-exams-integrated"
                  required
                  disabled={!!editingFunction}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_response_time">Tempo Máximo de Resposta (ms)</Label>
                <Input
                  id="max_response_time"
                  type="number"
                  value={formData.max_response_time_ms}
                  onChange={(e) => setFormData({ ...formData, max_response_time_ms: e.target.value })}
                  placeholder="5000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_cost">Custo Máximo por Requisição (USD)</Label>
                <Input
                  id="max_cost"
                  type="number"
                  step="0.0001"
                  value={formData.max_cost_per_request}
                  onChange={(e) => setFormData({ ...formData, max_cost_per_request: e.target.value })}
                  placeholder="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_failure_rate">Taxa Máxima de Falhas (%)</Label>
                <Input
                  id="max_failure_rate"
                  type="number"
                  step="0.1"
                  value={formData.max_failure_rate}
                  onChange={(e) => setFormData({ ...formData, max_failure_rate: e.target.value })}
                  placeholder="5.0"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enable_alerts"
                checked={formData.enable_alerts}
                onCheckedChange={(checked) => setFormData({ ...formData, enable_alerts: checked })}
              />
              <Label htmlFor="enable_alerts">Habilitar alertas automáticos</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={upsertThreshold.isPending}>
                {editingFunction ? 'Atualizar' : 'Criar'} Threshold
              </Button>
              {editingFunction && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingFunction('');
                    setFormData({
                      function_name: '',
                      max_response_time_ms: '',
                      max_cost_per_request: '',
                      max_failure_rate: '',
                      enable_alerts: true
                    });
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Thresholds Configurados */}
      <Card>
        <CardHeader>
          <CardTitle>Thresholds Configurados</CardTitle>
          <CardDescription>Limites de alerta por função</CardDescription>
        </CardHeader>
        <CardContent>
          {thresholds && thresholds.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Função</TableHead>
                    <TableHead className="text-right">Tempo Máx (ms)</TableHead>
                    <TableHead className="text-right">Custo Máx (USD)</TableHead>
                    <TableHead className="text-right">Falhas Máx (%)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {thresholds.map((threshold) => (
                    <TableRow key={threshold.id}>
                      <TableCell className="font-medium">
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {threshold.function_name}
                        </code>
                      </TableCell>
                      <TableCell className="text-right">
                        {threshold.max_response_time_ms || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {threshold.max_cost_per_request ? `$${threshold.max_cost_per_request}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {threshold.max_failure_rate ? `${threshold.max_failure_rate}%` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={threshold.enable_alerts ? 'default' : 'secondary'}>
                          {threshold.enable_alerts ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(threshold)}
                          >
                            <Settings className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(threshold.function_name)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum threshold configurado</p>
              <p className="text-sm mt-2">Configure limites para receber alertas automáticos</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Alertas */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Alertas</CardTitle>
          <CardDescription>Últimos 20 alertas enviados</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : history && history.length > 0 ? (
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {history.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 border rounded-lg ${
                      alert.acknowledged ? 'bg-muted/50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getSeverityIcon(alert.severity)}
                          <span className="font-semibold">{alert.title}</span>
                          <Badge variant={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {alert.message}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(alert.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                          {alert.acknowledged && (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              Reconhecido
                            </span>
                          )}
                        </div>
                      </div>
                      {!alert.acknowledged && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAcknowledge(alert.id)}
                        >
                          Reconhecer
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum alerta no histórico</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
