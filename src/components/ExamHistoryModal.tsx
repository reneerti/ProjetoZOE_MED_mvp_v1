import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileText, CheckCircle, AlertCircle, XCircle, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

interface ExamHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExamHistoryModal = ({ open, onOpenChange }: ExamHistoryModalProps) => {
  const { toast } = useToast();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadExams();
    }
  }, [open]);

  const loadExams = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('exam_images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const examsWithUrls = await Promise.all(
        (data || []).map(async (exam) => {
          const { data: signedUrl } = await supabase.storage
            .from('exam-images')
            .createSignedUrl(exam.image_url, 3600);
          
          return {
            ...exam,
            signed_url: signedUrl?.signedUrl || null,
          };
        })
      );

      setExams(examsWithUrls);
    } catch (error) {
      console.error('Error loading exams:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async (examId: string, imageUrl: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: storageError } = await supabase.storage
        .from('exam-images')
        .remove([imageUrl]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('exam_images')
        .delete()
        .eq('id', examId)
        .eq('user_id', user.id);

      if (dbError) throw dbError;

      toast({
        title: "Sucesso!",
        description: "Exame excluído com sucesso.",
      });

      await loadExams();
    } catch (error) {
      console.error('Error deleting exam:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o exame.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <div className="flex flex-col gap-2 w-full">
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-success-light text-success font-medium w-fit">
              <CheckCircle className="w-3 h-3" />
              Processado
            </span>
            <Progress value={100} className="h-1.5" />
          </div>
        );
      case "processing":
        return (
          <div className="flex flex-col gap-2 w-full">
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-warning-light text-warning font-medium w-fit">
              <Loader2 className="w-3 h-3 animate-spin" />
              Processando OCR...
            </span>
            <Progress value={65} className="h-1.5" />
          </div>
        );
      case "failed":
        return (
          <div className="flex flex-col gap-2 w-full">
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-destructive-light text-destructive font-medium w-fit">
              <XCircle className="w-3 h-3" />
              Erro
            </span>
            <Progress value={0} className="h-1.5 bg-destructive-light" />
          </div>
        );
      default:
        return (
          <div className="flex flex-col gap-2 w-full">
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium w-fit">
              <AlertCircle className="w-3 h-3" />
              Pendente
            </span>
            <Progress value={15} className="h-1.5" />
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Histórico de Uploads</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : exams.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum upload encontrado.</p>
            </div>
          ) : (
            <div className="space-y-3 p-1">
              {exams.map((exam) => (
                <Card key={exam.id} className="p-4">
                  <div className="flex flex-col gap-3">
                    {exam.signed_url && (
                      <div className="relative">
                        <img
                          src={exam.signed_url}
                          alt="Exam preview"
                          className="w-full h-48 object-cover rounded-md"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg"
                          onClick={() => handleDeleteExam(exam.id, exam.image_url)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground mb-1">Exame</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {new Date(exam.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        {getStatusBadge(exam.processing_status)}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
