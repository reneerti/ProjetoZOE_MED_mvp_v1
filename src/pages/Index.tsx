import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dashboard } from "@/components/Dashboard";
import { ExamsModule } from "@/components/ExamsModule";
import { MyExamsModule } from "@/components/MyExamsModule";
import { BioimpedanceModule } from "@/components/BioimpedanceModule";
import { MedicationModule } from "@/components/MedicationModule";
import { EvolutionModule } from "@/components/EvolutionModule";
import { GoalsModule } from "@/components/GoalsModule";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals";

const Index = () => {
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

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
        return <div key={viewKey} className="animate-fade-in"><Dashboard onNavigate={setCurrentView} /></div>;
      case "exams":
        return <div key={viewKey} className="animate-slide-in-right"><ExamsModule onNavigate={setCurrentView} /></div>;
      case "myexams":
        return <div key={viewKey} className="animate-slide-in-right"><MyExamsModule onNavigate={setCurrentView} /></div>;
      case "bioimpedance":
        return <div key={viewKey} className="animate-slide-in-right"><BioimpedanceModule onNavigate={setCurrentView} /></div>;
      case "medication":
        return <div key={viewKey} className="animate-slide-in-right"><MedicationModule onNavigate={setCurrentView} /></div>;
      case "evolution":
        return <div key={viewKey} className="animate-slide-in-right"><EvolutionModule onNavigate={setCurrentView} /></div>;
      case "goals":
        return <div key={viewKey} className="animate-slide-in-right"><GoalsModule onNavigate={setCurrentView} /></div>;
      default:
        return <div key={viewKey} className="animate-fade-in"><Dashboard onNavigate={setCurrentView} /></div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary">
      <div className="max-w-md mx-auto bg-background min-h-screen shadow-2xl">
        <div className="pb-20">
          {renderView()}
        </div>
        <BottomNav currentView={currentView} onNavigate={setCurrentView} />
      </div>
    </div>
  );
};

export default Index;
