import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Heart, Activity, Droplet, AlertCircle } from "lucide-react";

interface PreDiagnostic {
  name: string;
  severity: "high" | "medium" | "low";
  related_parameters: Array<{
    name: string;
    value: string | number;
    unit?: string;
    status: "normal" | "alto" | "baixo" | "critico";
  }>;
  explanation: string;
  recommendations: string[];
}

interface ExamPreDiagnosticsProps {
  preDiagnostics: PreDiagnostic[];
}

export const ExamPreDiagnostics = ({ preDiagnostics }: ExamPreDiagnosticsProps) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "from-destructive/20 to-destructive/5 border-destructive";
      case "medium":
        return "from-warning/20 to-warning/5 border-warning";
      default:
        return "from-info/20 to-info/5 border-info";
    }
  };

  const getIcon = (name: string) => {
    if (name.toLowerCase().includes("metabólica") || name.toLowerCase().includes("metabolica")) {
      return <Heart className="w-5 h-5" />;
    }
    if (name.toLowerCase().includes("hepática") || name.toLowerCase().includes("hepatica") || name.toLowerCase().includes("fígado")) {
      return <Activity className="w-5 h-5" />;
    }
    if (name.toLowerCase().includes("vitamín") || name.toLowerCase().includes("vitami")) {
      return <Droplet className="w-5 h-5" />;
    }
    return <AlertCircle className="w-5 h-5" />;
  };

  const getStatusIcon = (status: string) => {
    if (status === "critico" || status === "alto" || status === "baixo") {
      return <span className="text-destructive">↑↑</span>;
    }
    return <span className="text-success">✓</span>;
  };

  if (!preDiagnostics || preDiagnostics.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-warning" />
        <h2 className="text-xl font-semibold text-foreground">
          Alertas e Pontos de Atenção
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {preDiagnostics.map((diagnostic, index) => (
          <Card
            key={index}
            className={`p-5 bg-gradient-to-br ${getSeverityColor(diagnostic.severity)} border-l-4`}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className={`
                p-2 rounded-lg
                ${diagnostic.severity === "high" ? "bg-destructive/20 text-destructive" : ""}
                ${diagnostic.severity === "medium" ? "bg-warning/20 text-warning" : ""}
                ${diagnostic.severity === "low" ? "bg-info/20 text-info" : ""}
              `}>
                {getIcon(diagnostic.name)}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">
                  {diagnostic.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {diagnostic.explanation}
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-3">
              {diagnostic.related_parameters.map((param, pIndex) => (
                <div key={pIndex} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    • {param.name}:{" "}
                    <span className={`font-medium ${
                      param.status === "normal" ? "text-success" : "text-destructive"
                    }`}>
                      {param.value}{param.unit ? ` ${param.unit}` : ""}
                    </span>
                  </span>
                  {getStatusIcon(param.status)}
                </div>
              ))}
            </div>

            {diagnostic.recommendations.length > 0 && (
              <div className="pt-3 border-t border-border/30">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Recomendações:
                </p>
                <ul className="space-y-1">
                  {diagnostic.recommendations.map((rec, rIndex) => (
                    <li key={rIndex} className="text-xs text-foreground">
                      • {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="bg-info/10 border-info/30 p-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          ⚕️ <strong>Importante:</strong> Esta análise é baseada em dados fornecidos e não substitui consulta médica profissional. 
          Sempre consulte seu médico antes de tomar decisões sobre tratamento ou medicação.
        </p>
      </Card>
    </div>
  );
};