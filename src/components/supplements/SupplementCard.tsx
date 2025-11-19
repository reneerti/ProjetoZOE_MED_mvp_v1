import { useState } from "react";
import { Pill, Clock, Calendar, MoreVertical, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SupplementCardProps {
  supplement: any;
  onUpdate: () => void;
  onViewHistory: () => void;
}

export const SupplementCard = ({ supplement, onUpdate, onViewHistory }: SupplementCardProps) => {
  const { toast } = useToast();
  const [logging, setLogging] = useState(false);

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      vitamina: "bg-blue-500/10 text-blue-600",
      mineral: "bg-green-500/10 text-green-600",
      proteina: "bg-purple-500/10 text-purple-600",
      aminoacido: "bg-orange-500/10 text-orange-600",
      outros: "bg-gray-500/10 text-gray-600",
    };
    return colors[type] || colors.outros;
  };

  const handleLogIntake = async () => {
    setLogging(true);
    try {
      const { error } = await supabase
        .from("supplement_logs")
        .insert({
          supplement_id: supplement.id,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          dose_taken: supplement.current_dose,
        });

      if (error) throw error;

      toast({
        title: "Registrado",
        description: `${supplement.supplement_name} marcado como tomado`,
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLogging(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      const { error } = await supabase
        .from("supplements")
        .update({ active: false })
        .eq("id", supplement.id);

      if (error) throw error;

      toast({
        title: "Suplemento desativado",
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Pill className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">{supplement.supplement_name}</h3>
              <Badge variant="secondary" className={`text-xs ${getTypeColor(supplement.supplement_type)}`}>
                {supplement.supplement_type}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {supplement.current_dose} {supplement.unit} • {supplement.frequency}
            </p>
            {supplement.time_of_day && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {supplement.time_of_day}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleLogIntake}
            disabled={logging}
            className="h-8 gap-2"
          >
            <Check className="w-4 h-4" />
            Tomei
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onViewHistory}>
                <Calendar className="w-4 h-4 mr-2" />
                Ver Histórico
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDeactivate} className="text-destructive">
                Desativar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
};
