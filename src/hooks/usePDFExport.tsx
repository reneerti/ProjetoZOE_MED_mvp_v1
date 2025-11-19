import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PatientStats {
  patient_id: string;
  display_name: string;
  total_exams: number;
  critical_alerts: number;
  latest_health_score: number | null;
  last_exam_date: string | null;
  trend_data?: {
    dates: string[];
    scores: number[];
    exams_count: number[];
  };
}

export const usePDFExport = () => {
  const generateMonthlyReportHTML = async (controllerId: string, month: string, year: string): Promise<string | null> => {
    try {
      toast.info("Gerando relatório PDF...");

      // Buscar pacientes do controlador
      const { data: patients } = await supabase.rpc('get_controller_patients', {
        _controller_id: controllerId
      });

      if (!patients || patients.length === 0) {
        toast.error("Nenhum paciente encontrado");
        return null;
      }

      const patientIds = patients.map(p => p.patient_id);

      // Buscar estatísticas de cada paciente
      const stats: PatientStats[] = [];
      
      for (const patient of patients) {
        const startDate = `${year}-${month.padStart(2, '0')}-01`;
        const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

        // Exames do mês
        const { data: exams, count: examCount } = await supabase
          .from('exam_images')
          .select('*', { count: 'exact' })
          .eq('user_id', patient.patient_id)
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        // Alertas críticos
        const { count: alertCount } = await supabase
          .from('health_alerts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', patient.patient_id)
          .eq('severity', 'critical')
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        // Health score mais recente
        const { data: analysis } = await supabase
          .from('health_analysis')
          .select('health_score, created_at')
          .eq('user_id', patient.patient_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Buscar evolução dos últimos 6 meses
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const { data: historicalAnalysis } = await supabase
          .from('health_analysis')
          .select('health_score, created_at')
          .eq('user_id', patient.patient_id)
          .gte('created_at', sixMonthsAgo.toISOString())
          .order('created_at', { ascending: true });

        const { data: historicalExams } = await supabase
          .from('exam_images')
          .select('created_at')
          .eq('user_id', patient.patient_id)
          .gte('created_at', sixMonthsAgo.toISOString());

        // Agrupar por mês
        const monthlyData: { [key: string]: { score: number | null; exams: number } } = {};
        
        historicalAnalysis?.forEach(h => {
          const monthKey = format(new Date(h.created_at), 'MMM/yy', { locale: ptBR });
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { score: h.health_score, exams: 0 };
          }
        });

        historicalExams?.forEach(e => {
          const monthKey = format(new Date(e.created_at), 'MMM/yy', { locale: ptBR });
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { score: null, exams: 0 };
          }
          monthlyData[monthKey].exams++;
        });

        const dates = Object.keys(monthlyData).sort();
        const scores = dates.map(d => monthlyData[d].score || 0);
        const examsCount = dates.map(d => monthlyData[d].exams);

        // Profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', patient.patient_id)
          .single();

        stats.push({
          patient_id: patient.patient_id,
          display_name: profile?.display_name || 'Sem nome',
          total_exams: examCount || 0,
          critical_alerts: alertCount || 0,
          latest_health_score: analysis?.health_score || null,
          last_exam_date: exams?.[0]?.created_at || null,
          trend_data: {
            dates,
            scores,
            exams_count: examsCount
          }
        });
      }

      // Gerar HTML do relatório
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Relatório Mensal - ${month}/${year}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 1200px; margin: 0 auto; background: #f8fafc; }
            h1 { color: #1e293b; border-bottom: 3px solid #3b82f6; padding-bottom: 15px; margin-bottom: 30px; }
            h2 { color: #475569; margin-top: 40px; margin-bottom: 20px; }
            h3 { color: #1e293b; margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            th { background-color: #f1f5f9; font-weight: bold; }
            .summary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin: 30px 0; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
            .stat { display: inline-block; margin: 15px 30px 15px 0; }
            .stat-label { color: rgba(255,255,255,0.9); font-size: 14px; margin-bottom: 5px; }
            .stat-value { font-size: 32px; font-weight: bold; color: white; }
            .critical { color: #fca5a5; }
            .good { color: #86efac; }
            .chart-container { margin: 30px 0; padding: 25px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
            .chart-title { font-size: 16px; font-weight: bold; margin-bottom: 20px; color: #475569; display: flex; align-items: center; }
            .chart-icon { margin-right: 8px; }
            .patient-section { page-break-inside: avoid; margin-top: 50px; border-top: 3px solid #e2e8f0; padding-top: 30px; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
            .patient-header { background: linear-gradient(to right, #f1f5f9, transparent); padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
            .metric-card { background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; }
          </style>
        </head>
        <body>
          <h1>Relatório Mensal de Pacientes</h1>
          <p><strong>Período:</strong> ${month}/${year}</p>
          <p><strong>Data de Geração:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
          
          <div class="summary">
            <h2 style="color: white; margin-top: 0;">📊 Resumo Geral - ${month}/${year}</h2>
            <div class="stat">
              <div class="stat-label">Total de Pacientes</div>
              <div class="stat-value">${stats.length}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Total de Exames</div>
              <div class="stat-value">${stats.reduce((sum, s) => sum + s.total_exams, 0)}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Alertas Críticos</div>
              <div class="stat-value critical">${stats.reduce((sum, s) => sum + s.critical_alerts, 0)}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Score Médio</div>
              <div class="stat-value">${
                stats.filter(s => s.latest_health_score).length > 0
                  ? Math.round(stats.reduce((sum, s) => sum + (s.latest_health_score || 0), 0) / stats.filter(s => s.latest_health_score).length)
                  : 'N/A'
              }</div>
            </div>
          </div>

          <h2>Detalhamento por Paciente</h2>
          
          ${stats.map(s => {
            const maxScore = Math.max(...(s.trend_data?.scores || [0]), 100);
            const maxExams = Math.max(...(s.trend_data?.exams_count || [0]), 1);
            
            // Gerar SVG para gráfico de linha de Health Score
            const generateScoreLineChart = (data: typeof s.trend_data) => {
              if (!data || data.dates.length === 0) return '';
              
              const width = 600;
              const height = 200;
              const padding = 40;
              const maxY = Math.max(...data.scores, 100);
              const points = data.scores.map((score, i) => {
                const x = padding + (i * (width - 2 * padding) / (data.scores.length - 1));
                const y = height - padding - (score / maxY) * (height - 2 * padding);
                return `${x},${y}`;
              }).join(' ');

              return `
                <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                  <!-- Grid lines -->
                  ${[0, 25, 50, 75, 100].map(val => {
                    const y = height - padding - (val / maxY) * (height - 2 * padding);
                    return `
                      <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4,4"/>
                      <text x="${padding - 10}" y="${y + 5}" fill="#64748b" font-size="12" text-anchor="end">${val}</text>
                    `;
                  }).join('')}
                  
                  <!-- Line -->
                  <polyline points="${points}" fill="none" stroke="#3b82f6" stroke-width="3"/>
                  
                  <!-- Points and labels -->
                  ${data.scores.map((score, i) => {
                    const x = padding + (i * (width - 2 * padding) / (data.scores.length - 1));
                    const y = height - padding - (score / maxY) * (height - 2 * padding);
                    return `
                      <circle cx="${x}" cy="${y}" r="5" fill="#3b82f6"/>
                      <text x="${x}" y="${height - 10}" fill="#64748b" font-size="11" text-anchor="middle">${data.dates[i]}</text>
                      <text x="${x}" y="${y - 10}" fill="#1e293b" font-size="12" font-weight="bold" text-anchor="middle">${score}</text>
                    `;
                  }).join('')}
                </svg>
              `;
            };

            // Gerar SVG para gráfico de barras de Exames
            const generateExamsBarChart = (data: typeof s.trend_data) => {
              if (!data || data.dates.length === 0) return '';
              
              const width = 600;
              const height = 200;
              const padding = 40;
              const maxY = Math.max(...data.exams_count, 1);
              const barWidth = (width - 2 * padding) / data.exams_count.length - 10;

              return `
                <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                  <!-- Grid lines -->
                  ${[...Array(5)].map((_, i) => {
                    const val = Math.round((maxY / 4) * i);
                    const y = height - padding - (val / maxY) * (height - 2 * padding);
                    return `
                      <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4,4"/>
                      <text x="${padding - 10}" y="${y + 5}" fill="#64748b" font-size="12" text-anchor="end">${val}</text>
                    `;
                  }).join('')}
                  
                  <!-- Bars -->
                  ${data.exams_count.map((count, i) => {
                    const x = padding + i * ((width - 2 * padding) / data.exams_count.length);
                    const barHeight = (count / maxY) * (height - 2 * padding);
                    const y = height - padding - barHeight;
                    return `
                      <rect x="${x + 5}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#10b981" rx="4"/>
                      <text x="${x + barWidth/2 + 5}" y="${y - 5}" fill="#1e293b" font-size="12" font-weight="bold" text-anchor="middle">${count}</text>
                      <text x="${x + barWidth/2 + 5}" y="${height - 10}" fill="#64748b" font-size="11" text-anchor="middle">${data.dates[i]}</text>
                    `;
                  }).join('')}
                </svg>
              `;
            };

            return `
              <div class="patient-section">
                <div class="patient-header">
                  <h3 style="margin: 0; color: #1e293b;">👤 ${s.display_name}</h3>
                </div>
                
                <div class="metric-grid">
                  <div class="metric-card">
                    <div class="stat-label">Exames do Mês</div>
                    <div class="stat-value" style="font-size: 28px; color: #3b82f6;">${s.total_exams}</div>
                  </div>
                  <div class="metric-card" style="border-left-color: ${s.critical_alerts > 0 ? '#dc2626' : '#10b981'};">
                    <div class="stat-label">Alertas Críticos</div>
                    <div class="stat-value" style="font-size: 28px; color: ${s.critical_alerts > 0 ? '#dc2626' : '#10b981'};">${s.critical_alerts}</div>
                  </div>
                  <div class="metric-card" style="border-left-color: ${s.latest_health_score && s.latest_health_score > 80 ? '#10b981' : '#f59e0b'};">
                    <div class="stat-label">Health Score</div>
                    <div class="stat-value" style="font-size: 28px; color: ${s.latest_health_score && s.latest_health_score > 80 ? '#10b981' : '#f59e0b'};">${s.latest_health_score || 'N/A'}</div>
                  </div>
                  <div class="metric-card">
                    <div class="stat-label">Último Exame</div>
                    <div style="font-size: 14px; margin-top: 8px; color: #1e293b; font-weight: 600;">${s.last_exam_date ? new Date(s.last_exam_date).toLocaleDateString('pt-BR') : 'N/A'}</div>
                  </div>
                </div>

                ${s.trend_data && s.trend_data.dates.length > 0 ? `
                  <div class="chart-container">
                    <div class="chart-title">
                      <span class="chart-icon">📈</span>
                      Evolução do Health Score (6 meses)
                    </div>
                    ${generateScoreLineChart(s.trend_data)}
                  </div>

                  <div class="chart-container">
                    <div class="chart-title">
                      <span class="chart-icon">📊</span>
                      Frequência de Exames por Mês
                    </div>
                    ${generateExamsBarChart(s.trend_data)}
                  </div>
                ` : '<p style="color: #64748b; margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 8px; text-align: center;">⚠️ Dados históricos insuficientes para gráficos (necessário pelo menos 2 pontos de dados)</p>'}
              </div>
            `;
          }).join('')}

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 12px; color: #64748b;">
              Relatório gerado automaticamente pelo sistema ZoeMed - Saúde Inteligente
            </p>
          </div>
        </body>
        </html>
      `;

      // Criar Blob e fazer download
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${month}-${year}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return html;
    } catch (error) {
      console.error('Error generating report HTML:', error);
      toast.error("Erro ao gerar relatório");
      return null;
    }
  };

  const generateMonthlyReport = async (controllerId: string, month: string, year: string) => {
    try {
      const htmlContent = await generateMonthlyReportHTML(controllerId, month, year);
      if (!htmlContent) return;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${month}-${year}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Relatório gerado com sucesso!");
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error("Erro ao gerar relatório");
    }
  };

  return { generateMonthlyReport, generateMonthlyReportHTML };
};
