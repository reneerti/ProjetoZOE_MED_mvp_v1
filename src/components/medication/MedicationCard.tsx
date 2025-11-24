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
    if (type === "glp1") return { label: "GLP-1", badgeClass: "bg-accent/10 text-accent", iconBg: "bg-accent/10", iconColor: "text-accent" };
    if (type === "injectable") return { label: "Injetável", badgeClass: "bg-success/10 text-success", iconBg: "bg-success/10", iconColor: "text-success" };
    return { label: "Oral", badgeClass: "bg-muted text-muted-foreground", iconBg: "bg-primary/5", iconColor: "text-primary" };
  };

  const typeInfo = getMedicationType();

  const isMonjaro = medication.medication_name.toLowerCase().includes('monjaro');

  return (
    <Card 
      className={`p-4 hover:shadow-md transition-all ${isMonjaro ? 'cursor-pointer hover:border-accent' : ''}`}
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
