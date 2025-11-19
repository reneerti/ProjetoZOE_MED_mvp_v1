import { useEffect, useState } from "react";
import { Activity, FileText, Scale, Pill, TrendingUp, LogOut, Bell, Sparkles, Target, Database, Settings, Watch } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { HealthAlerts } from "./HealthAlerts";
import { Badge } from "@/components/ui/badge";
import { PatientAnalysisView } from "./PatientAnalysisView";
import { ExamChatDialog } from "./ExamChatDialog";
import { HealthScoreCard } from "./HealthScoreCard";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals" | "resources" | "supplements" | "exam-charts" | "alerts" | "period-comparison" | "admin" | "controller" | "wearables";

interface DashboardProps {
  onNavigate: (view: View) => void;
}

interface DashboardStats {
  examsCount: number;
  weightChange: number | null;
  medicationsCount: number;
  healthScore: number | null;
  latestBioimpedance: {
    weight: number;
    bodyFat: number;
    date: string;
  } | null;
  examsStats: {
    normal: number;
    attention: number;
  };
  unreadAlerts: number;
}

export const Dashboard = ({ onNavigate }: DashboardProps) => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isController, setIsController] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    examsCount: 0,
    weightChange: null,
    medicationsCount: 0,
    healthScore: null,
    latestBioimpedance: null,
    examsStats: { normal: 0, attention: 0 },
    unreadAlerts: 0
  });
  const [loading, setLoading] = useState(true);
  const [showAlerts, setShowAlerts] = useState(false);
  const [patientAnalysis, setPatientAnalysis] = useState<any>(null);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfileAndStats();
    }
  }, [user]);

  const fetchProfileAndStats = async () => {
    try {
      // Buscar todos os dados em paralelo para performance
      const [
        profileResult,
        examsResult,
        examImagesResult,
        medicationsResult,
        bioResult,
        analysisResult,
        alertsResult,
        rolesResult
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user?.id).single(),
        supabase.from('exams').select('status').eq('user_id', user?.id),
        supabase.from('exam_images').select('id, processing_status').eq('user_id', user?.id),
        supabase.from('medications').select('id').eq('user_id', user?.id).eq('active', true),
        supabase.from('bioimpedance_measurements').select('*').eq('user_id', user?.id).order('measurement_date', { ascending: false }).limit(2),
        supabase.from('health_analysis').select('health_score').eq('user_id', user?.id).order('updated_at', { ascending: false }).limit(1).single(),
        supabase.from('health_alerts').select('id').eq('user_id', user?.id).eq('status', 'unread'),
        supabase.from('user_roles').select('role').eq('user_id', user?.id).single()
      ]);

      setProfile(profileResult.data);
      setIsAdmin(rolesResult.data?.role === 'admin');
      setIsController(rolesResult.data?.role === 'controller');

      // Contar exames processados
      const completedExams = examImagesResult.data?.filter(e => e.processing_status === 'completed') || [];
      const examsCount = completedExams.length;

      // Stats de exames (simplificado)
      const exams = examsResult.data || [];
      const normalCount = exams.filter(e => e.status === 'normal').length;
      const attentionCount = exams.filter(e => e.status === 'attention').length;

      const medicationsCount = medicationsResult.data?.length || 0;

      let latestBioimpedance = null;
      let weightChange = null;

      const latestBio = bioResult.data;
      if (latestBio && latestBio.length > 0) {
        latestBioimpedance = {
          weight: Number(latestBio[0].weight),
          bodyFat: Number(latestBio[0].body_fat_percentage || 0),
          date: new Date(latestBio[0].measurement_date).toLocaleDateString('pt-BR')
        };

        if (latestBio.length > 1) {
          weightChange = Number(latestBio[0].weight) - Number(latestBio[1].weight);
        }
      }

      const healthScore = analysisResult.data?.health_score || null;
      const unreadAlerts = alertsResult.data?.length || 0;

      // Fetch unread alerts count
      const { data: alerts } = await supabase
        .from('health_alerts')
        .select('id')
        .eq('user_id', user?.id)
        .eq('status', 'unread');

      // Fetch patient analysis
      const { data: analysisData } = await supabase
        .from('health_analysis')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (analysisData?.analysis_summary && typeof analysisData.analysis_summary === 'object') {
        const summary = analysisData.analysis_summary as any;
        if (summary.patient_view) {
          setPatientAnalysis(summary.patient_view);
        }
      }

      setStats({
        examsCount,
        weightChange,
        medicationsCount,
        healthScore,
        latestBioimpedance,
        examsStats: { normal: normalCount, attention: attentionCount },
        unreadAlerts
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = () => {
    if (profile?.display_name) return profile.display_name;
    if (user?.email) return user.email.split('@')[0];
    return "Usuário";
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">ZoeMed</h1>
                <p className="text-xs text-muted-foreground">Saúde Inteligente</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowChat(true)}
                className="h-9 w-9"
                title="Chat com IA sobre seus exames"
              >
                <Sparkles className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAlerts(!showAlerts)}
                className="relative h-9 w-9"
              >
                <Bell className="w-5 h-5" />
                {stats.unreadAlerts > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px]"
                  >
                    {stats.unreadAlerts}
                  </Badge>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="h-9 w-9"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Health Score Section */}
      <div className="p-6">
        <HealthScoreCard score={stats.healthScore ? stats.healthScore * 100 : null} />
      </div>

      {/* Alerts Section */}
      {showAlerts && (
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Alertas de Saúde</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAlerts(false)}
            >
              Fechar
            </Button>
          </div>
          <HealthAlerts />
        </div>
      )}

      {/* Patient Analysis Section */}
      {false && patientAnalysis && (
        <div className="px-4 mb-6">
          <PatientAnalysisView patientView={patientAnalysis} />
        </div>
      )}

      {/* Modules */}
      <div className="px-4 space-y-3 sm:space-y-4 pb-6 pt-4">
        <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>Meus Módulos</h2>

        {/* Alerts Card */}
        <Card 
          className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-[#EF4444] hover:scale-[1.02]"
          onClick={() => onNavigate("alerts")}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#EF4444]/10 group-hover:bg-[#EF4444]/20 transition-colors">
                  <Bell className="w-5 h-5 text-[#EF4444]" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Alertas Críticos</h3>
                  <p className="text-xs text-muted-foreground">Notificações de saúde</p>
                </div>
              </div>
              {stats.unreadAlerts > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {stats.unreadAlerts}
                </Badge>
              )}
            </div>
          </div>
        </Card>

        <Card
          className="p-4 sm:p-5 cursor-pointer hover-lift shadow-lg border-l-4 border-l-[#3B82F6] bg-white dark:bg-card backdrop-blur-sm animate-scale-in group"
          style={{ animationDelay: '0.25s' }}
          onClick={() => onNavigate("myexams")}
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#3B82F6] flex items-center justify-center flex-shrink-0 shadow-lg">
              <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-lg group-hover:scale-110 transition-transform" strokeWidth={2.8} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-semibold text-foreground text-sm sm:text-base">Meus Exames</h3>
                <Badge variant="secondary" className="text-[10px] sm:text-xs h-5">
                  {stats.examsCount}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {stats.examsStats.normal} normais • {stats.examsStats.attention} atenção
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="p-4 sm:p-5 cursor-pointer hover-lift shadow-lg border-l-4 border-l-[#10B981] bg-white dark:bg-card backdrop-blur-sm animate-scale-in group"
          style={{ animationDelay: '0.3s' }}
          onClick={() => onNavigate("bioimpedance")}
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#10B981] flex items-center justify-center flex-shrink-0 shadow-lg">
              <Scale className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-lg group-hover:scale-110 transition-transform" strokeWidth={2.8} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-semibold text-foreground text-sm">Bioimpedância</h3>
                {stats.latestBioimpedance && (
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {stats.latestBioimpedance.weight}kg
                  </Badge>
                )}
              </div>
              {stats.latestBioimpedance ? (
                <p className="text-xs text-muted-foreground truncate">
                  {stats.weightChange !== null && (
                    <span className={stats.weightChange <= 0 ? "text-success" : "text-warning"}>
                      {stats.weightChange <= 0 ? '↓' : '↑'} {Math.abs(stats.weightChange).toFixed(1)}kg
                    </span>
                  )}
                  {stats.weightChange !== null && ' • '}
                  {stats.latestBioimpedance.bodyFat.toFixed(1)}% gordura
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhuma medição</p>
              )}
            </div>
          </div>
        </Card>

        <Card
          className="p-4 cursor-pointer hover-lift shadow-lg border-l-4 border-l-[#EC4899] bg-white dark:bg-card backdrop-blur-sm animate-scale-in group"
          style={{ animationDelay: '0.35s' }}
          onClick={() => onNavigate("medication")}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#EC4899] flex items-center justify-center flex-shrink-0 shadow-lg">
              <Pill className="w-6 h-6 text-white drop-shadow-lg group-hover:scale-110 transition-transform" strokeWidth={2.8} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-semibold text-foreground text-sm">Medicações</h3>
                <Badge variant="secondary" className="text-[10px] h-5">
                  {stats.medicationsCount}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {stats.medicationsCount === 1 ? 'medicação ativa' : 'medicações ativas'}
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="p-4 cursor-pointer hover-lift shadow-lg border-l-4 border-l-[#06B6D4] bg-white dark:bg-card backdrop-blur-sm animate-scale-in group"
          style={{ animationDelay: '0.37s' }}
          onClick={() => onNavigate("supplements")}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#06B6D4] flex items-center justify-center flex-shrink-0 shadow-lg">
              <Sparkles className="w-6 h-6 text-white drop-shadow-lg group-hover:scale-110 transition-transform" strokeWidth={2.8} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-semibold text-foreground text-sm">Suplementação</h3>
                <Badge variant="secondary" className="text-[10px] h-5 bg-accent/10 text-accent">
                  IA
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                Recomendações personalizadas
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="p-4 cursor-pointer hover-lift shadow-lg border-l-4 border-l-[#8B5CF6] bg-white dark:bg-card backdrop-blur-sm animate-scale-in group"
          style={{ animationDelay: '0.39s' }}
          onClick={() => onNavigate("wearables")}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#8B5CF6] flex items-center justify-center flex-shrink-0 shadow-lg">
              <Watch className="w-6 h-6 text-white drop-shadow-lg group-hover:scale-110 transition-transform" strokeWidth={2.8} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-semibold text-foreground text-sm">Wearables</h3>
                <Badge variant="secondary" className="text-[10px] h-5 bg-primary/10 text-primary">
                  Novo
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                Dados de dispositivos conectados
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="p-4 cursor-pointer hover-lift shadow-lg border-l-4 border-l-[#F59E0B] bg-white dark:bg-card backdrop-blur-sm animate-scale-in group"
          style={{ animationDelay: '0.4s' }}
          onClick={() => onNavigate("evolution")}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#F59E0B] flex items-center justify-center flex-shrink-0 shadow-lg">
              <TrendingUp className="w-6 h-6 text-white drop-shadow-lg group-hover:scale-110 transition-transform" strokeWidth={2.8} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-semibold text-foreground text-sm">Evolução Geral</h3>
                {stats.healthScore && (
                  <Badge variant="outline" className="text-[10px] h-5">
                    {(stats.healthScore * 10).toFixed(0)}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                Acompanhe sua jornada de saúde
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="p-4 cursor-pointer hover-lift shadow-lg border-l-4 border-l-[#8B5CF6] bg-white dark:bg-card backdrop-blur-sm animate-scale-in group"
          style={{ animationDelay: '0.45s' }}
          onClick={() => onNavigate("goals")}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#8B5CF6] flex items-center justify-center flex-shrink-0 shadow-lg">
              <Target className="w-6 h-6 text-white drop-shadow-lg group-hover:scale-110 transition-transform" strokeWidth={2.8} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm mb-0.5">Metas</h3>
              <p className="text-xs text-muted-foreground truncate">
                Defina e acompanhe seus objetivos
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="p-4 cursor-pointer hover-lift shadow-lg border-l-4 border-l-[#64748B] bg-white dark:bg-card backdrop-blur-sm animate-scale-in group"
          style={{ animationDelay: '0.5s' }}
          onClick={() => onNavigate("resources")}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#64748B] flex items-center justify-center flex-shrink-0 shadow-lg">
              <Database className="w-6 h-6 text-white drop-shadow-lg group-hover:scale-110 transition-transform" strokeWidth={2.8} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm mb-0.5">Recursos</h3>
              <p className="text-xs text-muted-foreground truncate">
                Gerenciar uso e custos
              </p>
            </div>
          </div>
        </Card>

        {isAdmin && (
          <Card
            className="p-4 cursor-pointer hover-lift shadow-lg border-l-4 border-l-primary bg-white dark:bg-card backdrop-blur-sm animate-scale-in group"
            style={{ animationDelay: '0.55s' }}
            onClick={() => onNavigate("admin")}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-lg">
                <Settings className="w-6 h-6 text-white drop-shadow-lg group-hover:scale-110 transition-transform" strokeWidth={2.8} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm mb-0.5">Administração</h3>
                <p className="text-xs text-muted-foreground truncate">
                  Gestão do sistema
                </p>
              </div>
            </div>
          </Card>
        )}
        
        {isController && (
          <Card
            className="p-4 cursor-pointer hover-lift shadow-lg border-l-4 border-l-indigo-600 bg-white dark:bg-card backdrop-blur-sm animate-scale-in group"
            style={{ animationDelay: '0.6s' }}
            onClick={() => onNavigate("controller")}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Database className="w-6 h-6 text-white drop-shadow-lg group-hover:scale-110 transition-transform" strokeWidth={2.8} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm mb-0.5">Meus Pacientes</h3>
                <p className="text-xs text-muted-foreground truncate">
                  Dashboard do controlador
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      <ExamChatDialog open={showChat} onOpenChange={setShowChat} />
    </div>
  );
};
