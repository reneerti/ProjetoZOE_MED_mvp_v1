import { useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { supplementSchema } from "@/lib/validation";

interface SupplementCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const SupplementCreateDialog = ({ open, onOpenChange, onSuccess }: SupplementCreateDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    supplement_name: "",
    supplement_type: "vitamina",
    current_dose: "",
    unit: "mg",
    frequency: "diario",
    time_of_day: "manha",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Validate input data
      const validatedData = supplementSchema.parse(formData);

      const { error } = await supabase.from("supplements").insert([{
        user_id: user.id,
        supplement_name: validatedData.supplement_name,
        supplement_type: validatedData.supplement_type,
        current_dose: validatedData.current_dose,
        unit: validatedData.unit,
        frequency: validatedData.frequency,
        time_of_day: validatedData.time_of_day || null,
        notes: validatedData.notes || null,
        start_date: new Date().toISOString().split("T")[0],
      }]);

      if (error) throw error;

      toast({
        title: "Suplemento adicionado",
        description: "Seu suplemento foi cadastrado com sucesso",
      });

      onSuccess();
      setFormData({
        supplement_name: "",
        supplement_type: "vitamina",
        current_dose: "",
        unit: "mg",
        frequency: "diario",
        time_of_day: "manha",
        notes: "",
      });
    } catch (error: any) {
      // Handle validation errors
      if (error.errors) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          fieldErrors[err.path[0]] = err.message;
        });
        setErrors(fieldErrors);
        toast({
          title: "Erro de Validação",
          description: "Por favor, corrija os erros no formulário",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Suplemento</DialogTitle>
          <DialogDescription>
            Cadastre um novo suplemento no seu plano
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Suplemento</Label>
            <Input
              id="name"
              value={formData.supplement_name}
              onChange={(e) => {
                setFormData({ ...formData, supplement_name: e.target.value });
                setErrors({ ...errors, supplement_name: "" });
              }}
              placeholder="Ex: Vitamina D3"
              className={errors.supplement_name ? "border-destructive" : ""}
              required
            />
            {errors.supplement_name && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.supplement_name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={formData.supplement_type}
                onValueChange={(value) => setFormData({ ...formData, supplement_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vitamina">Vitamina</SelectItem>
                  <SelectItem value="mineral">Mineral</SelectItem>
                  <SelectItem value="proteina">Proteína</SelectItem>
                  <SelectItem value="aminoacido">Aminoácido</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unidade</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mg">mg</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="ml">ml</SelectItem>
                  <SelectItem value="ui">UI</SelectItem>
                  <SelectItem value="mcg">mcg</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dose">Dosagem</Label>
            <Input
              id="dose"
              type="number"
              value={formData.current_dose}
              onChange={(e) => setFormData({ ...formData, current_dose: e.target.value })}
              placeholder="Ex: 5000"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequência</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diario">Diário</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="conforme_necessario">Conforme necessário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Horário</Label>
              <Select
                value={formData.time_of_day}
                onValueChange={(value) => setFormData({ ...formData, time_of_day: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manha">Manhã</SelectItem>
                  <SelectItem value="tarde">Tarde</SelectItem>
                  <SelectItem value="noite">Noite</SelectItem>
                  <SelectItem value="refeicoes">Com refeições</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas adicionais..."
              rows={3}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Salvando..." : "Adicionar Suplemento"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
