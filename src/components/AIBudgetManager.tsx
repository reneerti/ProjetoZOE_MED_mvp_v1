import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useBudgetStatus, useBudgetConfig, updateBudgetConfig } from "@/hooks/useAIUsageStats";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, AlertTriangle, Target, Calendar } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

export const AIBudgetManager = () => {
  const { data: budgetStatus, isLoading: statusLoading } = useBudgetStatus();
  const { data: budgetConfig, isLoading: configLoading, refetch } = useBudgetConfig();
  const [isEditing, setIsEditing] = useState(false);
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [alertThreshold, setAlertThreshold] = useState("");
  const [enableAlerts, setEnableAlerts] = useState(true);

  const handleSave = async () => {
    try {
      await updateBudgetConfig({
        monthly_limit_usd: monthlyLimit ? Number(monthlyLimit) : undefined,
        alert_threshold_percentage: alertThreshold ? Number(alertThreshold) : undefined,
        enable_budget_alerts: enableAlerts
      });
      toast.success("Configurações de orçamento atualizadas");
      setIsEditing(false);
      refetch();
    } catch (error) {
      toast.error("Erro ao atualizar configurações");
      console.error(error);
    }
  };

  const handleEdit = () => {
    if (budgetConfig) {
      setMonthlyLimit(budgetConfig.monthly_limit_usd?.toString() || "100");
      setAlertThreshold(budgetConfig.alert_threshold_percentage?.toString() || "80");
      setEnableAlerts(budgetConfig.enable_budget_alerts || true);
    }
    setIsEditing(true);
  };

  if (statusLoading || configLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!budgetStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Nenhum dado de orçamento disponível.</p>
        </CardContent>
      </Card>
    );
  }

  const percentageUsed = budgetStatus.percentage_used || 0;
  const isOverBudget = budgetStatus.is_over_budget;
  const isNearLimit = budgetStatus.alert_threshold_reached;

  return (
    <div className="space-y-6">
      {/* Budget Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Limite Mensal</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(budgetStatus.monthly_limit).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Orçamento configurado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gasto Atual</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(budgetStatus.current_spending).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{percentageUsed.toFixed(1)}% usado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orçamento Restante</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(budgetStatus.remaining_budget).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Disponível este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projeção Mensal</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(budgetStatus.projected_monthly_spending).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Baseado em {budgetStatus.days_elapsed} de {budgetStatus.days_in_month} dias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Alert */}
      {(isOverBudget || isNearLimit) && (
        <Card className={`border-2 ${isOverBudget ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'border-orange-500 bg-orange-50 dark:bg-orange-950/20'}`}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${isOverBudget ? 'text-red-600' : 'text-orange-600'}`} />
              <CardTitle className={isOverBudget ? 'text-red-900 dark:text-red-100' : 'text-orange-900 dark:text-orange-100'}>
                {isOverBudget ? 'Orçamento Excedido!' : 'Atenção: Orçamento Próximo do Limite'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className={`text-sm ${isOverBudget ? 'text-red-800 dark:text-red-200' : 'text-orange-800 dark:text-orange-200'}`}>
              {isOverBudget
                ? `Você excedeu seu orçamento mensal de $${budgetStatus.monthly_limit}. Gastos atuais: $${budgetStatus.current_spending}.`
                : `Você utilizou ${percentageUsed.toFixed(1)}% do seu orçamento mensal. Considere ajustar o limite ou monitorar o uso.`}
            </p>
            {!isOverBudget && (
              <p className="text-sm text-orange-800 dark:text-orange-200 mt-2">
                <strong>Projeção:</strong> Com o uso atual, você deve gastar cerca de ${budgetStatus.projected_monthly_spending.toFixed(2)} este mês.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Budget Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Progresso do Orçamento</CardTitle>
          <CardDescription>
            Uso de AI este mês ({budgetStatus.days_elapsed} de {budgetStatus.days_in_month} dias)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress 
              value={Math.min(percentageUsed, 100)} 
              className="h-4"
            />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">$0.00</span>
              <span className="font-medium">
                ${budgetStatus.current_spending.toFixed(2)} / ${budgetStatus.monthly_limit.toFixed(2)}
              </span>
              <span className="text-muted-foreground">${budgetStatus.monthly_limit.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Média diária: ${(budgetStatus.current_spending / budgetStatus.days_elapsed).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Configuração de Orçamento</CardTitle>
              <CardDescription>Defina limites e alertas de gastos mensais</CardDescription>
            </div>
            {!isEditing && (
              <Button onClick={handleEdit} variant="outline">
                Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyLimit">Limite Mensal (USD)</Label>
                <Input
                  id="monthlyLimit"
                  type="number"
                  value={monthlyLimit}
                  onChange={(e) => setMonthlyLimit(e.target.value)}
                  placeholder="100.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alertThreshold">Limite de Alerta (%)</Label>
                <Input
                  id="alertThreshold"
                  type="number"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(e.target.value)}
                  placeholder="80"
                  min="0"
                  max="100"
                />
                <p className="text-xs text-muted-foreground">
                  Você receberá alertas quando atingir este percentual do limite mensal
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="enableAlerts">Habilitar Alertas de Orçamento</Label>
                <Switch
                  id="enableAlerts"
                  checked={enableAlerts}
                  onCheckedChange={setEnableAlerts}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave}>Salvar</Button>
                <Button onClick={() => setIsEditing(false)} variant="outline">
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Limite Mensal:</span>
                <span className="font-medium">${budgetConfig?.monthly_limit_usd || 100} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Limite de Alerta:</span>
                <span className="font-medium">{budgetConfig?.alert_threshold_percentage || 80}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Alertas Habilitados:</span>
                <span className="font-medium">
                  {budgetConfig?.enable_budget_alerts ? 'Sim' : 'Não'}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
