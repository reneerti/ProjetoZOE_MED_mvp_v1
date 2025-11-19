import { Sparkles, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface RecommendationCardProps {
  recommendation: any;
  onAccept: (rec: any) => void;
  onReject: (id: string) => void;
}

export const RecommendationCard = ({ recommendation, onAccept, onReject }: RecommendationCardProps) => {
  return (
    <Card className="p-4 border-primary/20">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm mb-1">{recommendation.supplement_name}</h3>
          <p className="text-sm font-medium text-primary mb-2">
            {recommendation.recommended_dose}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {recommendation.reasoning}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAccept(recommendation)}
            className="h-8 w-8 p-0"
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onReject(recommendation.id)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
