import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PatientStats {
  patient_id: string;
  display_name: string;
  total_exams: number;
  critical_alerts: number;
  latest_health_score: number | null;
  last_exam_date: string | null;
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
          .select('health_score')
          .eq('user_id', patient.patient_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

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
          last_exam_date: exams?.[0]?.created_at || null
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
            body { font-family: Arial, sans-serif; padding: 40px; }
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
          <table>
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Exames</th>
                <th>Alertas Críticos</th>
                <th>Health Score</th>
                <th>Último Exame</th>
              </tr>
            </thead>
            <tbody>
              ${stats.map(s => `
                <tr>
                  <td>${s.display_name}</td>
                  <td>${s.total_exams}</td>
                  <td class="${s.critical_alerts > 0 ? 'critical' : ''}">${s.critical_alerts}</td>
                  <td class="${s.latest_health_score && s.latest_health_score > 80 ? 'good' : ''}">${s.latest_health_score || 'N/A'}</td>
                  <td>${s.last_exam_date ? new Date(s.last_exam_date).toLocaleDateString('pt-BR') : 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

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
