import { ArrowLeft, Target, Plus, TrendingUp, Trophy, Zap, Award, Star, Flame, Medal, Crown, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar } from "recharts";

type View = "dashboard" | "exams" | "myexams" | "bioimpedance" | "medication" | "evolution" | "profile" | "goals";

interface GoalsModuleProps {
  onNavigate: (view: View) => void;
}

export const GoalsModule = ({ onNavigate }: GoalsModuleProps) => {
  // Dados fictícios de gamificação
  const userLevel = {
    current: 12,
    xp: 3450,
    xpToNext: 4000,
    title: "Atleta Dedicado"
  };

  const stats = {
    totalPoints: 15680,
    streak: 23,
    goalsCompleted: 8,
    totalGoals: 12,
    weekProgress: 85
  };

  const badges = [
    { id: 1, name: "Primeira Meta", icon: "🎯", earned: true, date: "15/08/2024" },
    { id: 2, name: "Semana Perfeita", icon: "⭐", earned: true, date: "22/08/2024" },
    { id: 3, name: "Persistente", icon: "💪", earned: true, date: "01/09/2024" },
    { id: 4, name: "Mestre do Peso", icon: "⚖️", earned: true, date: "10/09/2024" },
    { id: 5, name: "30 Dias Seguidos", icon: "🔥", earned: false, date: null },
    { id: 6, name: "Campeão", icon: "👑", earned: false, date: null }
  ];

  const goals = [
    {
      id: 1,
      title: "Perder 5kg",
      type: "Peso",
      current: 78,
      target: 75,
      start: 80,
      progress: 60,
      daysLeft: 18,
      icon: "⚖️",
      color: "text-blue-600"
    },
    {
      id: 2,
      title: "Reduzir Gordura",
      type: "Gordura Corporal",
      current: 18,
      target: 15,
      start: 22,
      progress: 57,
      daysLeft: 25,
      icon: "📊",
      color: "text-orange-600"
    },
    {
      id: 3,
      title: "Ganhar Massa",
      type: "Massa Muscular",
      current: 45,
      target: 48,
      start: 43,
      progress: 40,
      daysLeft: 35,
      icon: "💪",
      color: "text-green-600"
    }
  ];

  const weeklyProgress = [
    { day: "Seg", progress: 100 },
    { day: "Ter", progress: 85 },
    { day: "Qua", progress: 95 },
    { day: "Qui", progress: 100 },
    { day: "Sex", progress: 75 },
    { day: "Sáb", progress: 90 },
    { day: "Dom", progress: 80 }
  ];

  const monthlyData = [
    { month: "Jun", points: 980 },
    { month: "Jul", points: 1250 },
    { month: "Ago", points: 1580 },
    { month: "Set", points: 1820 },
    { month: "Out", points: 2150 }
  ];

  const radialData = [
    { name: "Progresso Geral", value: stats.weekProgress, fill: "hsl(var(--accent))" }
  ];

  const insights = [
    {
      icon: "🎉",
      title: "Excelente Progresso!",
      description: "Você completou 3 metas este mês. Continue assim!"
    },
    {
      icon: "🔥",
      title: "Sequência de 23 dias",
      description: "Faltam apenas 7 dias para conquistar o badge de 30 dias!"
    },
    {
      icon: "📈",
      title: "Melhoria Consistente",
      description: "Seu desempenho aumentou 35% comparado ao mês anterior"
    }
  ];

  return (
    <div className="animate-fade-in pb-20">
      {/* Header Gamificado */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-accent via-accent/90 to-accent text-white">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <button 
              onClick={() => onNavigate("dashboard")}
              className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-white">Metas & Conquistas</h1>
              <p className="text-sm text-white/80">Level {userLevel.current} • {userLevel.title}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{stats.totalPoints}</div>
              <div className="text-xs text-white/80">pontos</div>
            </div>
          </div>

          {/* Barra de XP */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-white/90">
              <span>Level {userLevel.current}</span>
              <span>{userLevel.xp} / {userLevel.xpToNext} XP</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${(userLevel.xp / userLevel.xpToNext) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-4">
        <div className="grid grid-cols-4 gap-3 mb-6">
          <Card className="p-3 text-center">
            <Flame className="w-6 h-6 text-orange-500 mx-auto mb-1" />
            <div className="text-xl font-bold text-foreground">{stats.streak}</div>
            <div className="text-[10px] text-muted-foreground">dias</div>
          </Card>
          <Card className="p-3 text-center">
            <Trophy className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
            <div className="text-xl font-bold text-foreground">{stats.goalsCompleted}</div>
            <div className="text-[10px] text-muted-foreground">metas</div>
          </Card>
          <Card className="p-3 text-center">
            <Star className="w-6 h-6 text-accent mx-auto mb-1" />
            <div className="text-xl font-bold text-foreground">{badges.filter(b => b.earned).length}</div>
            <div className="text-[10px] text-muted-foreground">badges</div>
          </Card>
          <Card className="p-3 text-center">
            <Zap className="w-6 h-6 text-blue-500 mx-auto mb-1" />
            <div className="text-xl font-bold text-foreground">{stats.weekProgress}%</div>
            <div className="text-[10px] text-muted-foreground">semana</div>
          </Card>
        </div>

        {/* Progresso Semanal com Gráfico Radial */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Progresso Semanal</h3>
            <Badge variant="outline" className="bg-accent/10 text-accent border-0">
              {stats.weekProgress}%
            </Badge>
          </div>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <RadialBarChart 
                cx="50%" 
                cy="50%" 
                innerRadius="60%" 
                outerRadius="90%" 
                data={radialData}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar
                  dataKey="value"
                  cornerRadius={10}
                  fill="hsl(var(--accent))"
                />
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-4xl font-bold fill-foreground"
                >
                  {stats.weekProgress}%
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-7 gap-2 mt-4">
            {weeklyProgress.map((day) => (
              <div key={day.day} className="text-center">
                <div className="text-[10px] text-muted-foreground mb-1">{day.day}</div>
                <div className={`h-12 rounded-lg flex items-end justify-center ${
                  day.progress === 100 ? 'bg-success' : 
                  day.progress >= 80 ? 'bg-accent' : 
                  'bg-muted'
                }`}>
                  <div className="text-[10px] text-white font-medium mb-1">{day.progress}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Metas Ativas */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-accent" />
              Metas Ativas
            </h3>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Nova
            </Button>
          </div>
          <div className="space-y-3">
            {goals.map((goal) => (
              <Card key={goal.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-3xl">{goal.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1">{goal.title}</h4>
                    <div className="text-sm text-muted-foreground">
                      {goal.current}{goal.type === "Peso" ? "kg" : goal.type === "Gordura Corporal" ? "%" : "kg"} → {goal.target}{goal.type === "Peso" ? "kg" : goal.type === "Gordura Corporal" ? "%" : "kg"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-accent">{goal.progress}%</div>
                    <div className="text-xs text-muted-foreground">{goal.daysLeft} dias</div>
                  </div>
                </div>
                <Progress value={goal.progress} className="mb-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Início: {goal.start}{goal.type === "Peso" ? "kg" : "%"}</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Gráfico de Pontos Mensais */}
        <Card className="p-6 mb-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-success" />
            Evolução de Pontos
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: any) => [`${value} pts`, 'Pontos']}
              />
              <Line 
                type="monotone" 
                dataKey="points" 
                stroke="hsl(var(--accent))" 
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--accent))', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Badges/Conquistas */}
        <Card className="p-6 mb-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            Conquistas
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {badges.map((badge) => (
              <div 
                key={badge.id} 
                className={`p-4 rounded-lg text-center transition-all ${
                  badge.earned 
                    ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-2 border-yellow-400 shadow-lg' 
                    : 'bg-muted/30 opacity-50'
                }`}
              >
                <div className="text-3xl mb-2">{badge.icon}</div>
                <div className="text-xs font-medium text-foreground">{badge.name}</div>
                {badge.earned && badge.date && (
                  <div className="text-[10px] text-muted-foreground mt-1">{badge.date}</div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Insights Motivacionais */}
        <Card className="p-6 mb-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Medal className="w-5 h-5 text-accent" />
            Insights
          </h3>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div 
                key={index}
                className="p-4 rounded-lg bg-gradient-to-r from-accent/5 to-transparent border-l-4 border-accent"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{insight.icon}</div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Ranking Fictício */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            Ranking Semanal
          </h3>
          <div className="space-y-3">
            {[
              { rank: 1, name: "Você", points: 1250, avatar: "👤", current: true },
              { rank: 2, name: "Ana Silva", points: 1180, avatar: "👩" },
              { rank: 3, name: "João Pedro", points: 1150, avatar: "👨" },
              { rank: 4, name: "Maria Costa", points: 980, avatar: "👩" },
              { rank: 5, name: "Carlos Lima", points: 920, avatar: "👨" }
            ].map((user) => (
              <div 
                key={user.rank}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  user.current 
                    ? 'bg-gradient-to-r from-accent/10 to-transparent border border-accent' 
                    : 'bg-muted/30'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  user.rank === 1 ? 'bg-yellow-500 text-white' :
                  user.rank === 2 ? 'bg-gray-400 text-white' :
                  user.rank === 3 ? 'bg-orange-600 text-white' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {user.rank}
                </div>
                <div className="text-2xl">{user.avatar}</div>
                <div className="flex-1">
                  <div className="font-semibold text-foreground">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.points} pontos</div>
                </div>
                {user.rank <= 3 && (
                  <Trophy className={`w-5 h-5 ${
                    user.rank === 1 ? 'text-yellow-500' :
                    user.rank === 2 ? 'text-gray-400' :
                    'text-orange-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
