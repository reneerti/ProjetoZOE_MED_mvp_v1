import { Upload, Camera, X, Layers, History, Minimize2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { compressImage } from "@/lib/imageCompression";
import { toast } from "sonner";

interface ImageUploadZoneEnhancedProps {
  onFileSelect: (file: File) => void;
  onBatchUpload: () => void;
  onHistoryOpen: () => void;
  uploading: boolean;
}

export const ImageUploadZoneEnhanced = ({ 
  onFileSelect, 
  onBatchUpload,
  onHistoryOpen,
  uploading 
}: ImageUploadZoneEnhancedProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Por favor, selecione apenas arquivos JPG, PNG ou PDF');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB');
      return;
    }

    // Compress image if it's a photo
    let processedFile = file;
    if (file.type.startsWith('image/') && file.type !== 'application/pdf') {
      try {
        toast.info('Comprimindo imagem...', { duration: 2000 });
        processedFile = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.85,
          maxSizeMB: 2
        });
        
        const originalMB = (file.size / (1024 * 1024)).toFixed(2);
        const compressedMB = (processedFile.size / (1024 * 1024)).toFixed(2);
        const savings = (((file.size - processedFile.size) / file.size) * 100).toFixed(0);
        
        if (parseInt(savings) > 10) {
          toast.success(`Imagem comprimida: ${originalMB}MB → ${compressedMB}MB (${savings}% menor)`);
        }
      } catch (error) {
        console.error('Compression error:', error);
        toast.warning('Não foi possível comprimir, usando imagem original');
        processedFile = file;
      }
    }

    setSelectedFile(processedFile);
    
    if (processedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(processedFile);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleProcess = () => {
    if (selectedFile) {
      onFileSelect(selectedFile);
      setPreviewUrl(null);
      setSelectedFile(null);
    }
  };

  const handleCancel = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  if (previewUrl || selectedFile) {
    return (
      <Card className="p-6 border-2 border-primary/20 bg-gradient-to-br from-purple-50/50 to-pink-50/30 dark:from-purple-950/20 dark:to-pink-950/10">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Preview da Imagem</h3>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {previewUrl ? (
            <div className="relative rounded-lg overflow-hidden bg-background border-2 border-border">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-full h-auto max-h-96 object-contain"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center p-8 bg-muted rounded-lg border-2 border-dashed">
              <div className="text-center">
                <Upload className="h-16 w-16 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground font-medium">{selectedFile?.name}</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={handleProcess}
              disabled={uploading}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Processar com IA
                </>
              )}
            </Button>
            <Button 
              variant="outline"
              onClick={handleCancel}
              disabled={uploading}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card 
        className={`p-8 border-2 border-dashed transition-all duration-300 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/20 dark:from-blue-950/20 dark:via-purple-950/10 dark:to-pink-950/10 ${
          dragActive ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-border'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={handleChange}
        />
        
        <input
          ref={cameraInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          capture="environment"
          onChange={handleChange}
        />
        
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg animate-pulse">
            <Upload className="h-8 w-8 text-white" />
          </div>
          
          <div>
            <p className="text-lg font-semibold mb-1">
              Adicione sua medição
            </p>
            <p className="text-sm text-muted-foreground">
              Tire uma foto, arraste ou selecione um arquivo
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <Button
              type="button"
              variant="default"
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              onClick={handleCameraClick}
            >
              <Camera className="h-4 w-4 mr-2" />
              Tirar Foto
            </Button>
            
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleFileClick}
            >
              <Upload className="h-4 w-4 mr-2" />
              Escolher Arquivo
            </Button>
          </div>

          <div className="pt-2">
            <p className="text-xs text-muted-foreground">
              Formatos: JPG, PNG, PDF • Máx: 10MB
            </p>
          </div>
        </div>
      </Card>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onBatchUpload}
        >
          <Layers className="h-4 w-4 mr-2" />
          Upload em Lote
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onHistoryOpen}
        >
          <History className="h-4 w-4 mr-2" />
          Ver Histórico
        </Button>
      </div>
    </div>
  );
};
