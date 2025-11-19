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
  const generateMonthlyReport = async (controllerId: string, month: string, year: string) => {
    try {
      toast.info("Gerando relatório PDF...");

      // Buscar pacientes do controlador
      const { data: patients } = await supabase.rpc('get_controller_patients', {
        _controller_id: controllerId
      });

      if (!patients || patients.length === 0) {
        toast.error("Nenhum paciente encontrado");
        return;
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
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 1200px; margin: 0 auto; }
            h1 { color: #1e293b; border-bottom: 2px solid #475569; padding-bottom: 10px; }
            h2 { color: #475569; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            th { background-color: #f1f5f9; font-weight: bold; }
            .summary { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .stat { display: inline-block; margin: 10px 20px 10px 0; }
            .stat-label { color: #64748b; font-size: 14px; }
            .stat-value { font-size: 24px; font-weight: bold; color: #1e293b; }
            .critical { color: #dc2626; }
            .good { color: #16a34a; }
            .chart-container { margin: 30px 0; padding: 20px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; }
            .chart-title { font-size: 16px; font-weight: bold; margin-bottom: 15px; color: #475569; }
            .bar-chart { display: flex; align-items: flex-end; height: 200px; gap: 8px; margin-top: 10px; }
            .bar { flex: 1; background: linear-gradient(to top, #3b82f6, #60a5fa); border-radius: 4px 4px 0 0; position: relative; min-height: 2px; }
            .bar-label { position: absolute; bottom: -25px; left: 50%; transform: translateX(-50%); font-size: 11px; color: #64748b; white-space: nowrap; }
            .bar-value { position: absolute; top: -25px; left: 50%; transform: translateX(-50%); font-size: 12px; font-weight: bold; color: #1e293b; }
            .line-chart { position: relative; height: 200px; margin-top: 30px; }
            .line-grid { position: absolute; width: 100%; height: 100%; }
            .grid-line { position: absolute; width: 100%; border-top: 1px dashed #e2e8f0; }
            .patient-section { page-break-inside: avoid; margin-top: 40px; border-top: 2px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <h1>Relatório Mensal de Pacientes</h1>
          <p><strong>Período:</strong> ${month}/${year}</p>
          <p><strong>Data de Geração:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
          
          <div class="summary">
            <h2>Resumo Geral</h2>
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
          </div>

          <h2>Detalhamento por Paciente</h2>
          
          ${stats.map(s => {
            const maxScore = Math.max(...(s.trend_data?.scores || [0]), 100);
            const maxExams = Math.max(...(s.trend_data?.exams_count || [0]), 1);
            
            return `
              <div class="patient-section">
                <h3>${s.display_name}</h3>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 15px 0;">
                  <div>
                    <div class="stat-label">Exames do Mês</div>
                    <div class="stat-value">${s.total_exams}</div>
                  </div>
                  <div>
                    <div class="stat-label">Alertas Críticos</div>
                    <div class="stat-value ${s.critical_alerts > 0 ? 'critical' : ''}">${s.critical_alerts}</div>
                  </div>
                  <div>
                    <div class="stat-label">Health Score</div>
                    <div class="stat-value ${s.latest_health_score && s.latest_health_score > 80 ? 'good' : ''}">${s.latest_health_score || 'N/A'}</div>
                  </div>
                  <div>
                    <div class="stat-label">Último Exame</div>
                    <div style="font-size: 14px; margin-top: 5px;">${s.last_exam_date ? new Date(s.last_exam_date).toLocaleDateString('pt-BR') : 'N/A'}</div>
                  </div>
                </div>

                ${s.trend_data && s.trend_data.dates.length > 0 ? `
                  <div class="chart-container">
                    <div class="chart-title">📊 Evolução do Health Score (6 meses)</div>
                    <div class="bar-chart">
                      ${s.trend_data.scores.map((score, i) => {
                        const height = (score / maxScore) * 100;
                        return `
                          <div class="bar" style="height: ${height}%;">
                            <span class="bar-value">${score}</span>
                            <span class="bar-label">${s.trend_data!.dates[i]}</span>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>

                  <div class="chart-container">
                    <div class="chart-title">📈 Frequência de Exames</div>
                    <div class="bar-chart">
                      ${s.trend_data.exams_count.map((count, i) => {
                        const height = (count / maxExams) * 100;
                        return `
                          <div class="bar" style="height: ${Math.max(height, 5)}%; background: linear-gradient(to top, #10b981, #34d399);">
                            <span class="bar-value">${count}</span>
                            <span class="bar-label">${s.trend_data!.dates[i]}</span>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                ` : '<p style="color: #64748b; margin: 20px 0;">Dados históricos insuficientes para gráficos</p>'}
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

      toast.success("Relatório gerado com sucesso!");
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error("Erro ao gerar relatório");
    }
  };

  return { generateMonthlyReport };
};
