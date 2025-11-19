import { useState, useEffect } from "react";
import { ArrowLeft, AlertTriangle, TrendingUp, TrendingDown, Users, Activity, FileText, Mail, Download, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { usePDFExport } from "@/hooks/usePDFExport";
import { useEmailReport } from "@/hooks/useEmailReport";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals" | "resources" | "supplements" | "exam-charts" | "alerts" | "period-comparison" | "admin" | "controller" | "wearables";

interface PatientDashboardProps {
  onNavigate: (view: View) => void;
}

interface PatientData {
  id: string;
  display_name: string;
  email: string;
  total_exams: number;
  critical_alerts: number;
  last_exam_date: string | null;
  health_score: number | null;
  latest_wearable?: {
    steps: number | null;
    heart_rate: number | null;
    sleep_hours: number | null;
    date: string;
  } | null;
}

interface CriticalAlert {
  id: string;
  patient_id: string;
  patient_name: string;
  parameter_name: string;
  value: number;
  severity: string;
  created_at: string;
}

export const PatientDashboard = ({ onNavigate }: PatientDashboardProps) => {
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<PatientData[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalExams: 0,
    criticalAlerts: 0,
    avgHealthScore: 0
  });
  
  // Filtros
  const [scoreFilter, setScoreFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [alertFilter, setAlertFilter] = useState<'all' | 'critical' | 'none'>('all');
  const [examPeriodFilter, setExamPeriodFilter] = useState<'all' | 'week' | 'month' | 'old'>('all');
  
  const { generateMonthlyReport } = usePDFExport();
  const { sendMonthlyReport } = useEmailReport();

  useEffect(() => {
    loadControllerData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [patients, scoreFilter, alertFilter, examPeriodFilter]);

  const applyFilters = () => {
    let filtered = [...patients];

    // Filtro por health score
    if (scoreFilter === 'high') {
      filtered = filtered.filter(p => p.health_score && p.health_score >= 80);
    } else if (scoreFilter === 'medium') {
      filtered = filtered.filter(p => p.health_score && p.health_score >= 60 && p.health_score < 80);
    } else if (scoreFilter === 'low') {
      filtered = filtered.filter(p => !p.health_score || p.health_score < 60);
    }

    // Filtro por alertas
    if (alertFilter === 'critical') {
      filtered = filtered.filter(p => p.critical_alerts > 0);
    } else if (alertFilter === 'none') {
      filtered = filtered.filter(p => p.critical_alerts === 0);
    }

    // Filtro por período do último exame
    if (examPeriodFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(p => {
        if (!p.last_exam_date) return examPeriodFilter === 'old';
        
        const examDate = new Date(p.last_exam_date);
        const diffDays = Math.floor((now.getTime() - examDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (examPeriodFilter === 'week') return diffDays <= 7;
        if (examPeriodFilter === 'month') return diffDays <= 30;
        if (examPeriodFilter === 'old') return diffDays > 30;
        
        return true;
      });
    }

    setFilteredPatients(filtered);
  };

  const loadControllerData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Verificar se é controlador
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'controller')
        .single();

      if (!roleData) {
        toast.error("Acesso negado. Você não é um controlador.");
        onNavigate("dashboard");
        return;
      }

      // Buscar pacientes do controlador
      const { data: patientLinks } = await supabase
        .from('controller_patients')
        .select('patient_id')
        .eq('controller_id', user.id);

      if (!patientLinks || patientLinks.length === 0) {
        setLoading(false);
        return;
      }

      const patientIds = patientLinks.map(p => p.patient_id);

      // Buscar dados dos pacientes
      const { data: patientsData } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', patientIds);

      // Buscar estatísticas de cada paciente
      const patientsWithStats = await Promise.all(
        (patientsData || []).map(async (patient) => {
          // Contar exames
          const { count: examCount } = await supabase
            .from('exam_images')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', patient.id);

          // Contar alertas críticos
          const { count: alertCount } = await supabase
            .from('health_alerts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', patient.id)
            .eq('severity', 'critical')
            .eq('status', 'unread');

          // Buscar último exame
          const { data: lastExam } = await supabase
            .from('exam_images')
            .select('exam_date')
            .eq('user_id', patient.id)
            .order('exam_date', { ascending: false })
            .limit(1)
            .single();

          // Buscar health score
          const { data: healthData } = await supabase
            .from('health_analysis')
            .select('health_score')
            .eq('user_id', patient.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Buscar dados de wearables mais recentes
          const { data: wearableData } = await supabase
            .from('wearable_data')
            .select('*')
            .eq('user_id', patient.id)
            .order('date', { ascending: false })
            .limit(1)
            .single();

          return {
            id: patient.id,
            display_name: patient.display_name || 'Sem nome',
            email: '',
            total_exams: examCount || 0,
            critical_alerts: alertCount || 0,
            last_exam_date: lastExam?.exam_date || null,
            health_score: healthData?.health_score || null,
            latest_wearable: wearableData ? {
              steps: wearableData.steps,
              heart_rate: wearableData.heart_rate,
              sleep_hours: wearableData.sleep_hours,
              date: wearableData.date
            } : null
          };
        })
      );

      setPatients(patientsWithStats);

      // Buscar alertas críticos de todos os pacientes
      const { data: alertsData } = await supabase
        .from('health_alerts')
        .select(`
          id,
          user_id,
          parameter_name,
          value,
          severity,
          created_at
        `)
        .in('user_id', patientIds)
        .eq('severity', 'critical')
        .eq('status', 'unread')
        .order('created_at', { ascending: false })
        .limit(20);

      const alertsWithNames = (alertsData || []).map(alert => {
        const patient = patientsWithStats.find(p => p.id === alert.user_id);
        return {
          ...alert,
          patient_id: alert.user_id,
          patient_name: patient?.display_name || 'Desconhecido'
        };
      });

      setCriticalAlerts(alertsWithNames);

      // Calcular estatísticas gerais
      const totalExams = patientsWithStats.reduce((sum, p) => sum + p.total_exams, 0);
      const totalAlerts = patientsWithStats.reduce((sum, p) => sum + p.critical_alerts, 0);
      const healthScores = patientsWithStats.filter(p => p.health_score !== null).map(p => p.health_score!);
      const avgScore = healthScores.length > 0 
        ? healthScores.reduce((sum, s) => sum + s, 0) / healthScores.length 
        : 0;

      setStats({
        totalPatients: patientsWithStats.length,
        totalExams,
        criticalAlerts: totalAlerts,
        avgHealthScore: Math.round(avgScore)
      });

    } catch (error) {
      console.error('Error loading controller data:', error);
      toast.error("Erro ao carregar dados dos pacientes");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500 text-white';
      default: return 'bg-yellow-500 text-white';
    }
  };

  const getHealthScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-50 bg-gradient-to-br from-purple-600 to-indigo-700 text-white p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate("dashboard")}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Dashboard do Controlador</h1>
            <p className="text-sm text-white/80">Visão geral dos pacientes</p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  const now = new Date();
                  await generateMonthlyReport(user.id, String(now.getMonth() + 1), String(now.getFullYear()));
                }
              }}
              className="text-white hover:bg-white/20"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  const now = new Date();
                  await sendMonthlyReport(user.id, String(now.getMonth() + 1), String(now.getFullYear()));
                }
              }}
              className="text-white hover:bg-white/20"
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Filtros */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Filtros Avançados
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Health Score</label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={scoreFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScoreFilter('all')}
                >
                  Todos
                </Button>
                <Button
                  variant={scoreFilter === 'high' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScoreFilter('high')}
                  className="text-green-600"
                >
                  80-100
                </Button>
                <Button
                  variant={scoreFilter === 'medium' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScoreFilter('medium')}
                  className="text-yellow-600"
                >
                  60-79
                </Button>
                <Button
                  variant={scoreFilter === 'low' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScoreFilter('low')}
                  className="text-red-600"
                >
                  0-59
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Alertas Críticos</label>
              <div className="flex gap-2">
                <Button
                  variant={alertFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAlertFilter('all')}
                >
                  Todos
                </Button>
                <Button
                  variant={alertFilter === 'critical' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAlertFilter('critical')}
                >
                  Com Alertas
                </Button>
                <Button
                  variant={alertFilter === 'none' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAlertFilter('none')}
                >
                  Sem Alertas
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Último Exame</label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={examPeriodFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExamPeriodFilter('all')}
                >
                  Todos
                </Button>
                <Button
                  variant={examPeriodFilter === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExamPeriodFilter('week')}
                >
                  7 dias
                </Button>
                <Button
                  variant={examPeriodFilter === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExamPeriodFilter('month')}
                >
                  30 dias
                </Button>
                <Button
                  variant={examPeriodFilter === 'old' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExamPeriodFilter('old')}
                >
                  +30 dias
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Mostrando {filteredPatients.length} de {patients.length} pacientes
          </div>
        </Card>

        {/* Estatísticas Gerais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.totalPatients}</p>
                <p className="text-sm text-muted-foreground">Pacientes</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.totalExams}</p>
                <p className="text-sm text-muted-foreground">Exames</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{stats.criticalAlerts}</p>
                <p className="text-sm text-muted-foreground">Alertas Críticos</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-green-600" />
              <div>
                <p className={`text-2xl font-bold ${getHealthScoreColor(stats.avgHealthScore)}`}>
                  {stats.avgHealthScore}
                </p>
                <p className="text-sm text-muted-foreground">Score Médio</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="patients" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="patients">Pacientes</TabsTrigger>
            <TabsTrigger value="alerts">Alertas Críticos</TabsTrigger>
          </TabsList>

          <TabsContent value="patients" className="space-y-4 mt-4">
            {loading ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Carregando pacientes...</p>
              </Card>
            ) : patients.length === 0 ? (
              <Card className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum paciente atribuído</p>
              </Card>
            ) : (
              patients.map(patient => (
                <Card key={patient.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{patient.display_name}</h3>
                      <p className="text-sm text-muted-foreground">ID: {patient.id.slice(0, 8)}...</p>
                    </div>
                    {patient.health_score && (
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${getHealthScoreColor(patient.health_score)}`}>
                          {patient.health_score}
                        </p>
                        <p className="text-xs text-muted-foreground">Score</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Exames</p>
                      <p className="font-semibold">{patient.total_exams}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Alertas</p>
                      <p className="font-semibold text-destructive">{patient.critical_alerts}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Último exame</p>
                      <p className="font-semibold">
                        {patient.last_exam_date 
                          ? new Date(patient.last_exam_date).toLocaleDateString('pt-BR') 
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {patient.latest_wearable && (
                    <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-xs">
                      {patient.latest_wearable.steps && (
                        <div className="text-center">
                          <p className="text-muted-foreground">Passos</p>
                          <p className="font-semibold text-primary">{patient.latest_wearable.steps.toLocaleString()}</p>
                        </div>
                      )}
                      {patient.latest_wearable.heart_rate && (
                        <div className="text-center">
                          <p className="text-muted-foreground">BPM</p>
                          <p className="font-semibold text-destructive">{patient.latest_wearable.heart_rate}</p>
                        </div>
                      )}
                      {patient.latest_wearable.sleep_hours && (
                        <div className="text-center">
                          <p className="text-muted-foreground">Sono</p>
                          <p className="font-semibold text-info">{patient.latest_wearable.sleep_hours}h</p>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4 mt-4">
            {criticalAlerts.length === 0 ? (
              <Card className="p-8 text-center">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum alerta crítico no momento</p>
              </Card>
            ) : (
              criticalAlerts.map(alert => (
                <Card key={alert.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                        <h3 className="font-semibold">{alert.patient_name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {new Date(alert.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <Badge className={getSeverityColor(alert.severity)}>
                      {alert.severity.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-medium mb-1">{alert.parameter_name}</p>
                    <p className="text-2xl font-bold text-destructive">{alert.value}</p>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
