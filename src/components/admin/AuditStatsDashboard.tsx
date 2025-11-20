import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Activity, User, TrendingUp, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899'];

interface ActionStats {
  action: string;
  count: number;
}

interface DailyTimeline {
  date: string;
  count: number;
}

interface TopUser {
  user_id: string;
  display_name: string | null;
  action_count: number;
}

export const AuditStatsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [actionStats, setActionStats] = useState<ActionStats[]>([]);
  const [timeline, setTimeline] = useState<DailyTimeline[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [totalActions, setTotalActions] = useState(0);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      // Fetch all logs from last 30 days
      const { data: logs, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!logs || logs.length === 0) {
        setLoading(false);
        return;
      }

      // Calculate action stats
      const actionCounts: Record<string, number> = {};
      logs.forEach(log => {
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      });
      const actionStatsData = Object.entries(actionCounts)
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count);
      setActionStats(actionStatsData);

      // Calculate daily timeline
      const dailyCounts: Record<string, number> = {};
      logs.forEach(log => {
        const date = format(new Date(log.created_at), 'yyyy-MM-dd');
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      });
      const timelineData = Object.entries(dailyCounts)
        .map(([date, count]) => ({ date: format(new Date(date), 'dd/MM', { locale: ptBR }), count }))
        .reverse()
        .slice(-30);
      setTimeline(timelineData);

      // Calculate top users
      const userCounts: Record<string, number> = {};
      logs.forEach(log => {
        userCounts[log.user_id] = (userCounts[log.user_id] || 0) + 1;
      });

      // Fetch user profiles for top users
      const topUserIds = Object.entries(userCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([userId]) => userId);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', topUserIds);

      const topUsersData = topUserIds.map(userId => ({
        user_id: userId,
        display_name: profiles?.find(p => p.id === userId)?.display_name || 'Desconhecido',
        action_count: userCounts[userId]
      }));
      setTopUsers(topUsersData);

      setTotalActions(logs.length);
    } catch (error) {
      console.error("Error fetching audit stats:", error);
      toast.error("Erro ao carregar estatísticas de auditoria");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (totalActions === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-semibold mb-2">Nenhuma Ação Registrada</p>
          <p className="text-muted-foreground">
            Não há ações administrativas registradas nos últimos 30 dias.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Ações</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActions}</div>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tipos de Ações</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actionStats.length}</div>
            <p className="text-xs text-muted-foreground">Categorias diferentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topUsers.length}</div>
            <p className="text-xs text-muted-foreground">Administradores</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média Diária</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(totalActions / 30)}
            </div>
            <p className="text-xs text-muted-foreground">Ações por dia</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Actions by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Ações por Tipo</CardTitle>
            <CardDescription>Distribuição das ações administrativas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={actionStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ action, percent }) => `${action.split('_').join(' ')}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {actionStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Users */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários Mais Ativos</CardTitle>
            <CardDescription>Top 5 administradores por atividade</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topUsers}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="display_name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="action_count" fill="#8B5CF6" name="Ações" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline de Ações (Últimos 30 Dias)</CardTitle>
          <CardDescription>Histórico diário de ações administrativas</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#8B5CF6" 
                strokeWidth={2}
                name="Ações"
                dot={{ fill: '#8B5CF6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
