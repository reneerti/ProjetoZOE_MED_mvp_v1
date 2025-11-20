import { ArrowLeft, Upload, Camera, Trash2, Eye, FileText, Loader2, BarChart3, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageCompression";
import { ImagePreviewDialog } from "./bioimpedance/ImagePreviewDialog";
import { UploadStatsDialog } from "./bioimpedance/UploadStatsDialog";
import { useSubscription } from "@/hooks/useSubscription";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { View } from "@/types/views";
import { format } from "date-fns";

interface ExamUploadModuleProps {
  onNavigate: (view: View) => void;
}

export const ExamUploadModule = ({ onNavigate }: ExamUploadModuleProps) => {
  const { checkExamLimit, incrementExamCount } = useSubscription();
  const [uploading, setUploading] = useState(false);
  const [uploadedExams, setUploadedExams] = useState<any[]>([]);
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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUploadedExams();
    getUserId();
  }, []);

  const getUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  };

  const loadUploadedExams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: exams, error } = await supabase
        .from('exam_images')
        .select('*')
        .eq('user_id', user.id)
        .order('exam_date', { ascending: false });

      if (error) throw error;

      const examsWithUrls = await Promise.all(
        (exams || []).map(async (exam) => {
          const { data: signedUrl } = await supabase.storage
            .from('exam-images')
            .createSignedUrl(exam.image_url, 3600);

          return {
            ...exam,
            preview_url: signedUrl?.signedUrl || null
          };
        })
      );

      setUploadedExams(examsWithUrls);
    } catch (error) {
      console.error('Error loading uploaded exams:', error);
    }
  };

  const handleFileSelect = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Você precisa estar logado para fazer upload de exames.");
      return;
    }

    const limitCheck = checkExamLimit();
    if (!limitCheck.allowed) {
      setLimitMessage(limitCheck.message || "Limite de exames atingido");
      setShowLimitDialog(true);
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error("Apenas imagens nos formatos JPG, PNG ou WEBP são aceitas.");
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Arquivo muito grande. O tamanho máximo é 10MB.");
      return;
    }

    setUserId(user.id);
    setOriginalSize(file.size);
    setPreviewUrl(URL.createObjectURL(file));
    setPreviewFile(file);
    setShowPreview(true);
    setIsCompressing(true);

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

  const handleFileUpload = async () => {
    if (!previewFile || !userId) return;

    try {
      setUploading(true);
      const fileExt = previewFile.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('exam-images')
        .upload(fileName, previewFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('exam-images')
        .getPublicUrl(fileName);

      const { data: examImage, error: insertError } = await supabase
        .from('exam_images')
        .insert({
          user_id: userId,
          image_url: publicUrl,
          processing_status: 'processing'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await incrementExamCount();
      toast.success("Upload concluído! Processando automaticamente...");
      
      supabase.functions.invoke('process-ocr', {
        body: {
          imageUrl: publicUrl,
          examImageId: examImage.id
        }
      }).then(({ error: ocrError }) => {
        if (ocrError) {
          console.error('OCR Error:', ocrError);
        }
      });

      await loadUploadedExams();
      setShowPreview(false);
      setPreviewFile(null);
      setPreviewUrl("");
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error("Erro ao fazer upload: " + error.message);
    } finally {
      setUploading(false);
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

      toast.success("Exame excluído com sucesso.");
      loadUploadedExams();
    } catch (error) {
      console.error('Error deleting exam');
      toast.error("Não foi possível excluir o exame.");
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

  const getProcessingStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="text-xs bg-success text-success-foreground">Processado</Badge>;
      case "processing":
        return <Badge className="text-xs bg-warning text-warning-foreground">Processando</Badge>;
      case "failed":
        return <Badge variant="destructive" className="text-xs">Erro</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Aguardando</Badge>;
    }
  };

  return (
    <div className="animate-fade-in pb-24">
      <UploadStatsDialog open={showStats} onOpenChange={setShowStats} userId={userId} />
      <ImagePreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        imageUrl={previewUrl}
        fileName={previewFile?.name || ""}
        originalSize={originalSize}
        compressedSize={compressedSize}
        isCompressing={isCompressing}
        onConfirm={handleFileUpload}
        onCancel={() => {
          setShowPreview(false);
          setPreviewFile(null);
          setPreviewUrl("");
        }}
      />
      
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
        {/* Upload Buttons */}
        <div className="grid grid-cols-2 gap-3">
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

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            onClick={() => setShowStats(true)}
            className="w-full"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Estatísticas
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onNavigate("exams-by-date")}
            className="w-full"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Ver por Data
          </Button>
        </div>

        {/* Uploaded Exams List - Grouped by Date */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Exames Enviados</h3>
          {uploadedExams.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum exame enviado ainda.</p>
              <p className="text-sm text-muted-foreground mt-1">Use os botões acima para fazer upload.</p>
            </Card>
          ) : (
            (() => {
              const examsByDate = uploadedExams.reduce((acc, exam) => {
                const dateKey = exam.exam_date 
                  ? format(new Date(exam.exam_date), 'dd/MM/yyyy')
                  : 'Sem data';
                
                if (!acc[dateKey]) {
                  acc[dateKey] = [];
                }
                acc[dateKey].push(exam);
                return acc;
              }, {} as Record<string, typeof uploadedExams>);

              const sortedDates = Object.keys(examsByDate).sort((a, b) => {
                if (a === 'Sem data') return 1;
                if (b === 'Sem data') return -1;
                const dateA = a.split('/').reverse().join('-');
                const dateB = b.split('/').reverse().join('-');
                return dateB.localeCompare(dateA);
              });

              return sortedDates.map((date) => (
                <div key={date} className="space-y-2">
                  <div className="flex items-center gap-2 px-2 py-1">
                    <div className="w-8 h-8 rounded-full bg-[#3B82F6]/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-[#3B82F6]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">{date}</h4>
                      <p className="text-xs text-muted-foreground">
                        {examsByDate[date].length} {examsByDate[date].length === 1 ? 'exame' : 'exames'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 pl-4 border-l-2 border-[#3B82F6]/20">
                    {examsByDate[date].map((exam) => (
                      <Card key={exam.id} className="overflow-hidden">
                        <div className="flex items-center gap-3 p-3">
                          {exam.preview_url && (
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                              <img 
                                src={exam.preview_url} 
                                alt="Preview" 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground">
                              {exam.lab_name || 'Laboratório não informado'}
                            </p>
                            {exam.requesting_doctor && (
                              <p className="text-xs text-muted-foreground">
                                Médico: {exam.requesting_doctor}
                              </p>
                            )}
                            <div className="mt-1">
                              {getProcessingStatusBadge(exam.processing_status)}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {exam.preview_url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => window.open(exam.preview_url, '_blank')}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteExam(exam.id, exam.image_url)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ));
            })()
          )}
        </div>
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
