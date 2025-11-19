import { Home, FileText, TrendingUp, User } from "lucide-react";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals" | "resources";

interface BottomNavProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

export const BottomNav = ({ currentView, onNavigate }: BottomNavProps) => {
  const navItems = [
    { id: "dashboard" as View, icon: Home, label: "Início" },
    { id: "myexams" as View, icon: FileText, label: "Exames" },
    { id: "evolution" as View, icon: TrendingUp, label: "Evolução" },
    { id: "profile" as View, icon: User, label: "Perfil" },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-background border-t border-border shadow-lg">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center py-2 px-4 rounded-lg transition-all ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`w-6 h-6 mb-1 ${isActive ? "animate-pulse-glow" : ""}`} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
