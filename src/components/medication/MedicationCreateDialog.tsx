import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { medicationSchema } from "@/lib/validation";

interface MedicationCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const MedicationCreateDialog = ({ open, onOpenChange, onSuccess }: MedicationCreateDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
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
    setErrors({});

    try {
      // Validate input data
      const validatedData = medicationSchema.parse(formData);

      const { error } = await supabase.from('medications').insert({
        user_id: user?.id!,
        medication_name: validatedData.medication_name,
        current_dose: validatedData.current_dose,
        start_date: validatedData.start_date,
        notes: validatedData.notes || null,
        active: true,
        schedule: { type: validatedData.medication_type }
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
    } catch (error: any) {
      console.error("Error creating medication:", error);
      
      // Handle validation errors
      if (error.errors) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          fieldErrors[err.path[0]] = err.message;
        });
        setErrors(fieldErrors);
        toast.error("Por favor, corrija os erros no formulário");
      } else {
        toast.error("Erro ao adicionar medicação");
      }
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
              onChange={(e) => {
                setFormData({ ...formData, medication_name: e.target.value });
                setErrors({ ...errors, medication_name: "" });
              }}
              placeholder="Ex: Monjaro, Ozempic, Vitamina D3"
              className={errors.medication_name ? "border-destructive" : ""}
              required
            />
            {errors.medication_name && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.medication_name}
              </p>
            )}
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
              onChange={(e) => {
                setFormData({ ...formData, current_dose: e.target.value });
                setErrors({ ...errors, current_dose: "" });
              }}
              placeholder="Ex: 2.5mg, 5000 UI, 0.25mg"
              className={errors.current_dose ? "border-destructive" : ""}
              required
            />
            {errors.current_dose && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.current_dose}
              </p>
            )}
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
