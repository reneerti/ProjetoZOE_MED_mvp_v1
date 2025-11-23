import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, AlertCircle, TrendingUp, Info } from "lucide-react";

interface PatientViewData {
  summary: {
    normal_count: number;
    attention_count: number;
    critical_count: number;
    message: string;
  };
  grouped_results: Array<{
    group_name: string;
    icon: string;
    status: "normal" | "warning" | "critical";
    simple_explanation: string;
    key_values: Array<{
      name: string;
      value: string;
      status: "normal" | "warning" | "critical";
      simple_meaning: string;
    }>;
  }>;
  key_insights: Array<{
    title: string;
    description: string;
    color: "green" | "yellow" | "red" | "blue";
    action: string;
  }>;
}

interface PatientAnalysisViewProps {
  patientView: PatientViewData;
}

export const PatientAnalysisView = ({ patientView }: PatientAnalysisViewProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "critical":
        return "bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border-red-500";
      case "warning":
        return "bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950/30 dark:to-yellow-900/20 border-yellow-500";
      default:
        return "bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-500";
    }
  };

  const getInsightColor = (color: string) => {
    switch (color) {
      case "red":
        return "bg-gradient-to-br from-destructive-light to-destructive/20 border-l-4 border-destructive";
      case "yellow":
        return "bg-gradient-to-br from-warning-light to-warning/20 border-l-4 border-warning";
      case "green":
        return "bg-gradient-to-br from-success-light to-success/20 border-l-4 border-success";
      case "blue":
        return "bg-gradient-to-br from-accent-light to-accent/20 border-l-4 border-accent";
      default:
        return "bg-gradient-to-br from-muted to-muted/50 border-l-4 border-border";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "critical":
        return (
          <Badge className="text-xs flex items-center gap-1 bg-red-100 text-red-700 border-red-500 dark:bg-red-950/50 dark:text-red-300">
            <AlertCircle className="w-3 h-3" />
            Crítico
          </Badge>
        );
      case "warning":
        return (
          <Badge className="text-xs flex items-center gap-1 bg-yellow-100 text-yellow-700 border-yellow-500 dark:bg-yellow-950/50 dark:text-yellow-300">
            <AlertTriangle className="w-3 h-3" />
            Atenção
          </Badge>
        );
      default:
        return (
          <Badge className="text-xs flex items-center gap-1 bg-green-100 text-green-700 border-green-500 dark:bg-green-950/50 dark:text-green-300">
            <CheckCircle className="w-3 h-3" />
            Normal
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Info Header */}
      <Card className="bg-gradient-to-br from-accent/10 to-primary/10 border-accent p-6">
        <div className="flex items-start gap-3">
          <Info className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Seus Resultados de Forma Simples
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {patientView.summary.message}
            </p>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 p-4 text-center border-green-500">
          <div className="text-3xl font-bold text-green-700 dark:text-green-300 mb-1">
            {patientView.summary.normal_count}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400">Normais</div>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950/30 dark:to-yellow-900/20 p-4 text-center border-yellow-500">
          <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-300 mb-1">
            {patientView.summary.attention_count}
          </div>
          <div className="text-xs text-yellow-600 dark:text-yellow-400">Atenção</div>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 p-4 text-center border-red-500">
          <div className="text-3xl font-bold text-red-700 dark:text-red-300 mb-1">
            {patientView.summary.critical_count}
          </div>
          <div className="text-xs text-red-600 dark:text-red-400">Críticos</div>
        </Card>
      </div>

      {/* Grouped Results */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Seus Principais Resultados
        </h3>
        <div className="space-y-4">
          {patientView.grouped_results.map((group, idx) => (
            <Card key={idx} className={`${getStatusColor(group.status)} border-2 p-5`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{group.icon}</span>
                  <div>
                    <h4 className="font-semibold text-foreground text-lg">
                      {group.group_name}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {group.simple_explanation}
                    </p>
                  </div>
                </div>
                {getStatusBadge(group.status)}
              </div>

              <div className="space-y-2 mt-4">
                {group.key_values.map((value, vIdx) => (
                  <div
                    key={vIdx}
                    className="flex items-center justify-between p-3 bg-card/50 rounded-lg backdrop-blur-sm"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{value.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {value.simple_meaning}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-lg font-bold text-foreground">
                        {value.value}
                      </div>
                      <div className="text-xs mt-0.5">
                        {getStatusBadge(value.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Key Insights */}
      {patientView.key_insights.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Pontos Importantes
          </h3>
          <div className="space-y-3">
            {patientView.key_insights.map((insight, idx) => (
              <Card key={idx} className={`${getInsightColor(insight.color)} p-4`}>
                <h4 className="font-semibold text-foreground mb-2">{insight.title}</h4>
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                  {insight.description}
                </p>
                <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-sm font-medium text-foreground">
                    💡 O que fazer: {insight.action}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
