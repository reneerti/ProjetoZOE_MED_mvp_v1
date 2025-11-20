import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lightbulb, TrendingUp, Zap, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { useAIRecommendations, useGenerateRecommendations, useUpdateRecommendationStatus } from "@/hooks/useAIRecommendations";
import { toast } from "sonner";

export function AIRecommendationsPanel() {
  const { data: recommendations, isLoading } = useAIRecommendations();
  const generateRecommendations = useGenerateRecommendations();
  const updateStatus = useUpdateRecommendationStatus();

  const handleGenerate = () => {
    generateRecommendations.mutate(undefined, {
      onSuccess: () => {
        toast.success("Recomendações geradas com sucesso!");
      },
      onError: (error) => {
        toast.error(`Erro ao gerar recomendações: ${error.message}`);
      }
    });
  };

  const handleApply = (id: string) => {
    updateStatus.mutate({ id, status: 'applied' }, {
      onSuccess: () => {
        toast.success("Recomendação marcada como aplicada!");
      },
      onError: (error) => {
        toast.error(`Erro ao atualizar status: ${error.message}`);
      }
    });
  };

  const handleDismiss = (id: string) => {
    updateStatus.mutate({ id, status: 'dismissed' }, {
      onSuccess: () => {
        toast.info("Recomendação descartada.");
      },
      onError: (error) => {
        toast.error(`Erro ao atualizar status: ${error.message}`);
      }
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'model_change': return <TrendingUp className="h-4 w-4" />;
      case 'prompt_optimization': return <Zap className="h-4 w-4" />;
      case 'caching': return <Lightbulb className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const pendingRecommendations = recommendations?.filter(r => r.status === 'pending') || [];
  const appliedRecommendations = recommendations?.filter(r => r.status === 'applied') || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Carregando recomendações...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Recomendações de Otimização</h3>
          <p className="text-sm text-muted-foreground">
            Sugestões baseadas em ML para melhorar performance e reduzir custos
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generateRecommendations.isPending}
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${generateRecommendations.isPending ? 'animate-spin' : ''}`} />
          Gerar Recomendações
        </Button>
      </div>

      {pendingRecommendations.length === 0 ? (
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertDescription>
            Nenhuma recomendação pendente no momento. Clique em "Gerar Recomendações" para análise.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Pendentes ({pendingRecommendations.length})</h4>
          {pendingRecommendations.map((rec) => (
            <Card key={rec.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getTypeIcon(rec.recommendation_type)}
                    <div>
                      <CardTitle className="text-base">{rec.function_name}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {rec.recommendation_type.replace('_', ' ').toUpperCase()}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={getPriorityColor(rec.priority)}>
                    {rec.priority.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1">Ação Recomendada:</p>
                  <p className="text-sm text-muted-foreground">{rec.recommended_action}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-1">Melhoria Esperada:</p>
                  <p className="text-sm text-muted-foreground">{rec.expected_improvement}</p>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Justificativa:</p>
                  <p className="text-sm text-muted-foreground">{rec.reasoning}</p>
                </div>

                <div className="flex gap-4 text-sm">
                  {rec.estimated_cost_savings && (
                    <div>
                      <span className="font-medium">Economia estimada: </span>
                      <span className="text-green-600">${rec.estimated_cost_savings.toFixed(4)}</span>
                    </div>
                  )}
                  {rec.estimated_performance_gain && (
                    <div>
                      <span className="font-medium">Ganho de performance: </span>
                      <span className="text-blue-600">{rec.estimated_performance_gain.toFixed(0)}%</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleApply(rec.id)}
                    disabled={updateStatus.isPending}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Aplicar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDismiss(rec.id)}
                    disabled={updateStatus.isPending}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Descartar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {appliedRecommendations.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Aplicadas ({appliedRecommendations.length})</h4>
          {appliedRecommendations.slice(0, 3).map((rec) => (
            <Card key={rec.id} className="opacity-75">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{rec.function_name}</CardTitle>
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Aplicada
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  {rec.recommended_action}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
