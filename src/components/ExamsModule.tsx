import { ArrowLeft, Upload, Camera, FileText, AlertCircle, Loader2, History, CheckCircle, XCircle, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
import { format } from "date-fns";
import { ExamHistoryModal } from "./ExamHistoryModal";
import { compressImage } from "@/lib/imageCompression";
import { ImagePreviewDialog } from "./bioimpedance/ImagePreviewDialog";
import { UploadStatsDialog } from "./bioimpedance/UploadStatsDialog";
import { useSubscription } from "@/hooks/useSubscription";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ExamUploadDialog } from "./bioimpedance/ExamUploadDialog";
import type { ExamMetadata } from "@/lib/validation";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals" | "resources" | "supplements" | "exam-charts" | "alerts" | "period-comparison" | "admin" | "controller";

interface ExamsModuleProps {
  onNavigate: (view: View) => void;
}

export const ExamsModule = ({ onNavigate }: ExamsModuleProps) => {
  const { toast } = useToast();
  const { checkExamLimit, incrementExamCount } = useSubscription();
  const [uploading, setUploading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [limitMessage, setLimitMessage] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para fazer upload de exames.",
        variant: "destructive",
      });
      return;
    }

    // Verificar limite de exames
    const limitCheck = checkExamLimit();
    if (!limitCheck.allowed) {
      setLimitMessage(limitCheck.message || "Limite de exames atingido");
      setShowLimitDialog(true);
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Erro",
        description: "Apenas imagens (JPG, PNG, WEBP) ou PDF são aceitos.",
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

    setUserId(user.id);
    setOriginalSize(file.size);
    setPreviewUrl(URL.createObjectURL(file));
    setPreviewFile(file);
    setShowUploadDialog(true);
    setIsCompressing(true);

    // Compress in background
    try {
      const compressed = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        maxSizeMB: 2
      });
      setPreviewFile(compressed);
      setCompressedSize(compressed.size);
    } catch (error) {
      console.error('Compression error:', error);
      setCompressedSize(file.size);
    } finally {
      setIsCompressing(false);
    }
  };


  const handleFileUpload = async (metadata: ExamMetadata) => {
    if (!previewFile) return;
    
    try {
      setUploading(true);
      setShowUploadDialog(false);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      toast({
        title: "Enviando...",
        description: "Fazendo upload do exame comprimido",
      });

      const fileExt = previewFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('exam-images')
        .upload(fileName, previewFile);

      if (uploadError) throw uploadError;

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('exam-images')
        .createSignedUrl(fileName, 3600);

      if (signedUrlError) throw signedUrlError;

      const examDate = metadata.examDate 
        ? format(metadata.examDate, 'yyyy-MM-dd') 
        : new Date().toISOString().split('T')[0];

      const { data: newExam, error: insertError } = await supabase
        .from('exam_images')
        .insert({
          user_id: user.id,
          image_url: fileName,
          processing_status: 'pending',
          requesting_doctor: metadata.requestingDoctor,
          reporting_doctor: metadata.reportingDoctor,
          exam_date: examDate,
          upload_date: new Date().toISOString(),
          file_type: previewFile.type.includes('pdf') ? 'pdf' : 'image'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Increment exam count
      await incrementExamCount();

      toast({
        title: "Sucesso!",
        description: "Exame enviado. Processando OCR e analisando...",
      });

      const { data: { session } } = await supabase.auth.getSession();

      // Process OCR and trigger integrated analysis
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
          .then(async ({ error: ocrError }) => {
            if (ocrError) {
              console.error('OCR processing error');
              toast({
                title: "Aviso",
                description: "Erro ao processar OCR. Tente novamente.",
                variant: "destructive",
              });
              return;
            }

            // After OCR, trigger integrated analysis to update health score
            toast({
              title: "Análise em andamento",
              description: "Analisando exame e atualizando índice de saúde...",
            });

            const { error: analysisError } = await supabase.functions.invoke('analyze-exams-integrated', {
              headers: {
                Authorization: `Bearer ${session.access_token}`
              }
            });

            if (analysisError) {
              console.error('Analysis error:', analysisError);
            } else {
              toast({
                title: "Análise concluída!",
                description: "Exame processado e índice de saúde atualizado",
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
      handleFileSelect(file);
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
      <UploadStatsDialog open={showStats} onOpenChange={setShowStats} userId={userId} />
      <ExamUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        fileName={previewFile?.name}
        onConfirm={handleFileUpload}
      />
      <ImagePreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        imageUrl={previewUrl}
        fileName={previewFile?.name || ""}
        originalSize={originalSize}
        compressedSize={compressedSize}
        isCompressing={isCompressing}
        onConfirm={() => setShowUploadDialog(true)}
        onCancel={() => {
          setShowPreview(false);
          setPreviewFile(null);
          setPreviewUrl("");
        }}
      />
      
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

      <div className="px-6 space-y-4 mt-10">
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

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowHistory(true)}
            className="flex-1"
          >
            <History className="w-4 h-4 mr-2" />
            Histórico
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowStats(true)}
            className="flex-1"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Estatísticas
          </Button>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowHistory(true)}
            className="flex-1"
          >
            <History className="w-4 h-4 mr-2" />
            Histórico
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowStats(true)}
            className="flex-1"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Estatísticas
          </Button>
        </div>

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

      <AlertDialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limite de Exames Atingido</AlertDialogTitle>
            <AlertDialogDescription>
              {limitMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowLimitDialog(false)}>
              Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
