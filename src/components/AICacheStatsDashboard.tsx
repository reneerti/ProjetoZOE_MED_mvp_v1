import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCacheStats } from "@/hooks/useAIUsageStats";
import { Skeleton } from "@/components/ui/skeleton";
import { Database, TrendingUp, DollarSign, Clock, HardDrive, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export const AICacheStatsDashboard = () => {
  const { data: stats, isLoading } = useCacheStats();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Nenhum dado de cache disponível.</p>
        </CardContent>
      </Card>
    );
  }

  const hitRate = Number(stats.cache_hit_rate) || 0;
  const costSaved = Number(stats.estimated_cost_saved) || 0;

  return (
    <div className="space-y-6">
      {/* Cache Performance Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Acerto</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hitRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.total_cache_hits} hits de {Number(stats.total_cached_responses) + Number(stats.total_cache_hits)} requisições
            </p>
            <Progress value={hitRate} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Economia de Custos</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${costSaved.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Economizado com cache hits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Respostas em Cache</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_cached_responses}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total_cached_tokens.toLocaleString()} tokens armazenados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Idade Média</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number(stats.avg_cache_age_hours).toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Tempo médio em cache
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cache Efficiency Insights */}
      {hitRate > 0 && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-900 dark:text-green-100">
                Cache Funcionando Eficientemente
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-800 dark:text-green-200">
              Sua taxa de acerto de cache de {hitRate.toFixed(1)}% está economizando custos de API significativamente.
              Você já economizou ${costSaved.toFixed(2)} evitando {stats.total_cache_hits} chamadas de API.
            </p>
            {hitRate >= 30 && (
              <p className="text-sm text-green-800 dark:text-green-200 mt-2">
                <strong>Excelente!</strong> Uma taxa de acerto acima de 30% indica que o cache está sendo muito efetivo para suas análises.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cache Storage Info */}
      <Card>
        <CardHeader>
          <CardTitle>Armazenamento de Cache</CardTitle>
          <CardDescription>Informações sobre o uso de armazenamento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Tamanho do Cache</span>
              </div>
              <span className="text-2xl font-bold">{Number(stats.cache_size_mb).toFixed(2)} MB</span>
            </div>
            
            <div className="pt-2 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Respostas armazenadas:</span>
                <span className="font-medium">{stats.total_cached_responses}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tokens totais:</span>
                <span className="font-medium">{stats.total_cached_tokens.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cache TTL:</span>
                <span className="font-medium">24 horas</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Limpeza automática:</span>
                <span className="font-medium">Diariamente às 3h AM</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Most Cached Functions */}
      <Card>
        <CardHeader>
          <CardTitle>Funções Mais Cacheadas</CardTitle>
          <CardDescription>Top 10 funções com mais cache hits</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.most_cached_functions && stats.most_cached_functions.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {stats.most_cached_functions.map((func, index) => {
                  const hitRate = func.cache_count > 0 
                    ? ((func.hits / (func.cache_count + func.hits)) * 100).toFixed(1)
                    : '0';
                  
                  return (
                    <div
                      key={func.function_name}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{func.function_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {func.cache_count} em cache
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {func.hits} hits
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">{hitRate}%</p>
                        <p className="text-xs text-muted-foreground">taxa de acerto</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma função cacheada ainda</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Recommendations */}
      {hitRate < 20 && stats.total_cached_responses > 10 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-900 dark:text-orange-100">
                Oportunidade de Otimização
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-800 dark:text-orange-200">
              Sua taxa de acerto de cache está baixa ({hitRate.toFixed(1)}%). Considere:
            </p>
            <ul className="list-disc list-inside text-sm text-orange-800 dark:text-orange-200 mt-2 space-y-1">
              <li>Análises similares podem estar sendo feitas repetidamente</li>
              <li>Aumentar o TTL do cache para análises mais estáveis</li>
              <li>Padronizar prompts para melhorar reuso de cache</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
