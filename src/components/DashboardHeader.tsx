import { Activity, Bell, Sparkles, LogOut, Moon, Sun, ChevronDown, ChevronRight, LineChart, Users, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { View } from "@/types/views";

interface DashboardHeaderProps {
  isAdmin: boolean;
  unreadAlerts: number;
  currentView: View;
  onShowChat: () => void;
  onShowAlerts: () => void;
  onNavigate: (view: View) => void;
  onSignOut: () => void;
}

const viewLabels: Record<View, string> = {
  dashboard: "Dashboard",
  exams: "Resultados",
  "exam-upload": "Upload de Exames",
  "exams-by-date": "Exames por Data",
  "health-dashboard": "Dashboard de Saúde",
  myexams: "Meus Exames",
  bioimpedance: "Bioimpedância",
  medication: "Medicações",
  evolution: "Evolução Geral",
  profile: "Perfil",
  goals: "Metas",
  resources: "Recursos",
  supplements: "Suplementos",
  "exam-charts": "Gráficos de Exames",
  alerts: "Alertas",
  "period-comparison": "Comparação de Períodos",
  "patient-timeline": "Linha do Tempo",
  admin: "Administração",
  controller: "Controle de Pacientes",
  wearables: "Wearables",
  "ai-monitoring": "Monitoramento IA"
};

export const DashboardHeader = ({
  isAdmin,
  unreadAlerts,
  currentView,
  onShowChat,
  onShowAlerts,
  onNavigate,
  onSignOut
}: DashboardHeaderProps) => {
  const { theme, setTheme } = useTheme();

  return (
    <div className={`sticky top-0 z-50 border-b ${isAdmin ? 'bg-[#6B7280] text-white' : 'bg-card/95 backdrop-blur-sm border-border'}`}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          {/* Logo and Breadcrumbs */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isAdmin ? 'bg-white/20' : 'bg-gradient-to-br from-primary/10 to-accent/10'}`}>
              <Activity className={`w-5 h-5 ${isAdmin ? 'text-white' : 'text-primary'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-xl font-semibold ${isAdmin ? 'text-white' : 'text-foreground'}`}>ZoeMed</h1>
                {isAdmin && (
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-[10px] px-1.5 py-0">
                    Admin
                  </Badge>
                )}
              </div>
              {/* Breadcrumbs */}
              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => currentView !== "dashboard" && onNavigate("dashboard")}
                  className={`${isAdmin ? 'text-white/80 hover:text-white' : 'text-muted-foreground hover:text-foreground'} ${currentView === "dashboard" ? 'font-semibold' : ''} transition-colors`}
                >
                  Dashboard
                </button>
                {currentView !== "dashboard" && (
                  <>
                    <ChevronRight className={`w-3 h-3 ${isAdmin ? 'text-white/60' : 'text-muted-foreground'}`} />
                    <span className={`${isAdmin ? 'text-white font-semibold' : 'text-foreground font-semibold'}`}>
                      {viewLabels[currentView]}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Admin Menu Dropdown */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 gap-1"
                  >
                    <SettingsIcon className="w-4 h-4" />
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border-border z-[100]">
                  <DropdownMenuLabel>Menu Admin</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onNavigate("resources")}
                    className="cursor-pointer"
                  >
                    <SettingsIcon className="w-4 h-4 mr-2" />
                    Recursos
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onNavigate("ai-monitoring")}
                    className="cursor-pointer"
                  >
                    <LineChart className="w-4 h-4 mr-2" />
                    Monitoramento IA
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onNavigate("admin")}
                    className="cursor-pointer"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Gestão de Usuários
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`h-9 w-9 ${isAdmin ? 'text-white hover:bg-white/20' : ''}`}
              title="Alternar tema"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>

            {/* Chat IA */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onShowChat}
              className={`h-9 w-9 ${isAdmin ? 'text-white hover:bg-white/20' : ''}`}
              title="Chat com IA sobre seus exames"
            >
              <Sparkles className="w-5 h-5" />
            </Button>

            {/* Alerts */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onShowAlerts}
              className={`relative h-9 w-9 ${isAdmin ? 'text-white hover:bg-white/20' : ''}`}
            >
              <Bell className="w-5 h-5" />
              {unreadAlerts > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px]"
                >
                  {unreadAlerts}
                </Badge>
              )}
            </Button>

            {/* Sign Out */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onSignOut}
              className={`h-9 w-9 ${isAdmin ? 'text-white hover:bg-white/20' : ''}`}
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
