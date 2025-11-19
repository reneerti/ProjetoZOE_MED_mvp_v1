import { ArrowLeft, Target, Plus, TrendingUp, Calendar, Trophy, Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { GoalCreateDialog } from "./GoalCreateDialog";
import { GoalNotifications } from "./GoalNotifications";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals";

interface GoalsModuleProps {
  onNavigate: (view: View) => void;
}

export const GoalsModule = ({ onNavigate }: GoalsModuleProps) => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user) {
      fetchGoals();
      fetchNotifications();
    }
  }, [user]);

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('body_composition_goals')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error("Error fetching goals:", error);
      toast.error("Erro ao carregar metas");
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('goal_notifications')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const getGoalTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      weight: 'Peso',
      body_fat: 'Gordura Corporal',
      muscle_mass: 'Massa Muscular',
      water: 'Hidratação'
    };
    return labels[type] || type;
  };

  const getGoalTypeUnit = (type: string) => {
    const units: Record<string, string> = {
      weight: 'kg',
      body_fat: '%',
      muscle_mass: 'kg',
      water: '%'
    };
    return units[type] || '';
  };

  const calculateProgress = (goal: any) => {
    if (!goal.current_value) return 0;
    
    const total = Math.abs(goal.target_value - goal.start_value);
    const current = Math.abs(goal.current_value - goal.start_value);
    const progress = (current / total) * 100;
    
    return Math.min(Math.max(progress, 0), 100);
  };

  const getDaysRemaining = (targetDate: string) => {
    const today = new Date();
    const target = new Date(targetDate);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => onNavigate("dashboard")}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={2.4} />
            </button>
            <div>
              <h1 className="text-2xl font-bold drop-shadow-md">Metas</h1>
              <p className="text-white/90 text-sm drop-shadow">Acompanhe seus objetivos</p>
            </div>
          </div>
          <button
            onClick={() => setShowNotifications(true)}
            className="relative w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <Bell className="w-5 h-5" strokeWidth={2.4} />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-warning text-white text-xs rounded-full flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Add Goal Button */}
      <div className="px-6 mb-6">
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="w-full"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nova Meta
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="px-6 flex justify-center py-12">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      ) : goals.length === 0 ? (
        <div className="px-6 mb-8">
          <Card className="p-8 text-center">
            <Target className="w-12 h-12 text-accent mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Defina suas metas</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie objetivos de composição corporal e acompanhe seu progresso de forma inteligente.
            </p>
          </Card>
        </div>
      ) : (
        <>
          {/* Active Goals */}
          {activeGoals.length > 0 && (
            <div className="px-6 mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                Metas Ativas
              </h2>
              <div className="space-y-3">
                {activeGoals.map((goal) => {
                  const progress = calculateProgress(goal);
                  const daysRemaining = getDaysRemaining(goal.target_date);
                  const isOverdue = daysRemaining < 0;

                  return (
                    <Card key={goal.id} className="p-4 hover-lift">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground">
                              {getGoalTypeLabel(goal.goal_type)}
                            </h3>
                            {progress >= 100 && (
                              <Badge variant="default" className="bg-success">
                                <Trophy className="w-3 h-3 mr-1" />
                                Concluída!
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Meta: <strong>{goal.target_value}{getGoalTypeUnit(goal.goal_type)}</strong>
                            {goal.current_value && (
                              <> • Atual: <strong>{goal.current_value}{getGoalTypeUnit(goal.goal_type)}</strong></>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-accent">{Math.round(progress)}%</div>
                        </div>
                      </div>

                      <Progress value={progress} className="mb-3" />

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {isOverdue ? (
                            <span className="text-warning font-semibold">
                              Atrasado {Math.abs(daysRemaining)} dias
                            </span>
                          ) : (
                            <span>
                              {daysRemaining} dias restantes
                            </span>
                          )}
                        </div>
                        <div>
                          {new Date(goal.start_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} → {new Date(goal.target_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </div>
                      </div>

                      {goal.notes && (
                        <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                          {goal.notes}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div className="px-6 mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-success" />
                Metas Concluídas
              </h2>
              <div className="space-y-3">
                {completedGoals.map((goal) => (
                  <Card key={goal.id} className="p-4 bg-success/5 border-success/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">
                          {getGoalTypeLabel(goal.goal_type)}
                        </h3>
                        <div className="text-sm text-muted-foreground">
                          {goal.start_value}{getGoalTypeUnit(goal.goal_type)} → {goal.target_value}{getGoalTypeUnit(goal.goal_type)}
                        </div>
                      </div>
                      <div className="text-right">
                        <Trophy className="w-8 h-8 text-success mb-1" />
                        <div className="text-xs text-muted-foreground">
                          {goal.completed_at && new Date(goal.completed_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      <GoalCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          fetchGoals();
          setShowCreateDialog(false);
        }}
      />

      <GoalNotifications
        open={showNotifications}
        onOpenChange={setShowNotifications}
        notifications={notifications}
        onRead={fetchNotifications}
      />
    </div>
  );
};
