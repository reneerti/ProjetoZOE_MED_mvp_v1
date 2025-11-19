import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { examMetadataSchema, type ExamMetadata } from "@/lib/validation";
import { toast } from "sonner";

interface ExamUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (metadata: ExamMetadata) => void;
  fileName?: string;
}

export const ExamUploadDialog = ({ open, onOpenChange, onConfirm, fileName }: ExamUploadDialogProps) => {
  const [requestingDoctor, setRequestingDoctor] = useState("");
  const [reportingDoctor, setReportingDoctor] = useState("");
  const [examDate, setExamDate] = useState<Date>();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleConfirm = () => {
    try {
      // Validate input data
      const validatedData = examMetadataSchema.parse({
        requestingDoctor: requestingDoctor || undefined,
        reportingDoctor: reportingDoctor || undefined,
        examDate: examDate || undefined,
      });

      setErrors({});
      onConfirm(validatedData);
      setRequestingDoctor("");
      setReportingDoctor("");
      setExamDate(undefined);
      onOpenChange(false);
    } catch (error: any) {
      // Handle validation errors
      const fieldErrors: Record<string, string> = {};
      if (error.errors) {
        error.errors.forEach((err: any) => {
          fieldErrors[err.path[0]] = err.message;
        });
      }
      setErrors(fieldErrors);
      toast.error("Por favor, corrija os erros antes de enviar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Informações do Exame</DialogTitle>
          <DialogDescription>
            {fileName ? `Enviando: ${fileName}` : "Adicione informações adicionais (opcional)"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="requesting">Médico Solicitante (opcional)</Label>
            <Input
              id="requesting"
              placeholder="Nome do médico que solicitou"
              value={requestingDoctor}
              onChange={(e) => {
                setRequestingDoctor(e.target.value);
                setErrors({ ...errors, requestingDoctor: "" });
              }}
              className={errors.requestingDoctor ? "border-destructive" : ""}
            />
            {errors.requestingDoctor && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.requestingDoctor}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reporting">Médico Laudador (opcional)</Label>
            <Input
              id="reporting"
              placeholder="Nome do médico laudador"
              value={reportingDoctor}
              onChange={(e) => {
                setReportingDoctor(e.target.value);
                setErrors({ ...errors, reportingDoctor: "" });
              }}
              className={errors.reportingDoctor ? "border-destructive" : ""}
            />
            {errors.reportingDoctor && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.reportingDoctor}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Data do Exame (opcional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !examDate && "text-muted-foreground",
                    errors.examDate && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {examDate ? format(examDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={examDate}
                  onSelect={(date) => {
                    setExamDate(date);
                    setErrors({ ...errors, examDate: "" });
                  }}
                  locale={ptBR}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
            {errors.examDate && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.examDate}
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Enviar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
