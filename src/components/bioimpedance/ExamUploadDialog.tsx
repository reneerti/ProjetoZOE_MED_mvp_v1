import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ExamUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (requestingDoctor?: string, reportingDoctor?: string, examDate?: string) => void;
  fileName?: string;
}

export const ExamUploadDialog = ({ open, onOpenChange, onConfirm, fileName }: ExamUploadDialogProps) => {
  const [requestingDoctor, setRequestingDoctor] = useState("");
  const [reportingDoctor, setReportingDoctor] = useState("");
  const [examDate, setExamDate] = useState<Date>();

  const handleConfirm = () => {
    onConfirm(
      requestingDoctor || undefined,
      reportingDoctor || undefined,
      examDate ? format(examDate, "yyyy-MM-dd") : undefined
    );
    onOpenChange(false);
    setRequestingDoctor("");
    setReportingDoctor("");
    setExamDate(undefined);
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
            <Label htmlFor="requesting">Médico Solicitante</Label>
            <Input
              id="requesting"
              placeholder="Nome do médico que solicitou"
              value={requestingDoctor}
              onChange={(e) => setRequestingDoctor(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reporting">Médico Laudador</Label>
            <Input
              id="reporting"
              placeholder="Nome do médico laudador"
              value={reportingDoctor}
              onChange={(e) => setReportingDoctor(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Data do Exame</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {examDate ? format(examDate, "PPP", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={examDate}
                  onSelect={setExamDate}
                  locale={ptBR}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
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
