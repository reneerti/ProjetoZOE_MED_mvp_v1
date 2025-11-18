import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface GoalCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const GoalCreateDialog = ({ open, onOpenChange, onSuccess }: GoalCreateDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [goalType, setGoalType] = useState<string>("");
  const [targetValue, setTargetValue] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");
  const [currentValue, setCurrentValue] = useState<number | null>(null);

  useEffect(() => {
    if (open && goalType) {
      fetchCurrentValue();
    }
  }, [open, goalType]);

  const fetchCurrentValue = async () => {
    try {
      const { data, error } = await supabase
        .from('bioimpedance_measurements')
        .select('*')
        .eq('user_id', user?.id)
        .order('measurement_date', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        switch (goalType) {
          case 'weight':
            setCurrentValue(Number(data.weight));
            break;
          case 'body_fat':
            setCurrentValue(data.body_fat_percentage ? Number(data.body_fat_percentage) : null);
            break;
          case 'muscle_mass':
            setCurrentValue(data.muscle_mass ? Number(data.muscle_mass) : null);
            break;
          case 'water':
            setCurrentValue(data.water_percentage ? Number(data.water_percentage) : null);
            break;
        }
      }
    } catch (error) {
      console.error("Error fetching current value:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!goalType || !targetValue || !targetDate) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!currentValue) {
      toast.error("Você precisa ter pelo menos uma medição de bioimpedância para criar uma meta");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('body_composition_goals')
        .insert({
          user_id: user?.id,
          goal_type: goalType,
          target_value: Number(targetValue),
          start_value: currentValue,
          current_value: currentValue,
          target_date: targetDate,
          notes: notes || null,
          status: 'active'
        });

      if (error) throw error;

      toast.success("Meta criada com sucesso!");
      onSuccess();
      resetForm();
    } catch (error) {
      console.error("Error creating goal:", error);
      toast.error("Erro ao criar meta");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setGoalType("");
    setTargetValue("");
    setTargetDate("");
    setNotes("");
    setCurrentValue(null);
  };

  const getGoalTypeUnit = (type: string) => {
    const units: Record<string, string> = {
      weight: 'kg',
      body_fat: '%',
      muscle_mass: 'kg',
      water: '%'
    };
    return units[type] || '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Meta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="goalType">Tipo de Meta *</Label>
            <Select value={goalType} onValueChange={setGoalType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weight">Peso Corporal</SelectItem>
                <SelectItem value="body_fat">Gordura Corporal</SelectItem>
                <SelectItem value="muscle_mass">Massa Muscular</SelectItem>
                <SelectItem value="water">Hidratação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {currentValue !== null && (
            <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
              <div className="text-sm text-muted-foreground mb-1">Valor Atual:</div>
              <div className="text-lg font-semibold text-foreground">
                {currentValue}{getGoalTypeUnit(goalType)}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="targetValue">Valor Meta * ({getGoalTypeUnit(goalType)})</Label>
            <Input
              id="targetValue"
              type="number"
              step="0.1"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder={`Ex: ${goalType === 'weight' ? '70' : goalType === 'body_fat' ? '15' : '40'}`}
              required
            />
          </div>

          <div>
            <Label htmlFor="targetDate">Data Alvo *</Label>
            <Input
              id="targetDate"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Foco em dieta balanceada e treino 3x/semana"
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Criando..." : "Criar Meta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
