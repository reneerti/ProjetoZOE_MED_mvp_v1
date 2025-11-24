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
        badgeClass: "bg-purple-100/80 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-0",
        iconBg: "bg-gradient-to-br from-purple-100/80 to-pink-100/80 dark:from-purple-900/30 dark:to-pink-900/30",
        iconColor: "text-purple-600 dark:text-purple-400",
        cardBg: "bg-gradient-to-br from-purple-50/60 to-pink-50/60 dark:from-purple-950/15 dark:to-pink-950/15 border-purple-200/30 dark:border-purple-800/30"
      };
    }
    
    // Vitamina B12 - Azul suave
    if (name.includes('b12') || name.includes('b-12')) {
      return { 
        label: "Injetável", 
        badgeClass: "bg-sky-100/80 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-0",
        iconBg: "bg-sky-100/80 dark:bg-sky-900/30",
        iconColor: "text-sky-600 dark:text-sky-400",
        cardBg: "bg-sky-50/60 dark:bg-sky-950/15 border-sky-200/30 dark:border-sky-800/30"
      };
    }
    
    // Vitaminas gerais - Verde alegre
    if (name.includes('vitamin') || name.includes('multivit') || name.includes('complexo')) {
      return { 
        label: "Oral", 
        badgeClass: "bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-0",
        iconBg: "bg-emerald-100/80 dark:bg-emerald-900/30",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        cardBg: "bg-emerald-50/60 dark:bg-emerald-950/15 border-emerald-200/30 dark:border-emerald-800/30"
      };
    }
    
    // GLP-1 genérico - Roxo suave
    if (type === "glp1") {
      return { 
        label: "GLP-1", 
        badgeClass: "bg-violet-100/80 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-0",
        iconBg: "bg-violet-100/80 dark:bg-violet-900/30",
        iconColor: "text-violet-600 dark:text-violet-400",
        cardBg: "bg-violet-50/60 dark:bg-violet-950/15 border-violet-200/30 dark:border-violet-800/30"
      };
    }
    
    // Injetável genérico - Laranja alegre
    if (type === "injectable") {
      return { 
        label: "Injetável", 
        badgeClass: "bg-amber-100/80 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-0",
        iconBg: "bg-amber-100/80 dark:bg-amber-900/30",
        iconColor: "text-amber-600 dark:text-amber-400",
        cardBg: "bg-amber-50/60 dark:bg-amber-950/15 border-amber-200/30 dark:border-amber-800/30"
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
