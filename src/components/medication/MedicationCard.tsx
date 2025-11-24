import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, MoreVertical, Pill, Syringe } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface MedicationCardProps {
  medication: any;
  onViewHistory: (medication: any) => void;
  onDeactivate: (id: string) => void;
  onOpenDashboard?: (medication: any) => void;
}

export const MedicationCard = ({ medication, onViewHistory, onDeactivate, onOpenDashboard }: MedicationCardProps) => {
  const getMedicationType = () => {
    const type = medication.schedule?.type || "oral";
    const name = medication.medication_name.toLowerCase();
    
    // MONJARO - Destaque com cores do tema
    if (name.includes('monjaro')) {
      return { 
        label: "GLP-1", 
        badgeClass: "bg-primary/10 text-primary border-0",
        iconBg: "bg-primary/10",
        iconColor: "text-primary",
        cardBg: "bg-card border-border"
      };
    }
    
    // Vitamina B12 - Tema padrão
    if (name.includes('b12') || name.includes('b-12')) {
      return { 
        label: "Injetável", 
        badgeClass: "bg-secondary/10 text-secondary border-0",
        iconBg: "bg-secondary/10",
        iconColor: "text-secondary",
        cardBg: "bg-card border-border"
      };
    }
    
    // Vitaminas gerais - Tema padrão
    if (name.includes('vitamin') || name.includes('multivit') || name.includes('complexo')) {
      return { 
        label: "Oral", 
        badgeClass: "bg-success/10 text-success border-0",
        iconBg: "bg-success/10",
        iconColor: "text-success",
        cardBg: "bg-card border-border"
      };
    }
    
    // GLP-1 genérico - Tema padrão
    if (type === "glp1") {
      return { 
        label: "GLP-1", 
        badgeClass: "bg-accent/10 text-accent border-0",
        iconBg: "bg-accent/10",
        iconColor: "text-accent",
        cardBg: "bg-card border-border"
      };
    }
    
    // Injetável genérico - Tema padrão
    if (type === "injectable") {
      return { 
        label: "Injetável", 
        badgeClass: "bg-warning/10 text-warning border-0",
        iconBg: "bg-warning/10",
        iconColor: "text-warning",
        cardBg: "bg-card border-border"
      };
    }
    
    // Oral padrão - Cinza neutro
    return { 
      label: "Oral", 
      badgeClass: "bg-muted text-muted-foreground border border-border",
      iconBg: "bg-muted",
      iconColor: "text-muted-foreground",
      cardBg: "bg-card border-border"
    };
  };

  const typeInfo = getMedicationType();

  const isMonjaro = medication.medication_name.toLowerCase().includes('monjaro');

  return (
    <Card 
      className={`p-4 hover:shadow-lg transition-all duration-300 border ${typeInfo.cardBg} ${
        isMonjaro ? 'cursor-pointer hover:scale-[1.02] hover:shadow-xl' : 'hover:scale-[1.01]'
      }`}
      onClick={() => isMonjaro && onOpenDashboard && onOpenDashboard(medication)}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${typeInfo.iconBg}`}>
          {isMonjaro || medication.schedule?.type === "injectable" || medication.schedule?.type === "glp1" ? (
            <Syringe className={`w-5 h-5 ${typeInfo.iconColor}`} />
          ) : (
            <Pill className={`w-5 h-5 ${typeInfo.iconColor}`} />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-foreground line-clamp-1">
                {medication.medication_name}
              </h3>
              <Badge variant="outline" className={`mt-1 ${typeInfo.badgeClass} border-0 text-xs`}>
                {typeInfo.label}
              </Badge>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewHistory(medication)}>
                  <History className="w-4 h-4 mr-2" />
                  Ver Histórico
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDeactivate(medication.id)}
                  className="text-destructive"
                >
                  Desativar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">{medication.current_dose}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Início: {new Date(medication.start_date).toLocaleDateString("pt-BR")}
            </p>
          </div>

          {medication.notes && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {medication.notes}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};
