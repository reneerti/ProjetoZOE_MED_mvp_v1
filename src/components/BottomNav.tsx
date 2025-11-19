import { Home, FileText, TrendingUp, User } from "lucide-react";
import { useState, useEffect } from "react";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals" | "resources" | "supplements" | "exam-charts" | "alerts" | "period-comparison";

interface BottomNavProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

export const BottomNav = ({ currentView, onNavigate }: BottomNavProps) => {
  const [scrollingUp, setScrollingUp] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < lastScrollY && currentScrollY > 100) {
        setScrollingUp(true);
      } else {
        setScrollingUp(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const navItems = [
    { id: "dashboard" as View, icon: Home, label: "Início" },
    { id: "myexams" as View, icon: FileText, label: "Exames" },
    { id: "evolution" as View, icon: TrendingUp, label: "Evolução" },
    { id: "profile" as View, icon: User, label: "Perfil" },
  ];

  return (
    <nav className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl border-t border-border/50 shadow-md z-50 transition-all duration-300 ${
      scrollingUp 
        ? 'bg-white/40 dark:bg-card/40 backdrop-blur-xl' 
        : 'bg-white/80 dark:bg-card/80 backdrop-blur-sm'
    }`}>
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
                  : "text-muted-foreground/60 hover:text-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 mb-1`} strokeWidth={2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
