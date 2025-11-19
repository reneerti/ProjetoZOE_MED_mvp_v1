import { useState, useEffect } from "react";
import { ArrowLeft, Users, CreditCard, Settings, UserCog } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { PlansManager } from "./PlansManager";
import { UsersManager } from "./UsersManager";
import { ControllersManager } from "./ControllersManager";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals" | "resources" | "supplements" | "exam-charts" | "alerts" | "period-comparison" | "admin";

interface AdminDashboardProps {
  onNavigate: (view: View) => void;
}

export const AdminDashboard = ({ onNavigate }: AdminDashboardProps) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalControllers: 0,
    totalPlans: 0,
    activeSubscriptions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkAdminAccess();
      fetchStats();
    }
  }, [user]);

  const checkAdminAccess = async () => {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id)
      .single();

    if (roles?.role !== 'admin') {
      toast.error("Acesso negado");
      onNavigate("dashboard");
    }
  };

  const fetchStats = async () => {
    try {
      const [usersRes, controllersRes, plansRes, subsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'controller'),
        supabase.from('subscription_plans').select('id', { count: 'exact', head: true }),
        supabase.from('user_subscriptions').select('id', { count: 'exact', head: true }).eq('active', true)
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        totalControllers: controllersRes.count || 0,
        totalPlans: plansRes.count || 0,
        activeSubscriptions: subsRes.count || 0
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
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
              <h1 className="text-xl font-semibold">Administração</h1>
              <p className="text-sm text-muted-foreground">Gestão do sistema</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <p className="text-xs text-muted-foreground">Usuários</p>
          </div>
          <p className="text-2xl font-bold">{stats.totalUsers}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserCog className="w-4 h-4 text-accent" />
            <p className="text-xs text-muted-foreground">Controladores</p>
          </div>
          <p className="text-2xl font-bold">{stats.totalControllers}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-success" />
            <p className="text-xs text-muted-foreground">Assinaturas</p>
          </div>
          <p className="text-2xl font-bold">{stats.activeSubscriptions}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-4 h-4 text-warning" />
            <p className="text-xs text-muted-foreground">Planos</p>
          </div>
          <p className="text-2xl font-bold">{stats.totalPlans}</p>
        </Card>
      </div>

      {/* Management Tabs */}
      <div className="p-6">
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="controllers">Controladores</TabsTrigger>
            <TabsTrigger value="plans">Planos</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <UsersManager onRefresh={fetchStats} />
          </TabsContent>

          <TabsContent value="controllers" className="mt-6">
            <ControllersManager onRefresh={fetchStats} />
          </TabsContent>

          <TabsContent value="plans" className="mt-6">
            <PlansManager onRefresh={fetchStats} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
