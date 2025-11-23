import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingUp, Calendar, Activity } from "lucide-react";

interface MedicationDashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medication: any;
}

export const MedicationDashboard = ({ open, onOpenChange, medication }: MedicationDashboardProps) => {
  if (!medication) return null;

  // Dados históricos de Monjaro
  const monjaroHistory = [
    { date: "01/09", dose: 2.5, fullDate: "2024-09-01" },
    { date: "07/09", dose: 2.5, fullDate: "2024-09-07" },
    { date: "14/09", dose: 2.5, fullDate: "2024-09-14" },
    { date: "21/09", dose: 2.5, fullDate: "2024-09-21" },
    { date: "30/09", dose: 5.0, fullDate: "2024-09-30" },
    { date: "07/10", dose: 5.0, fullDate: "2024-10-07" },
    { date: "14/10", dose: 5.0, fullDate: "2024-10-14" },
    { date: "21/10", dose: 5.0, fullDate: "2024-10-21" },
  ];

  const insights = [
    {
      title: "Titulação Gradual",
      description: "Dose aumentada de 2.5mg para 5.0mg após 4 semanas de tratamento",
      type: "success"
    },
    {
      title: "Adesão Consistente",
      description: "8 doses registradas com intervalos regulares de 7 dias",
      type: "info"
    },
    {
      title: "Próxima Dose",
      description: "Próxima aplicação prevista para 28/10 - Dose: 5.0mg",
      type: "warning"
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent" />
            Dashboard - {medication.medication_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Gráfico de Evolução */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Evolução de Dosagem</h3>
              <Badge variant="outline" className="bg-accent/10 text-accent border-0">
                GLP-1
              </Badge>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monjaroHistory}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis 
                  domain={[0, 7.5]}
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                  label={{ value: 'Dose (mg)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any) => [`${value} mg`, 'Dose']}
                />
                <ReferenceLine y={2.5} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <ReferenceLine y={5.0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <ReferenceLine y={7.5} stroke="hsl(var(--accent))" strokeDasharray="3 3" label="Meta" />
                <Line 
                  type="monotone" 
                  dataKey="dose" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--accent))', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Histórico de Aplicações */}
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Histórico de Aplicações
            </h3>
            <div className="space-y-2">
              {monjaroHistory.map((entry, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <span className="text-sm font-medium">
                      {new Date(entry.fullDate).toLocaleDateString("pt-BR", { 
                        day: '2-digit', 
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-accent/10 text-accent border-0">
                    {entry.dose} mg
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Insights */}
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              Insights do Tratamento
            </h3>
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <div 
                  key={index}
                  className="p-4 rounded-lg border border-border"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      insight.type === 'success' ? 'bg-success' :
                      insight.type === 'warning' ? 'bg-warning' :
                      'bg-info'
                    }`} />
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">{insight.title}</h4>
                      <p className="text-sm text-muted-foreground">{insight.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Estatísticas Gerais */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-accent mb-1">8</div>
              <div className="text-xs text-muted-foreground">Aplicações</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-primary mb-1">5.0 mg</div>
              <div className="text-xs text-muted-foreground">Dose Atual</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-success mb-1">100%</div>
              <div className="text-xs text-muted-foreground">Adesão</div>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
