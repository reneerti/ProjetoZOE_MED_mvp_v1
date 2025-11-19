import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

interface MedicationHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medication: any;
}

export const MedicationHistoryDialog = ({ open, onOpenChange, medication }: MedicationHistoryDialogProps) => {
  if (!medication) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico - {medication.medication_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="p-4 bg-muted/30">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Dose Atual</p>
                <p className="font-semibold">{medication.current_dose}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Início</p>
                <p className="font-semibold">
                  {new Date(medication.start_date).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground mb-1">Status</p>
                <Badge variant={medication.active ? "default" : "secondary"}>
                  {medication.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </div>
          </Card>

          {medication.notes && (
            <Card className="p-4">
              <p className="text-sm text-muted-foreground mb-2">Observações</p>
              <p className="text-sm">{medication.notes}</p>
            </Card>
          )}

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Evolução de Doses</h3>
            <Card className="p-4">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">{medication.current_dose}</p>
                  <p className="text-xs text-muted-foreground">
                    Desde {new Date(medication.start_date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
