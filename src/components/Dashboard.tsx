import { useEffect, useState } from "react";
import { Activity, FileText, Scale, Pill, TrendingUp, LogOut, Bell, Sparkles, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { HealthAlerts } from "./HealthAlerts";
import { Badge } from "@/components/ui/badge";
import { PatientAnalysisView } from "./PatientAnalysisView";
import { ExamChatDialog } from "./ExamChatDialog";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals";

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
      <div className="bg-gradient-header text-white p-6 pb-8 rounded-b-3xl animate-slide-in-left">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Olá, {getDisplayName()}! 👋</h1>
            <p className="text-white/90 text-sm mt-1">
              Bem-vindo ao Zoe Med
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowChat(true)}
              className="text-white hover:bg-white/20"
              title="Chat com IA sobre seus exames"
            >
              <Sparkles className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAlerts(!showAlerts)}
              className="text-white hover:bg-white/20 relative"
            >
              <Bell className="w-5 h-5" />
              {stats.unreadAlerts > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {stats.unreadAlerts}
                </Badge>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-white hover:bg-white/20"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Health Score */}
      <div className="px-6 -mt-4 mb-6 animate-scale-in" style={{ animationDelay: '0.1s' }}>
        <Card 
          className={`bg-gradient-to-br ${getScoreColor()} text-white p-6 shadow-card-hover cursor-pointer card-hover group`}
          onClick={() => onNavigate("evolution")}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium mb-1">Score de Saúde</div>
              <div className="text-4xl font-bold">{healthScore.toFixed(1)}</div>
              <div className="text-xs mt-2 text-white/90">
                {healthScore >= 8 ? "Excelente progresso! 🎉" : 
                 healthScore >= 6 ? "Bom progresso! 💪" : "Continue se cuidando! 🌟"}
              </div>
            </div>
            <div className="relative w-24 h-24">
              <svg className="transform -rotate-90 w-24 h-24">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="white"
                  strokeOpacity="0.2"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="white"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - healthScorePercent)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Activity className={`w-8 h-8 ${getScoreIconColor()} group-hover:animate-pulse-glow`} />
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
      <div className="px-6 space-y-3 pb-6">
        <h2 className="text-lg font-semibold text-foreground mb-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>Meus Módulos</h2>

        <Card
          className="p-5 cursor-pointer card-hover group animate-slide-in-right"
          style={{ animationDelay: '0.25s' }}
          onClick={() => onNavigate("myexams")}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center flex-shrink-0 group-hover:shadow-lg transition-shadow">
              <FileText className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-foreground">Meus Exames</h3>
                <Badge variant="secondary" className="text-xs">
                  {stats.examsCount}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {stats.examsStats.normal} normais • {stats.examsStats.attention} atenção
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="p-5 cursor-pointer card-hover group animate-slide-in-right"
          style={{ animationDelay: '0.3s' }}
          onClick={() => onNavigate("bioimpedance")}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0 group-hover:shadow-lg transition-shadow">
              <Scale className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-foreground">Bioimpedância</h3>
                {stats.latestBioimpedance && (
                  <Badge variant="secondary" className="text-xs">
                    {stats.latestBioimpedance.weight}kg
                  </Badge>
                )}
              </div>
              {stats.latestBioimpedance ? (
                <p className="text-sm text-muted-foreground">
                  {stats.weightChange !== null && (
                    <span className={stats.weightChange <= 0 ? "text-success" : "text-warning"}>
                      {stats.weightChange <= 0 ? '↓' : '↑'} {Math.abs(stats.weightChange).toFixed(1)}kg
                    </span>
                  )}
                  {stats.weightChange !== null && ' • '}
                  {stats.latestBioimpedance.bodyFat.toFixed(1)}% gordura
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma medição registrada</p>
              )}
            </div>
          </div>
        </Card>

        <Card
          className="p-5 cursor-pointer card-hover group animate-slide-in-right"
          style={{ animationDelay: '0.35s' }}
          onClick={() => onNavigate("medication")}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 group-hover:shadow-lg transition-shadow">
              <Pill className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-foreground">Medicações</h3>
                <Badge variant="secondary" className="text-xs">
                  {stats.medicationsCount}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {stats.medicationsCount === 1 ? 'medicação ativa' : 'medicações ativas'}
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="p-5 cursor-pointer card-hover group animate-slide-in-right"
          style={{ animationDelay: '0.4s' }}
          onClick={() => onNavigate("evolution")}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-success to-accent flex items-center justify-center flex-shrink-0 group-hover:shadow-lg transition-shadow">
              <TrendingUp className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-foreground">Evolução Geral</h3>
                <Badge 
                  variant={healthScore >= 8 ? "default" : healthScore >= 6 ? "secondary" : "outline"}
                  className={healthScore >= 8 ? "bg-success text-success-foreground" : ""}
                >
                  {healthScore.toFixed(1)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {healthScore >= 8 ? "Progresso excelente" : 
                 healthScore >= 6 ? "Bom progresso" : "Continue se cuidando"}
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="p-5 cursor-pointer card-hover group animate-slide-in-right"
          style={{ animationDelay: '0.45s' }}
          onClick={() => onNavigate("goals")}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-warning to-success flex items-center justify-center flex-shrink-0 group-hover:shadow-lg transition-shadow">
              <Target className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-foreground">Metas</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Defina e acompanhe seus objetivos
              </p>
            </div>
          </div>
        </Card>
      </div>

      <ExamChatDialog open={showChat} onOpenChange={setShowChat} />
    </div>
  );
};
