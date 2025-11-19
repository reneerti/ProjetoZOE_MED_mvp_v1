import { ArrowLeft, Upload, Camera, FileText, AlertCircle, Loader2, History, CheckCircle, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
import { ExamHistoryModal } from "./ExamHistoryModal";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals";

interface ExamsModuleProps {
  onNavigate: (view: View) => void;
}

export const ExamsModule = ({ onNavigate }: ExamsModuleProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para fazer upload de exames.",
          variant: "destructive",
        });
        return;
      }

      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Erro",
          description: "Apenas imagens nos formatos JPG, PNG ou WEBP são aceitas.",
          variant: "destructive",
        });
        return;
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: "Erro",
          description: "Arquivo muito grande. O tamanho máximo é 10MB.",
          variant: "destructive",
        });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('exam-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('exam-images')
        .createSignedUrl(fileName, 3600);

      if (signedUrlError) throw signedUrlError;

      const { data: newExam, error: insertError } = await supabase
        .from('exam_images')
        .insert({
          user_id: user.id,
          image_url: fileName,
          processing_status: 'pending'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: "Sucesso!",
        description: "Exame enviado. Processando OCR...",
      });

      const { data: { session } } = await supabase.auth.getSession();

      if (newExam && session) {
        supabase.functions
          .invoke('process-ocr', {
            body: {
              imageUrl: signedUrlData.signedUrl,
              examImageId: newExam.id
            },
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          })
          .then(({ error: ocrError }) => {
            if (ocrError) {
              console.error('OCR processing error');
              toast({
                title: "Aviso",
                description: "Erro ao processar OCR. Tente novamente.",
                variant: "destructive",
              });
            }
          });
      }
    } catch (error: any) {
      console.error('Error uploading file');
      toast({
        title: "Erro no upload",
        description: error.message || "Não foi possível enviar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
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
    } catch (error) {
      console.error('Error deleting exam');
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
            <div className="relative">
              <Progress value={65} className="h-1.5" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </div>
        );
      case "failed":
        return (
          <div className="flex flex-col gap-2 w-full">
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-destructive-light text-destructive font-medium w-fit">
              <XCircle className="w-3 h-3" />
              Erro no processamento
            </span>
            <Progress value={0} className="h-1.5 bg-destructive-light" />
          </div>
        );
      default:
        return (
          <div className="flex flex-col gap-2 w-full">
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium w-fit">
              <AlertCircle className="w-3 h-3" />
              Aguardando processamento
            </span>
            <Progress value={15} className="h-1.5" />
          </div>
        );
    }
  };

  return (
    <div className="animate-fade-in pb-24">
      <ExamHistoryModal open={showHistory} onOpenChange={setShowHistory} />
      
      <div className="sticky top-0 z-50 bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate("dashboard")}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2.4} />
          </button>
          <div>
            <h1 className="text-2xl font-bold drop-shadow-md">Upload de Exames</h1>
            <p className="text-white/90 text-sm drop-shadow">Enviar novas imagens</p>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-4 mt-6">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Button 
            onClick={handleCameraClick}
            disabled={uploading}
            className="h-auto py-4 flex flex-col items-center gap-2 bg-gradient-primary hover:opacity-90"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Camera className="w-6 h-6" />
            )}
            <span className="text-sm">Tirar Foto</span>
          </Button>
          <Button 
            onClick={handleFileClick}
            disabled={uploading}
            variant="secondary" 
            className="h-auto py-4 flex flex-col items-center gap-2"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
            <span className="text-sm">Upload Imagem</span>
          </Button>
        </div>

        <Button
          onClick={() => setShowHistory(true)}
          variant="outline"
          className="w-full"
        >
          <History className="w-4 h-4 mr-2" />
          Ver Histórico de Uploads
        </Button>

        <Card className="p-4 border-l-4 border-l-primary mt-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertCircle className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Como funciona</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Faça upload ou tire foto dos seus exames. Após o processamento OCR, acesse <strong>Meus Exames</strong> no dashboard para ver as análises agrupadas e comparativos temporais.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
