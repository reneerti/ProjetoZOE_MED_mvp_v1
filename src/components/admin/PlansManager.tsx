import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, CreditCard } from "lucide-react";
import { useAuditLog } from "@/hooks/useAuditLog";

interface PlansManagerProps {
  onRefresh: () => void;
}

export const PlansManager = ({ onRefresh }: PlansManagerProps) => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const { logAction } = useAuditLog();
  const [formData, setFormData] = useState({
    name: "",
    max_exams_per_month: "",
    price_monthly: "",
    modules: {
      exams: true,
      bioimpedance: false,
      medications: false,
      supplements: false,
      evolution: false,
      goals: false
    }
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const planData = {
        name: formData.name,
        max_exams_per_month: formData.max_exams_per_month ? parseInt(formData.max_exams_per_month) : null,
        price_monthly: parseFloat(formData.price_monthly),
        modules_enabled: formData.modules
      };

      if (editingPlan) {
        const { error } = await supabase
          .from('subscription_plans')
          .update(planData)
          .eq('id', editingPlan.id);

        if (error) throw error;

        await logAction({
          action: 'plan_updated',
          entityType: 'subscription_plan',
          entityId: editingPlan.id,
          oldValues: { 
            name: editingPlan.name,
            price: editingPlan.price_monthly
          },
          newValues: { 
            name: planData.name,
            price: planData.price_monthly
          }
        });

        toast.success("Plano atualizado!");
      } else {
        const { data, error } = await supabase
          .from('subscription_plans')
          .insert(planData)
          .select()
          .single();

        if (error) throw error;

        await logAction({
          action: 'plan_created',
          entityType: 'subscription_plan',
          entityId: data.id,
          newValues: { 
            name: planData.name,
            price: planData.price_monthly
          }
        });

        toast.success("Plano criado!");
      }

      setOpenDialog(false);
      resetForm();
      fetchPlans();
      onRefresh();
    } catch (error) {
      console.error("Error saving plan:", error);
      toast.error("Erro ao salvar plano");
    }
  };

  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      max_exams_per_month: plan.max_exams_per_month?.toString() || "",
      price_monthly: plan.price_monthly?.toString() || "",
      modules: plan.modules_enabled
    });
    setOpenDialog(true);
  };

  const resetForm = () => {
    setEditingPlan(null);
    setFormData({
      name: "",
      max_exams_per_month: "",
      price_monthly: "",
      modules: {
        exams: true,
        bioimpedance: false,
        medications: false,
        supplements: false,
        evolution: false,
        goals: false
      }
    });
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Planos de Assinatura</h3>
        <Dialog open={openDialog} onOpenChange={(open) => { setOpenDialog(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Novo Plano
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPlan ? "Editar Plano" : "Novo Plano"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Plano</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Preço Mensal (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price_monthly}
                  onChange={(e) => setFormData({ ...formData, price_monthly: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exams">Limite de Exames/Mês</Label>
                <Input
                  id="exams"
                  type="number"
                  placeholder="Deixe vazio para ilimitado"
                  value={formData.max_exams_per_month}
                  onChange={(e) => setFormData({ ...formData, max_exams_per_month: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <Label>Módulos Habilitados</Label>
                {Object.entries(formData.modules).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{key.replace('_', ' ')}</span>
                    <Switch
                      checked={value}
                      onCheckedChange={(checked) => 
                        setFormData({ 
                          ...formData, 
                          modules: { ...formData.modules, [key]: checked }
                        })
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setOpenDialog(false); resetForm(); }} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  {editingPlan ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {plans.map((plan) => {
          const enabledModules = Object.entries(plan.modules_enabled)
            .filter(([_, enabled]) => enabled)
            .map(([key]) => key);

          return (
            <Card key={plan.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-lg">{plan.name}</h4>
                  <p className="text-2xl font-bold text-primary mt-1">
                    R$ {plan.price_monthly?.toFixed(2)}/mês
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => handleEdit(plan)}>
                  <Edit className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CreditCard className="w-4 h-4" />
                  <span>
                    {plan.max_exams_per_month ? `${plan.max_exams_per_month} exames/mês` : "Exames ilimitados"}
                  </span>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Módulos:</p>
                  <div className="flex flex-wrap gap-1">
                    {enabledModules.map((module) => (
                      <span key={module} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {module}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
