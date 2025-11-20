import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Heart, Activity, Droplet, AlertCircle, Brain } from "lucide-react";

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
      <div className="flex items-center gap-2 mb-2">
        <div className="w-10 h-10 rounded-full bg-[#8B5CF6]/10 flex items-center justify-center">
          <Brain className="w-5 h-5 text-[#8B5CF6]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Alertas e Pontos de Atenção
          </h2>
          <p className="text-xs text-[#8B5CF6] font-medium">Análise por IA</p>
        </div>
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
                <h3 className="font-bold text-foreground mb-1">
                  {diagnostic.name}
                </h3>
                <p className="text-sm text-muted-foreground italic">
                  {diagnostic.explanation}
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-3">
              {diagnostic.related_parameters.map((param, pIndex) => (
                <div key={pIndex} className={`flex items-center justify-between text-sm p-2 rounded-md ${
                  param.status === "normal" 
                    ? "bg-success/10 border border-success/30" 
                    : "bg-background/50"
                }`}>
                  <span className="text-muted-foreground">
                    <strong>{param.name}:</strong>{" "}
                    <span className={`font-bold ${
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
              <div className="pt-3 border-t border-border/30 bg-[#8B5CF6]/5 p-3 rounded-md">
                <p className="text-xs font-bold text-[#8B5CF6] mb-2 flex items-center gap-1">
                  <Brain className="w-3 h-3" />
                  Recomendações da IA:
                </p>
                <ul className="space-y-1">
                  {diagnostic.recommendations.map((rec, rIndex) => (
                    <li key={rIndex} className="text-xs text-muted-foreground">
                      • {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="bg-muted/30 border-dashed border-2 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed text-center">
          ⚕️ <strong>Importante:</strong> <em>Esta análise é baseada em dados fornecidos e não substitui consulta médica profissional. 
          Sempre consulte seu médico antes de tomar decisões sobre tratamento ou medicação.</em>
        </p>
      </Card>
    </div>
  );
};