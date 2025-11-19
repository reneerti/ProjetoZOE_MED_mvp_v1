import { Upload, Image as ImageIcon, X, Camera } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";

interface ImageUploadZoneProps {
  onFileSelect: (file: File) => void;
  uploading: boolean;
}

export const ImageUploadZone = ({ onFileSelect, uploading }: ImageUploadZoneProps) => {
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

  const handleFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Por favor, selecione apenas arquivos JPG, PNG ou PDF');
      return;
    }

    setSelectedFile(file);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
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
      <Card className="p-6 border-2 border-dashed">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Preview da Imagem</h3>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {previewUrl ? (
            <div className="relative rounded-lg overflow-hidden bg-muted">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-full h-auto max-h-96 object-contain"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
              <div className="text-center">
                <ImageIcon className="h-16 w-16 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{selectedFile?.name}</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={handleProcess}
              disabled={uploading}
              className="flex-1"
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
    <Card 
      className={`p-8 border-2 border-dashed transition-colors bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/10 dark:to-purple-950/10 ${
        dragActive ? 'border-primary bg-primary/5' : 'border-border'
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
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
          <Upload className="h-8 w-8 text-white" />
        </div>
        
        <div>
          <p className="text-lg font-semibold mb-1">
            Adicione sua medição
          </p>
          <p className="text-sm text-muted-foreground">
            Tire uma foto ou selecione um arquivo
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
          <Button
            type="button"
            variant="default"
            className="flex-1"
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
  );
};
