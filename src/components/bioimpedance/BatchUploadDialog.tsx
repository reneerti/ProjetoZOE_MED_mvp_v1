import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useState } from "react";

interface UploadItem {
  file: File;
  status: 'pending' | 'processing' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface BatchUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
  processFile: (file: File) => Promise<void>;
}

export const BatchUploadDialog = ({ 
  open, 
  onOpenChange, 
  onUploadComplete,
  processFile 
}: BatchUploadDialogProps) => {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => 
      ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(f.type)
    );

    setUploads(validFiles.map(file => ({
      file,
      status: 'pending',
      progress: 0
    })));
  };

  const processAllFiles = async () => {
    setIsProcessing(true);

    for (let i = 0; i < uploads.length; i++) {
      setUploads(prev => prev.map((item, idx) => 
        idx === i ? { ...item, status: 'processing', progress: 50 } : item
      ));

      try {
        await processFile(uploads[i].file);
        
        setUploads(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'success', progress: 100 } : item
        ));
      } catch (error) {
        setUploads(prev => prev.map((item, idx) => 
          idx === i ? { 
            ...item, 
            status: 'error', 
            progress: 100,
            error: error instanceof Error ? error.message : 'Erro ao processar'
          } : item
        ));
      }

      // Small delay between uploads to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 6500)); // ~6.5s = safe for 10/min limit
    }

    setIsProcessing(false);
    onUploadComplete();
  };

  const getStatusIcon = (status: UploadItem['status']) => {
    switch (status) {
      case 'pending':
        return <Upload className="h-4 w-4 text-muted-foreground" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const totalProgress = uploads.length > 0
    ? uploads.reduce((acc, item) => acc + item.progress, 0) / uploads.length
    : 0;

  const successCount = uploads.filter(u => u.status === 'success').length;
  const errorCount = uploads.filter(u => u.status === 'error').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Upload em Lote de Medições</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {uploads.length === 0 ? (
            <div className="text-center py-8">
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFilesSelect}
                  className="hidden"
                />
                <div className="space-y-3">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Selecione múltiplas imagens</p>
                    <p className="text-sm text-muted-foreground">
                      JPG, PNG ou PDF • Até 10 arquivos
                    </p>
                  </div>
                </div>
              </label>
            </div>
          ) : (
            <>
              {/* Overall Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Progresso Geral</span>
                  <span className="text-muted-foreground">
                    {successCount + errorCount}/{uploads.length} processados
                  </span>
                </div>
                <Progress value={totalProgress} className="h-2" />
                {successCount > 0 && (
                  <p className="text-xs text-green-600">✓ {successCount} sucesso</p>
                )}
                {errorCount > 0 && (
                  <p className="text-xs text-red-600">✗ {errorCount} erro(s)</p>
                )}
              </div>

              {/* Individual Files */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {uploads.map((upload, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border"
                  >
                    {getStatusIcon(upload.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{upload.file.name}</p>
                      {upload.error && (
                        <p className="text-xs text-red-500">{upload.error}</p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {upload.progress}%
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {!isProcessing && successCount + errorCount < uploads.length && (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setUploads([]);
                        onOpenChange(false);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
                      onClick={processAllFiles}
                    >
                      Processar Todas
                    </Button>
                  </>
                )}
                
                {!isProcessing && successCount + errorCount === uploads.length && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setUploads([]);
                      onOpenChange(false);
                    }}
                  >
                    Concluir
                  </Button>
                )}
              </div>

              {isProcessing && (
                <div className="text-center text-sm text-muted-foreground">
                  ⏱️ Processando com intervalo de 6s entre uploads (limite de taxa)
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
