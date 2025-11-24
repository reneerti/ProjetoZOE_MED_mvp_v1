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

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "medication-dashboard" | "evolution" | "profile" | "goals";

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
      
      // Se não houver medicações, criar dados de exemplo
      if (!data || data.length === 0) {
        const exampleMedications = [
          {
            user_id: user?.id,
            medication_name: "MONJARO",
            current_dose: "7.5 mg - Toda Semana",
            start_date: "2024-09-01",
            active: true,
            schedule: { type: "glp1", frequency: "weekly" },
            notes: "GLP-1 para controle de peso e glicemia"
          },
          {
            user_id: user?.id,
            medication_name: "VITAMINA B12",
            current_dose: "1000 mcg - A cada 6 meses",
            start_date: "2024-01-15",
            active: true,
            schedule: { type: "injectable", frequency: "every_6_months" },
            notes: "Suplementação de B12"
          },
          {
            user_id: user?.id,
            medication_name: "VITAMINAS",
            current_dose: "Complexo - A cada 60 dias",
            start_date: "2024-02-01",
            active: true,
            schedule: { type: "oral", frequency: "every_60_days" },
            notes: "Multivitamínico completo"
          }
        ];

        const { error: insertError } = await supabase
          .from('medications')
          .insert(exampleMedications);

        if (insertError) throw insertError;
        
        // Recarregar após inserir
        const { data: newData } = await supabase
          .from('medications')
          .select('*')
          .eq('user_id', user?.id)
          .order('start_date', { ascending: false });
        
        setMedications(newData || []);
      } else {
        setMedications(data);
      }
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

  const handleOpenDashboard = (medication: any) => {
    onNavigate("medication-dashboard");
  };

  return (
    <div className="animate-fade-in">
      {/* Header com Cor */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-accent to-accent/80 text-white">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigate("dashboard")}
              className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-white">Medicações</h1>
              <p className="text-sm text-white/80">Gerencie seu tratamento</p>
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

            {(() => {
              const uniqueActive = Array.from(
                new Map(
                  medications
                    .filter((m) => m.active)
                    .map((m) => [`${m.medication_name}-${m.active}`, m])
                ).values()
              );

              return (
                <div className="space-y-3">
                  {uniqueActive.map((medication) => (
                    <MedicationCard
                      key={medication.id}
                      medication={medication}
                      onViewHistory={handleViewHistory}
                      onDeactivate={handleDeactivate}
                      onOpenDashboard={handleOpenDashboard}
                    />
                  ))}
                </div>
              );
            })()}
          </div>

          {(() => {
            const uniqueInactive = Array.from(
              new Map(
                medications
                  .filter((m) => !m.active)
                  .map((m) => [`${m.medication_name}-${m.active}`, m])
              ).values()
            );

            if (uniqueInactive.length === 0) return null;

            return (
              <div className="px-6 pb-6">
                <h2 className="text-lg font-semibold text-foreground mb-3">Histórico</h2>
                <div className="space-y-3 opacity-60">
                  {uniqueInactive.map((medication) => (
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
            );
          })()}
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
