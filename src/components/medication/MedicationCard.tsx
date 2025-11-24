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
        badgeClass: "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-0",
        iconBg: "bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/40 dark:to-pink-950/40",
        iconColor: "text-purple-500 dark:text-purple-400",
        cardBg: "bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-100 dark:border-purple-900/30"
      };
    }
    
    // Vitamina B12 - Azul suave
    if (name.includes('b12') || name.includes('b-12')) {
      return { 
        label: "Injetável", 
        badgeClass: "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-0",
        iconBg: "bg-sky-50 dark:bg-sky-950/40",
        iconColor: "text-sky-500 dark:text-sky-400",
        cardBg: "bg-sky-50/50 dark:bg-sky-950/20 border-sky-100 dark:border-sky-900/30"
      };
    }
    
    // Vitaminas gerais - Verde alegre
    if (name.includes('vitamin') || name.includes('multivit') || name.includes('complexo')) {
      return { 
        label: "Oral", 
        badgeClass: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-0",
        iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
        iconColor: "text-emerald-500 dark:text-emerald-400",
        cardBg: "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30"
      };
    }
    
    // GLP-1 genérico - Roxo suave
    if (type === "glp1") {
      return { 
        label: "GLP-1", 
        badgeClass: "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border-0",
        iconBg: "bg-violet-50 dark:bg-violet-950/40",
        iconColor: "text-violet-500 dark:text-violet-400",
        cardBg: "bg-violet-50/50 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/30"
      };
    }
    
    // Injetável genérico - Laranja alegre
    if (type === "injectable") {
      return { 
        label: "Injetável", 
        badgeClass: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-0",
        iconBg: "bg-amber-50 dark:bg-amber-950/40",
        iconColor: "text-amber-500 dark:text-amber-400",
        cardBg: "bg-amber-50/50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30"
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
