import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";

interface ExtractedData {
  weight?: number;
  body_fat_percentage?: number;
  muscle_mass?: number;
  water_percentage?: number;
  measurement_date?: string;
  additional_data?: any;
}

interface OCRPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  extractedData: ExtractedData | null;
  isProcessing: boolean;
  onConfirm: (data: ExtractedData) => void;
  onCancel: () => void;
}

export const OCRPreviewDialog = ({
  open,
  onOpenChange,
  imageUrl,
  extractedData,
  isProcessing,
  onConfirm,
  onCancel
}: OCRPreviewDialogProps) => {
  const [editedData, setEditedData] = useState<ExtractedData>(extractedData || {});

  const handleFieldChange = (field: keyof ExtractedData, value: string) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value ? parseFloat(value) : undefined
    }));
  };

  const handleAdditionalFieldChange = (field: string, value: string) => {
    setEditedData(prev => ({
      ...prev,
      additional_data: {
        ...(prev.additional_data || {}),
        [field]: value ? parseFloat(value) : undefined
      }
    }));
  };

  const handleConfirm = () => {
    onConfirm(editedData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Processando OCR...
              </>
            ) : extractedData ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Dados Detectados - Revise e Confirme
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Preparando análise...
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image Preview */}
          <div className="relative rounded-lg overflow-hidden bg-muted">
            <img 
              src={imageUrl} 
              alt="Preview da bioimpedância" 
              className="w-full h-auto max-h-64 object-contain"
            />
          </div>

          {isProcessing && (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Analisando imagem com IA...
                </p>
              </div>
            </div>
          )}

          {!isProcessing && extractedData && (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Campos detectados. Você pode editar os valores antes de salvar.</span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="weight">Peso (kg) *</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      value={editedData.weight || ''}
                      onChange={(e) => handleFieldChange('weight', e.target.value)}
                      className="font-semibold"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="body_fat">Gordura Corporal (%)</Label>
                    <Input
                      id="body_fat"
                      type="number"
                      step="0.1"
                      value={editedData.body_fat_percentage || ''}
                      onChange={(e) => handleFieldChange('body_fat_percentage', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="muscle_mass">Massa Muscular (kg)</Label>
                    <Input
                      id="muscle_mass"
                      type="number"
                      step="0.1"
                      value={editedData.muscle_mass || ''}
                      onChange={(e) => handleFieldChange('muscle_mass', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="water">Hidratação (%)</Label>
                    <Input
                      id="water"
                      type="number"
                      step="0.1"
                      value={editedData.water_percentage || ''}
                      onChange={(e) => handleFieldChange('water_percentage', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bmi">IMC</Label>
                    <Input
                      id="bmi"
                      type="number"
                      step="0.1"
                      value={editedData.additional_data?.bmi || ''}
                      onChange={(e) => handleAdditionalFieldChange('bmi', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="visceral">Gordura Visceral</Label>
                    <Input
                      id="visceral"
                      type="number"
                      value={editedData.additional_data?.visceral_fat || ''}
                      onChange={(e) => handleAdditionalFieldChange('visceral_fat', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bmr">TMB (kcal)</Label>
                    <Input
                      id="bmr"
                      type="number"
                      value={editedData.additional_data?.basal_metabolic_rate || ''}
                      onChange={(e) => handleAdditionalFieldChange('basal_metabolic_rate', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="metabolic_age">Idade Metabólica</Label>
                    <Input
                      id="metabolic_age"
                      type="number"
                      value={editedData.additional_data?.metabolic_age || ''}
                      onChange={(e) => handleAdditionalFieldChange('metabolic_age', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {!isProcessing && extractedData && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!editedData.weight}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirmar e Salvar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
