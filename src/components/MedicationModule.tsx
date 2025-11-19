import { ArrowLeft, Plus, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { toast } from "sonner";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals";

interface MedicationModuleProps {
  onNavigate: (view: View) => void;
}

export const MedicationModule = ({ onNavigate }: MedicationModuleProps) => {
  const { user } = useAuth();
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-[#EC4899] to-[#DB2777] text-white p-6 shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={() => onNavigate("dashboard")}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2.4} />
          </button>
          <div>
            <h1 className="text-2xl font-bold drop-shadow-md">Medicações</h1>
            <p className="text-white/90 text-sm drop-shadow">Controle suas medicações</p>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="px-6 flex justify-center py-12">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      ) : medications.length === 0 ? (
        <div className="px-6 mb-8">
          <Card className="p-8 text-center">
            <Sparkles className="w-12 h-12 text-accent mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Comece seu controle de medicações</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Registre suas medicações e a IA ajudará a monitorar sua aderência e efeitos.
            </p>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-5 h-5 mr-2 text-warning" />
              Adicionar Medicação
            </Button>
          </Card>
        </div>
      ) : (
        <>
          {/* Medications List */}
          <div className="px-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">Medicações Ativas</h2>
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>
            <div className="space-y-3">
              {medications.filter(m => m.active).map((medication) => (
                <Card key={medication.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{medication.medication_name}</h3>
                      <p className="text-sm text-muted-foreground">Dose: {medication.current_dose}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Início: {new Date(medication.start_date).toLocaleDateString("pt-BR")}
                      </p>
                      {medication.notes && (
                        <p className="text-xs text-muted-foreground mt-2">{medication.notes}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {medications.filter(m => !m.active).length > 0 && (
            <div className="px-6 mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-3">Medicações Inativas</h2>
              <div className="space-y-3">
                {medications.filter(m => !m.active).map((medication) => (
                  <Card key={medication.id} className="p-4 opacity-60">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{medication.medication_name}</h3>
                        <p className="text-sm text-muted-foreground">Dose: {medication.current_dose}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
