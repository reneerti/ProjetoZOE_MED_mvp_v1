import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Droplet, Heart, Pill, TestTube, TrendingUp, Brain, CheckCircle, AlertTriangle } from "lucide-react";
import { ExamCategoryEvolutionModal } from "./ExamCategoryEvolutionModal";

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
  const [selectedGroup, setSelectedGroup] = useState<GroupedResult | null>(null);
  const [showEvolution, setShowEvolution] = useState(false);

  const handleCardClick = (group: GroupedResult) => {
    setSelectedGroup(group);
    setShowEvolution(true);
  };

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

  const getCategoryColor = (categoryName: string, hasAbnormal: boolean) => {
    if (!hasAbnormal) {
      return "from-success/20 to-success/10 border-l-success";
    }
    
    const name = categoryName.toLowerCase();
    if (name.includes("cardiovascular") || name.includes("cardíaco") || name.includes("cardiaco")) {
      return "from-red-50 to-red-100 border-l-red-400";
    }
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
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle className="w-5 h-5 text-success" />
        <h2 className="text-xl font-bold text-foreground">
          Resultados Agrupados por Categoria
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groupedResults.map((group, index) => {
          const hasAbnormal = group.parameters.some(p => p.status?.toLowerCase() !== 'normal');
          
          return (
            <Card
              key={index}
              onClick={() => handleCardClick(group)}
              className={`p-5 bg-gradient-to-br ${getCategoryColor(group.category_name, hasAbnormal)} border-l-4 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]`}
            >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`
                  p-2 rounded-lg
                  ${!hasAbnormal ? "bg-success/30 text-success" : ""}
                  ${hasAbnormal && (group.category_name.toLowerCase().includes("cardiovascular") || group.category_name.toLowerCase().includes("cardíaco") || group.category_name.toLowerCase().includes("cardiaco")) ? "bg-red-200 text-red-700" : ""}
                  ${hasAbnormal && group.category_name.toLowerCase().includes("glicemia") ? "bg-red-200 text-red-700" : ""}
                  ${hasAbnormal && group.category_name.toLowerCase().includes("lipidograma") ? "bg-yellow-200 text-yellow-700" : ""}
                  ${hasAbnormal && (group.category_name.toLowerCase().includes("hepática") || group.category_name.toLowerCase().includes("hepatica")) ? "bg-orange-200 text-orange-700" : ""}
                  ${hasAbnormal && group.category_name.toLowerCase().includes("vitamina") ? "bg-purple-200 text-purple-700" : ""}
                `}>
                  {getCategoryIcon(group.category_icon)}
                </div>
                <h3 className="font-bold text-foreground text-base">
                  {group.category_name}
                </h3>
              </div>
              {!hasAbnormal ? (
                <CheckCircle className="w-6 h-6 text-success" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-warning" />
              )}
            </div>

            <div className="space-y-3">
              {group.parameters.map((param, pIndex) => (
                <div key={pIndex} className={`flex items-start justify-between gap-3 p-2 rounded-md ${
                  param.status?.toLowerCase() === 'normal'
                    ? 'bg-success/10 border border-success/30'
                    : 'bg-background/50'
                }`}>
                  <div className="flex-1">
                    <div className="text-sm text-foreground font-bold">
                      {param.name}
                    </div>
                    {param.reference_range && (
                      <div className="text-xs text-muted-foreground mt-0.5 italic">
                        Ref: {param.reference_range}
                      </div>
                    )}
                  </div>
                  {getStatusBadge(param.status, `${param.value}${param.unit ? ` ${param.unit}` : ""}`)}
                </div>
              ))}
            </div>
          </Card>
          );
        })}
      </div>

      <Card className="bg-muted/30 border-dashed border-2 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed text-center">
          ⚕️ <strong>Importante:</strong> <em>Esta análise é baseada em dados fornecidos e não substitui consulta médica profissional. 
          Sempre consulte seu médico antes de tomar decisões sobre tratamento ou medicação.</em>
        </p>
      </Card>

      {selectedGroup && (
        <ExamCategoryEvolutionModal
          open={showEvolution}
          onOpenChange={setShowEvolution}
          categoryName={selectedGroup.category_name}
          parameters={selectedGroup.parameters}
        />
      )}
    </div>
  );
};