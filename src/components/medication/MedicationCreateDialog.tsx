import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface MedicationCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const MedicationCreateDialog = ({ open, onOpenChange, onSuccess }: MedicationCreateDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    medication_name: "",
    current_dose: "",
    start_date: new Date().toISOString().split('T')[0],
    notes: "",
    medication_type: "oral" as "oral" | "injectable" | "glp1",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('medications').insert({
        user_id: user?.id,
        medication_name: formData.medication_name,
        current_dose: formData.current_dose,
        start_date: formData.start_date,
        notes: formData.notes,
        active: true,
        schedule: { type: formData.medication_type }
      });

      if (error) throw error;

      toast.success("Medicação adicionada com sucesso!");
      onSuccess();
      onOpenChange(false);
      setFormData({
        medication_name: "",
        current_dose: "",
        start_date: new Date().toISOString().split('T')[0],
        notes: "",
        medication_type: "oral",
      });
    } catch (error) {
      console.error("Error creating medication:", error);
      toast.error("Erro ao adicionar medicação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Medicação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="medication_name">Nome da Medicação</Label>
            <Input
              id="medication_name"
              value={formData.medication_name}
              onChange={(e) => setFormData({ ...formData, medication_name: e.target.value })}
              placeholder="Ex: Monjaro, Ozempic, Vitamina D3"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="medication_type">Tipo</Label>
            <Select
              value={formData.medication_type}
              onValueChange={(value: "oral" | "injectable" | "glp1") => 
                setFormData({ ...formData, medication_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oral">Oral</SelectItem>
                <SelectItem value="injectable">Injetável</SelectItem>
                <SelectItem value="glp1">GLP-1 (Monjaro, Ozempic)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_dose">Dose Atual</Label>
            <Input
              id="current_dose"
              value={formData.current_dose}
              onChange={(e) => setFormData({ ...formData, current_dose: e.target.value })}
              placeholder="Ex: 2.5mg, 5000 UI, 0.25mg"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_date">Data de Início</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Horários, frequência, observações médicas..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Salvando..." : "Adicionar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
