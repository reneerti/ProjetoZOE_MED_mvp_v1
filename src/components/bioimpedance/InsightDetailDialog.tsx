import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { renderSafeMarkdown } from "@/lib/utils";

interface InsightDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  detailedInfo: string;
  onAskAI?: () => void;
}

export const InsightDetailDialog = ({ 
  open, 
  onOpenChange, 
  title, 
  description, 
  detailedInfo,
  onAskAI 
}: InsightDetailDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Informações Detalhadas</h4>
            <div 
              className="text-sm text-foreground leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(detailedInfo) }}
            />
          </div>

          {onAskAI && (
            <Button 
              onClick={onAskAI} 
              className="w-full"
              variant="outline"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Perguntar à IA sobre isso
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
