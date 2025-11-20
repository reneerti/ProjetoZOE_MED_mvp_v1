import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, subHours, startOfHour } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";

interface HourlyData {
  hour: string;
  lovable_ai: number;
  gemini_api: number;
  groq_api: number;
}

const COLORS = {
  lovable_ai: '#8B5CF6',
  gemini_api: '#10B981',
  groq_api: '#3B82F6'
};

export const AIProviderTimelineChart = () => {
  const { user } = useAuth();
  const [chartData, setChartData] = useState<HourlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchTimelineData = async () => {
      setLoading(true);
      
      // Buscar logs das últimas 24 horas
      const twentyFourHoursAgo = subHours(new Date(), 24).toISOString();
      
      const { data: logs } = await supabase
        .from('ai_usage_logs')
        .select('created_at, provider')
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: true });

      if (logs) {
        // Agrupar por hora
        const hourlyMap = new Map<string, { lovable_ai: number; gemini_api: number; groq_api: number }>();
        
        // Inicializar todas as 24 horas com 0
        for (let i = 23; i >= 0; i--) {
          const hourDate = startOfHour(subHours(new Date(), i));
          const hourKey = format(hourDate, 'HH:00');
          hourlyMap.set(hourKey, { lovable_ai: 0, gemini_api: 0, groq_api: 0 });
        }

        // Contar requisições por hora e provider
        logs.forEach(log => {
          const logDate = new Date(log.created_at);
          const hourKey = format(startOfHour(logDate), 'HH:00');
          const current = hourlyMap.get(hourKey);
          
          if (current) {
            if (log.provider === 'lovable_ai') current.lovable_ai++;
            else if (log.provider === 'gemini_api') current.gemini_api++;
            else if (log.provider === 'groq_api') current.groq_api++;
          }
        });

        // Converter para array
        const data: HourlyData[] = Array.from(hourlyMap.entries()).map(([hour, counts]) => ({
          hour,
          lovable_ai: counts.lovable_ai,
          gemini_api: counts.gemini_api,
          groq_api: counts.groq_api
        }));

        setChartData(data);
      }
      
      setLoading(false);
    };

    fetchTimelineData();

    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchTimelineData, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição Temporal de Uso</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalRequests = chartData.reduce((sum, hour) => 
    sum + hour.lovable_ai + hour.gemini_api + hour.groq_api, 0
  );

  const lovablePercentage = totalRequests > 0 
    ? ((chartData.reduce((sum, h) => sum + h.lovable_ai, 0) / totalRequests) * 100).toFixed(1)
    : '0';
  
  const geminiPercentage = totalRequests > 0
    ? ((chartData.reduce((sum, h) => sum + h.gemini_api, 0) / totalRequests) * 100).toFixed(1)
    : '0';
    
  const groqPercentage = totalRequests > 0
    ? ((chartData.reduce((sum, h) => sum + h.groq_api, 0) / totalRequests) * 100).toFixed(1)
    : '0';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Distribuição Temporal de Uso (24h)
            </CardTitle>
            <CardDescription>
              Requisições por hora nos últimos dias
            </CardDescription>
          </div>
          <div className="text-right text-sm space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS.lovable_ai }} />
              <span className="text-muted-foreground">Lovable AI: {lovablePercentage}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS.gemini_api }} />
              <span className="text-muted-foreground">Gemini API: {geminiPercentage}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS.groq_api }} />
              <span className="text-muted-foreground">Groq API: {groqPercentage}%</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="hour" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              label={{ value: 'Requisições', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              labelFormatter={(value) => `Hora: ${value}`}
              formatter={(value: number, name: string) => {
                const displayName = name === 'lovable_ai' ? 'Lovable AI' :
                                   name === 'gemini_api' ? 'Gemini API' :
                                   name === 'groq_api' ? 'Groq API' : name;
                return [value, displayName];
              }}
            />
            <Legend 
              formatter={(value: string) => {
                if (value === 'lovable_ai') return 'Lovable AI';
                if (value === 'gemini_api') return 'Gemini API';
                if (value === 'groq_api') return 'Groq API';
                return value;
              }}
            />
            <Line 
              type="monotone" 
              dataKey="lovable_ai" 
              stroke={COLORS.lovable_ai}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line 
              type="monotone" 
              dataKey="gemini_api" 
              stroke={COLORS.gemini_api}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line 
              type="monotone" 
              dataKey="groq_api" 
              stroke={COLORS.groq_api}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
