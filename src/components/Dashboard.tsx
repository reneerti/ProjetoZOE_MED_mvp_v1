import { useEffect, useState } from "react";
import { Activity, FileText, Scale, Pill, TrendingUp, LogOut, Bell, Sparkles, Target, Database } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { HealthAlerts } from "./HealthAlerts";
import { Badge } from "@/components/ui/badge";
import { PatientAnalysisView } from "./PatientAnalysisView";
import { ExamChatDialog } from "./ExamChatDialog";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals" | "resources" | "supplements";

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
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      setProfile(profileData);

      // Fetch exams count and stats
      const { data: exams } = await supabase
        .from('exams')
        .select('status')
        .eq('user_id', user?.id);

      const examsCount = exams?.length || 0;
      const normalCount = exams?.filter(e => e.status === 'normal').length || 0;
      const attentionCount = exams?.filter(e => e.status === 'attention').length || 0;

      // Fetch medications count
      const { data: medications } = await supabase
        .from('medications')
        .select('id')
        .eq('user_id', user?.id)
        .eq('active', true);

      const medicationsCount = medications?.length || 0;

      // Fetch latest bioimpedance
      const { data: latestBio } = await supabase
        .from('bioimpedance_measurements')
        .select('*')
        .eq('user_id', user?.id)
        .order('measurement_date', { ascending: false })
        .limit(2);

      let latestBioimpedance = null;
      let weightChange = null;

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

      // Fetch latest health score
      const { data: latestEvolution } = await supabase
        .from('evolution_notes')
        .select('health_score')
        .eq('user_id', user?.id)
        .order('note_date', { ascending: false })
        .limit(1)
        .single();

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
        healthScore: latestEvolution?.health_score ? Number(latestEvolution.health_score) : null,
        latestBioimpedance,
        examsStats: { normal: normalCount, attention: attentionCount },
        unreadAlerts: alerts?.length || 0
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

  const healthScore = stats.healthScore || 7.5;
  const healthScorePercent = healthScore / 10;
  
  // Score color based on criticality
  const getScoreColor = () => {
    if (healthScore >= 8) return 'from-success to-success/80';
    if (healthScore >= 6) return 'from-warning to-warning/80';
    return 'from-destructive to-destructive/80';
  };

  const getScoreIconColor = () => {
    if (healthScore >= 8) return 'text-success-foreground';
    if (healthScore >= 6) return 'text-warning-foreground';
    return 'text-destructive-foreground';
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-header text-white p-4 pb-6 rounded-b-3xl animate-slide-in-left">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">ZoeMed</h1>
            <p className="text-white/80 text-xs mt-0.5">
              Saúde Inteligente
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowChat(true)}
              className="text-white hover:bg-white/20 h-9 w-9"
              title="Chat com IA sobre seus exames"
            >
              <Sparkles className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAlerts(!showAlerts)}
              className="text-white hover:bg-white/20 relative h-9 w-9"
            >
              <Bell className="w-4 h-4" />
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
              className="text-white hover:bg-white/20 h-9 w-9"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Health Score */}
      <div className="px-6 -mt-3 mb-5 animate-scale-in" style={{ animationDelay: '0.1s' }}>
        <Card 
          className={`bg-gradient-to-br ${getScoreColor()} text-white p-4 shadow-card-hover cursor-pointer card-hover group relative overflow-hidden`}
          onClick={() => onNavigate("evolution")}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 animate-shimmer" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex-1">
              <p className="text-white/90 text-xs font-medium mb-0.5">Score de Saúde</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold">{healthScore.toFixed(1)}</span>
                <span className="text-white/70 text-base">/10</span>
              </div>
              <p className="text-white/60 text-[10px] mt-1">
                {healthScore >= 8 ? "Excelente! Continue assim" : 
                 healthScore >= 6 ? "Bom trabalho" : "Vamos melhorar"}
              </p>
            </div>
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="white"
                  strokeOpacity="0.15"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="white"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - healthScorePercent)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Activity className={`w-7 h-7 ${getScoreIconColor()} animate-heartbeat`} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Alerts Section */}
      {showAlerts && (
        <div className="px-6 mb-6">
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
        <div className="px-6 mb-6">
          <PatientAnalysisView patientView={patientAnalysis} />
        </div>
      )}

      {/* Modules */}
      <div className="px-6 space-y-2.5 pb-6">
        <h2 className="text-base font-semibold text-foreground mb-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>Meus Módulos</h2>

        <Card
          className="p-4 cursor-pointer card-hover group animate-slide-in-right border-l-4 border-l-primary"
          style={{ animationDelay: '0.25s' }}
          onClick={() => onNavigate("myexams")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center flex-shrink-0 group-hover:shadow-lg transition-shadow">
              <FileText className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-semibold text-foreground text-sm">Meus Exames</h3>
                <Badge variant="secondary" className="text-[10px] h-5">
                  {stats.examsCount}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {stats.examsStats.normal} normais • {stats.examsStats.attention} atenção
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="p-4 cursor-pointer card-hover group animate-slide-in-right border-l-4 border-l-accent"
          style={{ animationDelay: '0.3s' }}
          onClick={() => onNavigate("bioimpedance")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0 group-hover:shadow-lg transition-shadow">
              <Scale className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
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
          className="p-4 cursor-pointer card-hover group animate-slide-in-right border-l-4 border-l-primary"
          style={{ animationDelay: '0.35s' }}
          onClick={() => onNavigate("medication")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 group-hover:shadow-lg transition-shadow">
              <Pill className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
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
          className="p-4 cursor-pointer card-hover group animate-slide-in-right border-l-4 border-l-accent"
          style={{ animationDelay: '0.37s' }}
          onClick={() => onNavigate("supplements")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-primary-glow flex items-center justify-center flex-shrink-0 group-hover:shadow-lg transition-shadow">
              <Sparkles className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
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
          className="p-4 cursor-pointer card-hover group animate-slide-in-right border-l-4 border-l-success"
          style={{ animationDelay: '0.4s' }}
          onClick={() => onNavigate("evolution")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-success to-accent flex items-center justify-center flex-shrink-0 group-hover:shadow-lg transition-shadow">
              <TrendingUp className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-semibold text-foreground text-sm">Evolução Geral</h3>
                <Badge 
                  variant={healthScore >= 8 ? "default" : healthScore >= 6 ? "secondary" : "outline"}
                  className={`text-[10px] h-5 ${healthScore >= 8 ? "bg-success text-success-foreground" : ""}`}
                >
                  {healthScore.toFixed(1)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {healthScore >= 8 ? "Progresso excelente" : 
                 healthScore >= 6 ? "Bom progresso" : "Continue se cuidando"}
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="p-4 cursor-pointer card-hover group animate-slide-in-right border-l-4 border-l-warning"
          style={{ animationDelay: '0.45s' }}
          onClick={() => onNavigate("goals")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-warning to-success flex items-center justify-center flex-shrink-0 group-hover:shadow-lg transition-shadow">
              <Target className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
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
          className="p-4 cursor-pointer card-hover group animate-slide-in-right border-l-4 border-l-muted-foreground"
          style={{ animationDelay: '0.5s' }}
          onClick={() => onNavigate("resources")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-muted-foreground to-foreground flex items-center justify-center flex-shrink-0 group-hover:shadow-lg transition-shadow">
              <Database className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm mb-0.5">Recursos</h3>
              <p className="text-xs text-muted-foreground truncate">
                Gerenciar uso e custos
              </p>
            </div>
          </div>
        </Card>
      </div>

      <ExamChatDialog open={showChat} onOpenChange={setShowChat} />
    </div>
  );
};
