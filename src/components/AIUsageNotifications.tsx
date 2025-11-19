import { useEffect } from "react";
import { useAIUsageStats, useAIAlertSettings } from "@/hooks/useAIUsageStats";
import { toast } from "sonner";
import { AlertTriangle, DollarSign } from "lucide-react";

export const AIUsageNotifications = () => {
  const { data: stats } = useAIUsageStats(1); // Last 24 hours
  const { data: settings } = useAIAlertSettings();

  useEffect(() => {
    if (!stats || !settings) return;

    const fallbackCount = Number(stats.fallback_requests);
    const dailyCost = Number(stats.total_cost_usd);

    // Alert for frequent fallback usage
    if (
      settings.enable_fallback_alerts &&
      fallbackCount >= settings.fallback_threshold
    ) {
      const fallbackRate = stats.total_requests > 0 
        ? ((fallbackCount / Number(stats.total_requests)) * 100).toFixed(0)
        : '0';

      toast.warning(
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Uso Frequente de Fallback</p>
            <p className="text-sm text-muted-foreground mt-1">
              {fallbackCount} requisições ({fallbackRate}%) usaram fallback para Gemini nas últimas 24h.
              Seus créditos do Lovable AI podem estar acabando.
            </p>
          </div>
        </div>,
        {
          duration: 8000,
          id: 'fallback-alert'
        }
      );
    }

    // Alert for high daily cost
    if (
      settings.enable_cost_alerts &&
      dailyCost >= Number(settings.daily_cost_threshold)
    ) {
      toast.warning(
        <div className="flex items-start gap-3">
          <DollarSign className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Custo Diário Elevado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Você já gastou ${dailyCost.toFixed(2)} em AI hoje, ultrapassando 
              seu limite configurado de ${Number(settings.daily_cost_threshold).toFixed(2)}.
            </p>
          </div>
        </div>,
        {
          duration: 8000,
          id: 'cost-alert'
        }
      );
    }
  }, [stats, settings]);

  return null; // This component only shows notifications
};
