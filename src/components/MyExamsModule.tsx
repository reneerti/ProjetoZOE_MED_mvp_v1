import { ArrowLeft, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Loader2, Upload, Camera, Trash2, Eye, FileText, Activity, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientAnalysisView } from "./PatientAnalysisView";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageCompression";
import { ImagePreviewDialog } from "./bioimpedance/ImagePreviewDialog";
import { UploadStatsDialog } from "./bioimpedance/UploadStatsDialog";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals" | "resources" | "supplements" | "exam-charts" | "alerts" | "period-comparison";

interface MyExamsModuleProps {
  onNavigate: (view: View) => void;
}

interface ExamResult {
  parameter_name: string;
  value: number | null;
  value_text: string | null;
  unit: string | null;
  status: string | null;
}

interface ExamImage {
  id: string;
  exam_date: string | null;
  lab_name: string | null;
  created_at: string;
  exam_category_id: string | null;
  exam_type_id: string | null;
  exam_categories: { name: string; icon: string } | null;
  exam_types: { name: string } | null;
  results: ExamResult[];
}

interface GroupedExam {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  exams: ExamImage[];
}

export const MyExamsModule = ({ onNavigate }: MyExamsModuleProps) => {
  const [groupedExams, setGroupedExams] = useState<GroupedExam[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadedExams, setUploadedExams] = useState<any[]>([]);
  const [patientAnalysis, setPatientAnalysis] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("upload");
  const [analyzing, setAnalyzing] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadGroupedExams();
    loadUploadedExams();
    loadPatientAnalysis();

    // Escutar mudanças em tempo real nos exames
    const channel = supabase
      .channel('exam-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'exam_images',
          filter: `processing_status=eq.completed`
        },
        async (payload) => {
          console.log('Exam processed:', payload);
          toast.info("Novo exame processado! Atualizando análise...");
          
          // Recarregar lista de exames
          await loadUploadedExams();
          await loadGroupedExams();
          
          // Executar análise automática
          try {
            const { error } = await supabase.functions.invoke('analyze-exams-integrated');
            if (!error) {
              await loadPatientAnalysis();
              toast.success("Análise atualizada automaticamente!");
            }
          } catch (error) {
            console.error('Error auto-analyzing:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadGroupedExams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar exames com categorias e resultados
      const { data: examImages, error: examError } = await supabase
        .from('exam_images')
        .select(`
          id,
          exam_date,
          lab_name,
          created_at,
          exam_category_id,
          exam_type_id,
          processing_status,
          exam_categories (name, icon),
          exam_types (name)
        `)
        .eq('user_id', user.id)
        .eq('processing_status', 'completed')
        .order('exam_date', { ascending: false });

      if (examError) throw examError;

      // Buscar resultados
      const examIds = examImages?.map(e => e.id) || [];
      const { data: results } = await supabase
        .from('exam_results')
        .select('exam_image_id, parameter_name, value, value_text, unit, status')
        .in('exam_image_id', examIds);

      // Agrupar por categoria
      const grouped: Record<string, GroupedExam> = {};

      examImages?.forEach((exam: any) => {
        const categoryId = exam.exam_category_id || 'uncategorized';
        const categoryName = exam.exam_categories?.name || 'Sem categoria';
        const categoryIcon = exam.exam_categories?.icon || '📄';

        if (!grouped[categoryId]) {
          grouped[categoryId] = {
            categoryId,
            categoryName,
            categoryIcon,
            exams: []
          };
        }

        const examResults = results?.filter(r => r.exam_image_id === exam.id) || [];
        
        grouped[categoryId].exams.push({
          ...exam,
          results: examResults
        });
      });

      setGroupedExams(Object.values(grouped));
    } catch (error) {
      console.error('Error loading grouped exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (categoryId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const getComparisonStatus = (exams: ExamImage[], parameterName: string) => {
    const examsWithParam = exams
      .filter(e => e.results.some(r => r.parameter_name === parameterName && r.value !== null))
      .sort((a, b) => new Date(a.exam_date || a.created_at).getTime() - new Date(b.exam_date || b.created_at).getTime());

    if (examsWithParam.length < 2) return null;

    const oldest = examsWithParam[0].results.find(r => r.parameter_name === parameterName);
    const newest = examsWithParam[examsWithParam.length - 1].results.find(r => r.parameter_name === parameterName);

    if (!oldest?.value || !newest?.value) return null;

    const oldValue = Number(oldest.value);
    const newValue = Number(newest.value);
    const change = ((newValue - oldValue) / oldValue) * 100;

    // Determinar se a mudança é boa ou ruim baseado no status
    const oldStatus = oldest.status || 'normal';
    const newStatus = newest.status || 'normal';

    if (newStatus === 'normal' && oldStatus !== 'normal') {
      return { type: 'normalized', change, icon: TrendingUp, color: 'text-success' };
    } else if (newStatus === 'normal' && oldStatus === 'normal') {
      return { type: 'stable', change, icon: Minus, color: 'text-muted-foreground' };
    } else if (oldStatus === 'normal' && newStatus !== 'normal') {
      return { type: 'regressed', change, icon: TrendingDown, color: 'text-destructive' };
    } else if (Math.abs(change) < 5) {
      return { type: 'stable', change, icon: Minus, color: 'text-muted-foreground' };
    } else if (newStatus === oldStatus) {
      return { type: 'stable', change, icon: Minus, color: 'text-muted-foreground' };
    }

    return { type: 'changed', change, icon: change > 0 ? TrendingUp : TrendingDown, color: change > 0 ? 'text-warning' : 'text-success' };
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'high':
      case 'low':
        return <Badge variant="destructive" className="text-xs">Alterado</Badge>;
      case 'critical':
        return <Badge variant="destructive" className="text-xs">Crítico</Badge>;
      default:
        return <Badge variant="outline" className="text-xs bg-success-light text-success border-success">Normal</Badge>;
    }
  };

  const loadUploadedExams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: exams, error } = await supabase
        .from('exam_images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

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

  const loadPatientAnalysis = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: analysisData } = await supabase
        .from('health_analysis')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (analysisData?.analysis_summary && typeof analysisData.analysis_summary === 'object') {
        const summary = analysisData.analysis_summary as any;
        if (summary.patient_view) {
          setPatientAnalysis(summary.patient_view);
        }
      }
    } catch (error) {
      console.error('Error loading patient analysis:', error);
    }
  };

  const handleFileSelect = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Você precisa estar logado para fazer upload de exames.");
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

  const handleFileUpload = async () => {
    if (!previewFile || !userId) return;

    try {
      setUploading(true);
      const fileExt = previewFile.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Upload da imagem comprimida
      const { error: uploadError } = await supabase.storage
        .from('exam-images')
        .upload(fileName, previewFile);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('exam-images')
        .getPublicUrl(fileName);

      // Inserir registro no banco
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

      toast.success("Upload concluído! Processando automaticamente...");
      
      // Processar OCR automaticamente em background
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
      loadGroupedExams();
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

  const runIntegratedAnalysis = async () => {
    try {
      setAnalyzing(true);
      
      const { error } = await supabase.functions.invoke('analyze-exams-integrated');
      
      if (error) throw error;
      
      await loadPatientAnalysis();
      toast.success("Análise atualizada!");
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error("Erro ao analisar exames");
    } finally {
      setAnalyzing(false);
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
            <h1 className="text-2xl font-bold drop-shadow-md">Meus Exames</h1>
            <p className="text-white/90 text-sm drop-shadow">Upload e análises completas</p>
          </div>
        </div>
      </div>

      <div className="px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Resultados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 mt-0">
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

            {/* Stats Button */}
            <Button 
              variant="outline" 
              onClick={() => setShowStats(true)}
              className="w-full"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Ver Estatísticas de Upload
            </Button>

            {/* Uploaded Exams List */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Exames Enviados</h3>
              {uploadedExams.length === 0 ? (
                <Card className="p-8 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum exame enviado ainda.</p>
                  <p className="text-sm text-muted-foreground mt-1">Use os botões acima para fazer upload.</p>
                </Card>
              ) : (
                uploadedExams.map((exam) => (
                  <Card key={exam.id} className="overflow-hidden">
                    <div className="flex items-center gap-3 p-4">
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
                        <p className="font-medium text-sm text-foreground truncate">
                          {exam.exam_date 
                            ? new Date(exam.exam_date).toLocaleDateString('pt-BR')
                            : new Date(exam.created_at).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {exam.lab_name || 'Laboratório não informado'}
                        </p>
                        <div className="mt-2">
                          {getProcessingStatusBadge(exam.processing_status)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {exam.preview_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(exam.preview_url, '_blank')}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteExam(exam.id, exam.image_url)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-4 mt-0">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Análise de Resultados</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate("period-comparison")}
                  disabled={groupedExams.length === 0}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Comparar Períodos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={runIntegratedAnalysis}
                  disabled={analyzing}
                >
                  {analyzing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Activity className="w-4 h-4 mr-2" />
                  )}
                  Atualizar
                </Button>
              </div>
            </div>

            {patientAnalysis ? (
              <PatientAnalysisView patientView={patientAnalysis} />
            ) : (
              <Card className="p-8 text-center">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-2">Nenhuma análise disponível ainda.</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Faça upload de exames e clique no botão abaixo para gerar a análise completa.
                </p>
                <Button 
                  onClick={runIntegratedAnalysis} 
                  disabled={analyzing}
                  className="bg-gradient-primary"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Activity className="w-4 h-4 mr-2" />
                      Gerar Análise Completa
                    </>
                  )}
                </Button>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
