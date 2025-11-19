import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Pill, Sparkles, TrendingUp, Calendar, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SupplementCreateDialog } from "./supplements/SupplementCreateDialog";
import { SupplementCard } from "./supplements/SupplementCard";
import { RecommendationCard } from "./supplements/RecommendationCard";
import { SupplementHistoryDialog } from "./supplements/SupplementHistoryDialog";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals" | "resources" | "supplements";

interface SupplementsModuleProps {
  onNavigate: (view: View) => void;
}

export const SupplementsModule = ({ onNavigate }: SupplementsModuleProps) => {
  const { toast } = useToast();
  const [supplements, setSupplements] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSupplement, setSelectedSupplement] = useState<any>(null);

  useEffect(() => {
    loadSupplements();
    loadRecommendations();
  }, []);

  const loadSupplements = async () => {
    try {
      const { data, error } = await supabase
        .from("supplements")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSupplements(data || []);
    } catch (error: any) {
      console.error("Error loading supplements:", error);
    }
  };

  const loadRecommendations = async () => {
    try {
      const { data, error } = await supabase
        .from("supplement_recommendations")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecommendations(data || []);
    } catch (error: any) {
      console.error("Error loading recommendations:", error);
    }
  };

  const handleGenerateRecommendations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-supplements");

      if (error) throw error;

      toast({
        title: "Recomendações geradas",
        description: `${data.recommendations.length} suplementos sugeridos pela IA`,
      });

      loadRecommendations();
    } catch (error: any) {
      toast({
        title: "Erro ao gerar recomendações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRecommendation = async (recommendation: any) => {
    try {
      // Create supplement from recommendation
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: insertError } = await supabase
        .from("supplements")
        .insert([{
          user_id: user.id,
          supplement_name: recommendation.supplement_name,
          supplement_type: "vitamina",
          current_dose: recommendation.recommended_dose,
          unit: "mg",
          frequency: "diario",
          start_date: new Date().toISOString().split("T")[0],
          notes: recommendation.reasoning,
        }]);

      if (insertError) throw insertError;

      // Update recommendation status
      const { error: updateError } = await supabase
        .from("supplement_recommendations")
        .update({ status: "accepted" })
        .eq("id", recommendation.id);

      if (updateError) throw updateError;

      toast({
        title: "Recomendação aceita",
        description: "Suplemento adicionado ao seu plano",
      });

      loadSupplements();
      loadRecommendations();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRejectRecommendation = async (id: string) => {
    try {
      const { error } = await supabase
        .from("supplement_recommendations")
        .update({ status: "rejected" })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Recomendação rejeitada",
      });

      loadRecommendations();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSupplementCreated = () => {
    loadSupplements();
    setIsCreateOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-gradient-supplements text-white p-4 pb-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate("dashboard")}
              className="text-white hover:bg-white/20 h-9 w-9"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Suplementação</h1>
              <p className="text-white/80 text-xs mt-0.5">Recomendações personalizadas por IA</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCreateOpen(true)}
            className="text-white hover:bg-white/20 h-9 w-9"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="px-6 space-y-4">
        {recommendations.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="w-5 h-5 text-primary" />
                Recomendações da IA
              </CardTitle>
              <CardDescription>
                Baseado nos seus exames e bioimpedância
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendations.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  onAccept={handleAcceptRecommendation}
                  onReject={handleRejectRecommendation}
                />
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Seus Suplementos</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateRecommendations}
                disabled={loading}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Gerar Sugestões
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {supplements.length === 0 ? (
              <div className="text-center py-8">
                <Pill className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhum suplemento cadastrado
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-4"
                >
                  Adicionar Suplemento
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {supplements.map((supplement) => (
                  <SupplementCard
                    key={supplement.id}
                    supplement={supplement}
                    onUpdate={loadSupplements}
                    onViewHistory={() => setSelectedSupplement(supplement)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <SupplementCreateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={handleSupplementCreated}
      />

      {selectedSupplement && (
        <SupplementHistoryDialog
          supplement={selectedSupplement}
          open={!!selectedSupplement}
          onOpenChange={() => setSelectedSupplement(null)}
        />
      )}
    </div>
  );
};
