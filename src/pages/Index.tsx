import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dashboard } from "@/components/Dashboard";
import { ExamsModule } from "@/components/ExamsModule";
import { MyExamsModule } from "@/components/MyExamsModule";
import { BioimpedanceModuleRevised } from "@/components/BioimpedanceModuleRevised";
import { ExamEvolutionCharts } from "@/components/ExamEvolutionCharts";
import { CriticalAlertsDashboard } from "@/components/CriticalAlertsDashboard";
import { PeriodComparisonView } from "@/components/PeriodComparisonView";
import { PatientAnalysisView } from "@/components/PatientAnalysisView";
import { PatientTimelineView } from "@/components/PatientTimelineView";
import { MedicationModule } from "@/components/MedicationModule";
import { EvolutionModule } from "@/components/EvolutionModule";
import { GoalsModule } from "@/components/GoalsModule";
import { ResourceDashboard } from "@/components/ResourceDashboard";
import { ProfileModule } from "@/components/ProfileModule";
import { SupplementsModule } from "@/components/SupplementsModule";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";
import { ExamNotifications } from "@/components/ExamNotifications";
import { Logo } from "@/components/Logo";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { PatientDashboard } from "@/components/controller/PatientDashboard";
import { WearablesModule } from "@/components/WearablesModule";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { AIMonitoringDashboard } from "@/components/AIMonitoringDashboard";
import { AIUsageNotifications } from "@/components/AIUsageNotifications";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals" | "resources" | "supplements" | "exam-charts" | "alerts" | "period-comparison" | "patient-timeline" | "admin" | "controller" | "wearables" | "ai-monitoring";

const Index = () => {
  const [currentView, setCurrentView] = useState<View>(() => {
    const savedView = localStorage.getItem('currentView');
    return (savedView as View) || "dashboard";
  });
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    localStorage.setItem('currentView', currentView);
  }, [currentView]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }

    // Listener para navegar ao dashboard de AI
    const handleNavigateToAI = () => {
      setCurrentView('ai-monitoring');
    };
    window.addEventListener('navigate-to-ai-monitoring', handleNavigateToAI);
    
    return () => {
      window.removeEventListener('navigate-to-ai-monitoring', handleNavigateToAI);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const renderView = () => {
    const viewKey = currentView;
    switch (currentView) {
      case "dashboard":
        return <div key={viewKey} className="animate-fade-in"><Dashboard onNavigate={setCurrentView} currentView={currentView} /></div>;
      case "exams":
        return <div key={viewKey} className="animate-slide-in-right"><ExamsModule onNavigate={setCurrentView} /></div>;
      case "myexams":
        return <div key={viewKey} className="animate-slide-in-right"><MyExamsModule onNavigate={setCurrentView} /></div>;
      case "bioimpedance":
        return <div key={viewKey} className="animate-slide-in-right"><BioimpedanceModuleRevised onNavigate={setCurrentView} /></div>;
      case "medication":
        return <div key={viewKey} className="animate-slide-in-right"><MedicationModule onNavigate={setCurrentView} /></div>;
      case "evolution":
        return <div key={viewKey} className="animate-slide-in-right"><EvolutionModule onNavigate={setCurrentView} /></div>;
      case "goals":
        return <div key={viewKey} className="animate-slide-in-right"><GoalsModule onNavigate={setCurrentView} /></div>;
      case "resources":
        return (
          <div key={viewKey} className="animate-slide-in-right">
            <div className="sticky top-0 z-50 bg-gradient-header text-white p-4 pb-6 shadow-lg mb-6">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentView("dashboard")}
                  className="text-white hover:bg-white/20 h-9 w-9"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold">Recursos</h1>
                    <span className="px-2 py-0.5 text-xs font-semibold bg-white/20 rounded-full">
                      Admin
                    </span>
                  </div>
                  <p className="text-white/80 text-xs mt-0.5">Gerenciar uso e custos</p>
                </div>
              </div>
            </div>
            <div className="px-6">
              <ResourceDashboard onNavigate={setCurrentView} />
            </div>
          </div>
        );
      case "profile":
        return <div key={viewKey} className="animate-slide-in-right"><ProfileModule onNavigate={setCurrentView} /></div>;
      case "supplements":
        return <div key={viewKey} className="animate-slide-in-right"><SupplementsModule onNavigate={setCurrentView} /></div>;
      case "exam-charts":
        return <div key={viewKey} className="animate-slide-in-right"><ExamEvolutionCharts onNavigate={setCurrentView} /></div>;
      case "alerts":
        return <div key={viewKey} className="animate-slide-in-right"><CriticalAlertsDashboard onNavigate={setCurrentView} /></div>;
      case "period-comparison":
        return <div key={viewKey} className="animate-slide-in-right"><PeriodComparisonView onNavigate={setCurrentView} /></div>;
      case "patient-timeline":
        return <div key={viewKey} className="animate-slide-in-right"><PatientTimelineView onNavigate={setCurrentView} /></div>;
      case "admin":
        return <div key={viewKey} className="animate-slide-in-right"><AdminDashboard onNavigate={setCurrentView} /></div>;
      case "controller":
        return <div key={viewKey} className="animate-slide-in-right"><PatientDashboard onNavigate={setCurrentView} /></div>;
      case "wearables":
        return <div key={viewKey} className="animate-slide-in-right"><WearablesModule onNavigate={setCurrentView} /></div>;
      case "ai-monitoring":
        return (
          <div key={viewKey} className="animate-slide-in-right">
            <div className="sticky top-0 z-50 bg-gradient-header text-white p-4 pb-6 shadow-lg mb-6">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentView("dashboard")}
                  className="text-white hover:bg-white/20 h-9 w-9"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold">Monitoramento de IA</h1>
                    <span className="px-2 py-0.5 text-xs font-semibold bg-white/20 rounded-full">
                      Admin
                    </span>
                  </div>
                  <p className="text-white/80 text-xs mt-0.5">Uso de Lovable AI e Gemini</p>
                </div>
              </div>
            </div>
            <div className="px-6">
              <AIMonitoringDashboard />
            </div>
          </div>
        );
      default:
        return <div key={viewKey} className="animate-fade-in"><Dashboard onNavigate={setCurrentView} currentView={currentView} /></div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary">
      <OnboardingTutorial />
      <ExamNotifications />
      <AIUsageNotifications />
      <PWAInstallPrompt />
      <div className="w-full max-w-2xl mx-auto bg-background min-h-screen shadow-2xl">
        <div className="pb-20">
          {renderView()}
        </div>
        <BottomNav currentView={currentView} onNavigate={setCurrentView} />
      </div>
    </div>
  );
};

export default Index;
