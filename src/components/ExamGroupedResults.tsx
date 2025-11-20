import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Droplet, Heart, Pill, TestTube } from "lucide-react";

interface GroupedResult {
  category_name: string;
  category_icon: string;
  parameters: Array<{
    name: string;
    value: string | number;
    unit?: string;
    status: "normal" | "alto" | "baixo" | "critico";
    reference_range?: string;
  }>;
}

interface ExamGroupedResultsProps {
  groupedResults: GroupedResult[];
}

export const ExamGroupedResults = ({ groupedResults }: ExamGroupedResultsProps) => {
  const getCategoryIcon = (iconName: string) => {
    switch (iconName.toLowerCase()) {
      case "heart":
      case "glicemia":
        return <Heart className="w-5 h-5" />;
      case "droplet":
      case "lipidograma":
        return <Droplet className="w-5 h-5" />;
      case "activity":
      case "hepatica":
      case "função hepática":
        return <Activity className="w-5 h-5" />;
      case "pill":
      case "vitaminas":
        return <Pill className="w-5 h-5" />;
      default:
        return <TestTube className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes("glicemia") || name.includes("insulina")) {
      return "from-red-50 to-red-100 border-l-red-400";
    }
    if (name.includes("lipidograma") || name.includes("colesterol")) {
      return "from-yellow-50 to-yellow-100 border-l-yellow-400";
    }
    if (name.includes("hepática") || name.includes("hepatica") || name.includes("fígado")) {
      return "from-orange-50 to-orange-100 border-l-orange-400";
    }
    if (name.includes("vitamina")) {
      return "from-purple-50 to-purple-100 border-l-purple-400";
    }
    return "from-blue-50 to-blue-100 border-l-blue-400";
  };

  const getStatusBadge = (status: string, value: string | number) => {
    switch (status) {
      case "normal":
        return (
          <div className="text-right">
            <div className="text-lg font-semibold text-foreground">{value}</div>
            <Badge variant="outline" className="text-xs bg-success-light text-success border-success">
              ✓ Normal
            </Badge>
          </div>
        );
      case "alto":
        return (
          <div className="text-right">
            <div className="text-lg font-semibold text-destructive">{value}</div>
            <Badge className="text-xs bg-destructive text-destructive-foreground">
              ↑ Elevado
            </Badge>
          </div>
        );
      case "baixo":
        return (
          <div className="text-right">
            <div className="text-lg font-semibold text-warning">{value}</div>
            <Badge className="text-xs bg-warning text-warning-foreground">
              ↓ MUITO BAIXO
            </Badge>
          </div>
        );
      case "critico":
        return (
          <div className="text-right">
            <div className="text-lg font-semibold text-destructive">{value}</div>
            <Badge variant="destructive" className="text-xs">
              ↑↑ MUITO ALTO
            </Badge>
          </div>
        );
      default:
        return (
          <div className="text-lg font-semibold text-foreground text-right">{value}</div>
        );
    }
  };

  if (!groupedResults || groupedResults.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">
        Exames Laboratoriais - Evolução
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groupedResults.map((group, index) => (
          <Card
            key={index}
            className={`p-5 bg-gradient-to-br ${getCategoryColor(group.category_name)} border-l-4`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`
                p-2 rounded-lg
                ${group.category_name.toLowerCase().includes("glicemia") ? "bg-red-200 text-red-700" : ""}
                ${group.category_name.toLowerCase().includes("lipidograma") ? "bg-yellow-200 text-yellow-700" : ""}
                ${group.category_name.toLowerCase().includes("hepática") || group.category_name.toLowerCase().includes("hepatica") ? "bg-orange-200 text-orange-700" : ""}
                ${group.category_name.toLowerCase().includes("vitamina") ? "bg-purple-200 text-purple-700" : ""}
              `}>
                {getCategoryIcon(group.category_icon)}
              </div>
              <h3 className="font-semibold text-foreground text-lg">
                {group.category_name}
              </h3>
            </div>

            <div className="space-y-3">
              {group.parameters.map((param, pIndex) => (
                <div key={pIndex} className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-sm text-foreground font-medium">
                      {param.name}
                    </div>
                    {param.reference_range && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Ref: {param.reference_range}
                      </div>
                    )}
                  </div>
                  {getStatusBadge(param.status, `${param.value}${param.unit ? ` ${param.unit}` : ""}`)}
                </div>
              ))}
            </div>
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