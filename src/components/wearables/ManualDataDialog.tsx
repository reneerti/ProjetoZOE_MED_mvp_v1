import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Activity, Heart, Moon, Flame, Calendar as CalendarIcon, Info, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface ManualDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => Promise<void>;
}

const METRIC_CONFIGS = [
  {
    id: "steps",
    label: "Passos",
    icon: Activity,
    unit: "passos",
    placeholder: "Ex: 8500",
    min: 0,
    max: 100000,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    tip: "Média recomendada: 7.000-10.000 passos/dia",
  },
  {
    id: "heart_rate",
    label: "Frequência Cardíaca",
    icon: Heart,
    unit: "bpm",
    placeholder: "Ex: 72",
    min: 30,
    max: 220,
    color: "text-red-600",
    bgColor: "bg-red-50",
    tip: "Repouso normal: 60-100 bpm",
  },
  {
    id: "sleep_hours",
    label: "Horas de Sono",
    icon: Moon,
    unit: "horas",
    placeholder: "Ex: 7.5",
    min: 0,
    max: 24,
    step: 0.5,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    tip: "Recomendado: 7-9 horas/noite",
  },
  {
    id: "calories",
    label: "Calorias Queimadas",
    icon: Flame,
    unit: "kcal",
    placeholder: "Ex: 2200",
    min: 0,
    max: 10000,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    tip: "Varia com peso, idade e atividade física",
  },
];

export const ManualDataDialog = ({ open, onOpenChange, onSave }: ManualDataDialogProps) => {
  const [date, setDate] = useState<Date>(new Date());
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleValueChange = (id: string, value: string) => {
    setValues(prev => ({ ...prev, [id]: value }));
  };

  const validateValue = (value: string, config: typeof METRIC_CONFIGS[0]): boolean => {
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    if (num < config.min || num > config.max) return false;
    return true;
  };

  const handleSave = async () => {
    // Validar que pelo menos um campo foi preenchido
    const hasData = Object.values(values).some(v => v.trim() !== "");
    if (!hasData) {
      toast.error("Preencha pelo menos um campo");
      return;
    }

    // Validar valores
    for (const [key, value] of Object.entries(values)) {
      if (value.trim() === "") continue;
      const config = METRIC_CONFIGS.find(c => c.id === key);
      if (config && !validateValue(value, config)) {
        toast.error(`${config.label} deve estar entre ${config.min} e ${config.max} ${config.unit}`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const data = {
        date: format(date, "yyyy-MM-dd"),
        steps: values.steps ? parseInt(values.steps) : null,
        heart_rate: values.heart_rate ? parseInt(values.heart_rate) : null,
        sleep_hours: values.sleep_hours ? parseFloat(values.sleep_hours) : null,
        calories: values.calories ? parseInt(values.calories) : null,
      };

      await onSave(data);
      
      // Reset form
      setValues({});
      setDate(new Date());
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving manual data:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <TrendingUp className="w-6 h-6 text-primary" />
            Adicionar Dados Manualmente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              Você pode inserir dados manualmente quando a integração automática não estiver disponível.
              Preencha apenas os campos que você deseja registrar.
            </AlertDescription>
          </Alert>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Data
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => newDate && setDate(newDate)}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {METRIC_CONFIGS.map((config) => {
              const Icon = config.icon;
              const value = values[config.id] || "";
              const isValid = value === "" || validateValue(value, config);

              return (
                <Card key={config.id} className={`${config.bgColor} border-0`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className={`w-5 h-5 ${config.color}`} />
                      <Label className="font-semibold">{config.label}</Label>
                    </div>

                    <div className="space-y-2">
                      <div className="relative">
                        <Input
                          type="number"
                          value={value}
                          onChange={(e) => handleValueChange(config.id, e.target.value)}
                          placeholder={config.placeholder}
                          min={config.min}
                          max={config.max}
                          step={config.step || 1}
                          className={`pr-16 ${!isValid ? "border-red-500" : ""}`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          {config.unit}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground flex items-start gap-1">
                        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {config.tip}
                      </p>

                      {!isValid && value !== "" && (
                        <p className="text-xs text-red-600 font-medium">
                          Valor deve estar entre {config.min} e {config.max} {config.unit}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || Object.values(values).every(v => v.trim() === "")}
          >
            {isSaving ? "Salvando..." : "Salvar Dados"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
