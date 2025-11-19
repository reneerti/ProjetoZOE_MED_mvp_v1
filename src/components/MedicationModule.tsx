import { ArrowLeft, Plus, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { MedicationCreateDialog } from "./medication/MedicationCreateDialog";
import { MedicationHistoryDialog } from "./medication/MedicationHistoryDialog";
import { MedicationCard } from "./medication/MedicationCard";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals";

interface MedicationModuleProps {
  onNavigate: (view: View) => void;
}

export const MedicationModule = ({ onNavigate }: MedicationModuleProps) => {
  const { user } = useAuth();
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchMedications();
    }
  }, [user]);

  const fetchMedications = async () => {
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', user?.id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setMedications(data || []);
    } catch (error) {
      console.error("Error fetching medications:", error);
      toast.error("Erro ao carregar medicações");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('medications')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;
      toast.success("Medicação desativada");
      fetchMedications();
    } catch (error) {
      console.error("Error deactivating medication:", error);
      toast.error("Erro ao desativar medicação");
    }
  };

  const handleViewHistory = (medication: any) => {
    setSelectedMedication(medication);
    setShowHistoryDialog(true);
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigate("dashboard")}
              className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold">Medicações</h1>
              <p className="text-sm text-muted-foreground">Gerencie seu tratamento</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="px-6 flex justify-center py-12">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      ) : medications.length === 0 ? (
        <div className="p-6">
          <Card className="p-8 text-center border-dashed">
            <Sparkles className="w-12 h-12 text-accent mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Comece a gerenciar suas medicações</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Registre medicações orais, injetáveis e GLP-1s. Acompanhe doses, horários e evolução do tratamento.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Adicionar Medicação
            </Button>
          </Card>
        </div>
      ) : (
        <>
          {/* Medications List */}
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Medicações Ativas</h2>
              <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>
            
            <div className="space-y-3">
              {medications.filter(m => m.active).map((medication) => (
                <MedicationCard
                  key={medication.id}
                  medication={medication}
                  onViewHistory={handleViewHistory}
                  onDeactivate={handleDeactivate}
                />
              ))}
            </div>
          </div>

          {medications.filter(m => !m.active).length > 0 && (
            <div className="px-6 pb-6">
              <h2 className="text-lg font-semibold text-foreground mb-3">Histórico</h2>
              <div className="space-y-3 opacity-60">
                {medications.filter(m => !m.active).map((medication) => (
                  <Card key={medication.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{medication.medication_name}</h3>
                        <p className="text-xs text-muted-foreground">{medication.current_dose}</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleViewHistory(medication)}
                      >
                        Ver
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <MedicationCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchMedications}
      />

      <MedicationHistoryDialog
        open={showHistoryDialog}
        onOpenChange={setShowHistoryDialog}
        medication={selectedMedication}
      />
    </div>
  );
};
