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
    
    // MONJARO - Destaque especial com gradiente moderno
    if (name.includes('monjaro')) {
      return { 
        label: "GLP-1", 
        badgeClass: "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800",
        iconBg: "bg-gradient-to-br from-purple-500/20 to-pink-500/20",
        iconColor: "text-purple-600 dark:text-purple-400",
        cardBg: "bg-gradient-to-br from-purple-50/80 to-pink-50/80 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200/50 dark:border-purple-800/50"
      };
    }
    
    // Vitamina B12 - Azul vibrante
    if (name.includes('b12') || name.includes('b-12')) {
      return { 
        label: "Injetável", 
        badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
        iconBg: "bg-blue-500/10",
        iconColor: "text-blue-600 dark:text-blue-400",
        cardBg: "bg-blue-50/80 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/50"
      };
    }
    
    // Vitaminas gerais - Verde natural
    if (name.includes('vitamin') || name.includes('multivit') || name.includes('complexo')) {
      return { 
        label: "Oral", 
        badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
        iconBg: "bg-emerald-500/10",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        cardBg: "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/50"
      };
    }
    
    // GLP-1 genérico - Roxo/Rosa
    if (type === "glp1") {
      return { 
        label: "GLP-1", 
        badgeClass: "bg-accent/10 text-accent border border-accent/20",
        iconBg: "bg-accent/10",
        iconColor: "text-accent",
        cardBg: "bg-accent/5 dark:bg-accent/10 border-accent/20"
      };
    }
    
    // Injetável genérico - Laranja
    if (type === "injectable") {
      return { 
        label: "Injetável", 
        badgeClass: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800",
        iconBg: "bg-orange-500/10",
        iconColor: "text-orange-600 dark:text-orange-400",
        cardBg: "bg-orange-50/80 dark:bg-orange-950/20 border-orange-200/50 dark:border-orange-800/50"
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
