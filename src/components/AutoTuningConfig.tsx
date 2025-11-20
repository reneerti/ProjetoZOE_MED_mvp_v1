import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Settings, History, CheckCircle, AlertTriangle, Zap, Filter } from "lucide-react";
import { useAutoTuningConfig, useUpdateAutoTuningConfig, useAutoTuningHistory } from "@/hooks/useAutoTuning";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function AutoTuningConfig() {
  const { data: config, isLoading } = useAutoTuningConfig();
  const { data: history } = useAutoTuningHistory(20);
  const updateConfig = useUpdateAutoTuningConfig();

  const [enabled, setEnabled] = useState(config?.enabled ?? false);
  const [autoApplyLowRisk, setAutoApplyLowRisk] = useState(config?.auto_apply_low_risk ?? false);
  const [autoApplyMediumRisk, setAutoApplyMediumRisk] = useState(config?.auto_apply_medium_risk ?? false);
  const [requireApproval, setRequireApproval] = useState(config?.require_admin_approval ?? true);
  const [minConfidence, setMinConfidence] = useState(config?.min_confidence_score ?? 0.8);
  const [maxDaily, setMaxDaily] = useState(config?.max_daily_applications ?? 5);
  const [riskFilters, setRiskFilters] = useState<Set<string>>(new Set(['low', 'medium', 'high']));

  const handleSave = () => {
    updateConfig.mutate({
      enabled,
      auto_apply_low_risk: autoApplyLowRisk,
      auto_apply_medium_risk: autoApplyMediumRisk,
      require_admin_approval: requireApproval,
      min_confidence_score: minConfidence,
      max_daily_applications: maxDaily
    }, {
      onSuccess: () => {
        toast.success("Configuração de auto-tuning atualizada!");
      },
      onError: (error) => {
        toast.error(`Erro ao atualizar configuração: ${error.message}`);
      }
    });
  };

  const toggleRiskFilter = (risk: string) => {
    const newFilters = new Set(riskFilters);
    if (newFilters.has(risk)) {
      newFilters.delete(risk);
    } else {
      newFilters.add(risk);
    }
    setRiskFilters(newFilters);
  };

  const filteredHistory = useMemo(() => {
    if (!history) return [];
    return history.filter(item => {
      // Parse risk level from new_config or previous_config if available
      const newConfig = item.new_config as any;
      const riskLevel = newConfig?.risk_level || 'low';
      return riskFilters.has(riskLevel);
    });
  }, [history, riskFilters]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Carregando configurações...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Configuração de Auto-Tuning</CardTitle>
          </div>
          <CardDescription>
            Configure a aplicação automática de recomendações de otimização de baixo risco
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Zap className="h-4 w-4" />
            <AlertDescription>
              O auto-tuning aplica automaticamente recomendações aprovadas, otimizando custos e performance sem intervenção manual.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enabled">Sistema Ativado</Label>
                <p className="text-sm text-muted-foreground">
                  Habilitar sistema de auto-tuning
                </p>
              </div>
              <Switch
                id="enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="low-risk">Auto-aplicar Baixo Risco</Label>
                <p className="text-sm text-muted-foreground">
                  Aplicar automaticamente recomendações de baixo risco
                </p>
              </div>
              <Switch
                id="low-risk"
                checked={autoApplyLowRisk}
                onCheckedChange={setAutoApplyLowRisk}
                disabled={!enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="medium-risk">Auto-aplicar Médio Risco</Label>
                <p className="text-sm text-muted-foreground">
                  Aplicar automaticamente recomendações de médio risco
                </p>
              </div>
              <Switch
                id="medium-risk"
                checked={autoApplyMediumRisk}
                onCheckedChange={setAutoApplyMediumRisk}
                disabled={!enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="approval">Requer Aprovação Admin</Label>
                <p className="text-sm text-muted-foreground">
                  Requer aprovação de administrador antes de aplicar
                </p>
              </div>
              <Switch
                id="approval"
                checked={requireApproval}
                onCheckedChange={setRequireApproval}
                disabled={!enabled}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="confidence">Confiança Mínima (%)</Label>
              <Input
                id="confidence"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                disabled={!enabled}
              />
              <p className="text-xs text-muted-foreground">
                Score de confiança mínimo para aplicar automaticamente (0.0 - 1.0)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-daily">Limite Diário de Aplicações</Label>
              <Input
                id="max-daily"
                type="number"
                min="1"
                max="50"
                value={maxDaily}
                onChange={(e) => setMaxDaily(parseInt(e.target.value))}
                disabled={!enabled}
              />
              <p className="text-xs text-muted-foreground">
                Número máximo de recomendações aplicadas automaticamente por dia
              </p>
            </div>
          </div>

          <Button 
            onClick={handleSave}
            disabled={updateConfig.isPending}
            className="w-full"
          >
            Salvar Configuração
          </Button>
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            <CardTitle>Histórico de Aplicações</CardTitle>
          </div>
          <CardDescription>
            Últimas recomendações aplicadas automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filtrar por risco:</span>
            <Button
              size="sm"
              variant={riskFilters.has('low') ? 'default' : 'outline'}
              onClick={() => toggleRiskFilter('low')}
            >
              Baixo
            </Button>
            <Button
              size="sm"
              variant={riskFilters.has('medium') ? 'default' : 'outline'}
              onClick={() => toggleRiskFilter('medium')}
            >
              Médio
            </Button>
            <Button
              size="sm"
              variant={riskFilters.has('high') ? 'default' : 'outline'}
              onClick={() => toggleRiskFilter('high')}
            >
              Alto
            </Button>
          </div>

          {!filteredHistory || filteredHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma aplicação registrada nos filtros selecionados.</p>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((item) => (
                <div key={item.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {item.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                      )}
                      <span className="text-sm font-medium">
                        {item.auto_applied ? 'Auto-aplicado' : 'Manual'}
                      </span>
                    </div>
                    <Badge variant={item.success ? "default" : "destructive"}>
                      {item.success ? 'Sucesso' : 'Falha'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {format(new Date(item.applied_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  {item.result && (
                    <p className="text-xs text-muted-foreground">{item.result}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
