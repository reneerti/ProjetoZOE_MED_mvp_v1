import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserCog, Mail } from "lucide-react";
import { useAuditLog } from "@/hooks/useAuditLog";

interface UsersManagerProps {
  onRefresh: () => void;
}

export const UsersManager = ({ onRefresh }: UsersManagerProps) => {
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { logAction } = useAuditLog();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, plansRes, subsRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('subscription_plans').select('*'),
        supabase.from('user_subscriptions').select('*'),
        supabase.from('user_roles').select('*')
      ]);

      const usersWithData = (usersRes.data || []).map(user => ({
        ...user,
        subscription: subsRes.data?.find(s => s.user_id === user.id),
        role: rolesRes.data?.find(r => r.user_id === user.id)?.role || 'user'
      }));

      setUsers(usersWithData);
      setPlans(plansRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async (userId: string, planId: string) => {
    try {
      const plan = plans.find(p => p.id === planId);
      if (!plan) return;

      const user = users.find(u => u.id === userId);
      const oldPlan = plans.find(p => p.id === user?.subscription?.plan_id);

      const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          plan_id: planId,
          current_period_start: new Date().toISOString().split('T')[0],
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          active: true,
          exams_used_this_month: 0
        }, { onConflict: 'user_id' });

      if (error) throw error;

      // Log action
      await logAction({
        action: 'subscription_updated',
        entityType: 'user_subscription',
        entityId: userId,
        oldValues: { plan_name: oldPlan?.name || 'Nenhum' },
        newValues: { plan_name: plan.name }
      });

      toast.success("Plano atualizado!");
      fetchData();
      onRefresh();
    } catch (error) {
      console.error("Error updating plan:", error);
      toast.error("Erro ao atualizar plano");
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-3">
      {users.map((user) => {
        const currentPlan = plans.find(p => p.id === user.subscription?.plan_id);
        
        return (
          <Card key={user.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-sm truncate">
                    {user.display_name || "Sem nome"}
                  </h3>
                  <Badge variant={user.role === 'admin' ? 'default' : user.role === 'controller' ? 'secondary' : 'outline'} className="text-xs">
                    {user.role === 'admin' ? 'Admin' : user.role === 'controller' ? 'Controlador' : 'Usuário'}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground truncate">ID: {user.id.slice(0, 8)}...</p>
                </div>

                {user.subscription && (
                  <div className="text-xs text-muted-foreground">
                    Exames usados: {user.subscription.exams_used_this_month} / {currentPlan?.max_exams_per_month || '∞'}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 min-w-[140px]">
                <Select
                  value={user.subscription?.plan_id || ""}
                  onValueChange={(value) => handlePlanChange(user.id, value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Sem plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id} className="text-xs">
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
