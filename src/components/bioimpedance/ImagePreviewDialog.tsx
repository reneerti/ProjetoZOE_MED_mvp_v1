import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ImagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  fileName: string;
  originalSize?: number;
  compressedSize?: number;
  isCompressing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ImagePreviewDialog = ({
  open,
  onOpenChange,
  imageUrl,
  fileName,
  originalSize,
  compressedSize,
  isCompressing,
  onConfirm,
  onCancel
}: ImagePreviewDialogProps) => {
  const formatSize = (bytes?: number) => {
    if (!bytes) return "0 KB";
    return (bytes / 1024).toFixed(2) + " KB";
  };

  const compressionRate = originalSize && compressedSize
    ? (((originalSize - compressedSize) / originalSize) * 100).toFixed(0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Confirmar Upload</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Preview */}
          <div className="relative bg-muted rounded-lg overflow-hidden">
            <img
              src={imageUrl}
              alt="Preview"
              className="w-full h-auto max-h-96 object-contain"
            />
          </div>

          {/* File Info */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>Arquivo:</strong> {fileName}
            </p>

            {/* Compression Progress */}
            {isCompressing && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Comprimindo imagem...</span>
                </div>
                <Progress value={undefined} className="h-2" />
              </div>
            )}

            {/* Compression Stats */}
            {!isCompressing && originalSize && compressedSize && (
              <div className="bg-success/10 border border-success/20 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tamanho original:</span>
                  <span className="font-medium">{formatSize(originalSize)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tamanho comprimido:</span>
                  <span className="font-medium text-success">{formatSize(compressedSize)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Economia:</span>
                  <span className="font-bold text-success">{compressionRate}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isCompressing}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isCompressing}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {isCompressing ? "Comprimindo..." : "Confirmar Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
