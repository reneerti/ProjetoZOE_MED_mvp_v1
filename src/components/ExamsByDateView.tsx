import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronDown, ChevronUp, FileText, Loader2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import type { View } from "@/types/views";

interface ExamsByDateViewProps {
  onNavigate: (view: View) => void;
}

interface ExamGroup {
  date: string;
  exams: Array<{
    id: string;
    image_url: string;
    exam_type_id: string | null;
    file_type: string;
    upload_date: string;
    processing_status: string;
  }>;
  examTypes: string[];
}

export const ExamsByDateView = ({ onNavigate }: ExamsByDateViewProps) => {
  const [loading, setLoading] = useState(true);
  const [examGroups, setExamGroups] = useState<ExamGroup[]>([]);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [examTypesStats, setExamTypesStats] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchExamsByDate();
  }, []);

  const fetchExamsByDate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar exames agrupados por data
      const { data: examImages, error } = await supabase
        .from('exam_images')
        .select('id, image_url, exam_type_id, file_type, upload_date, processing_status, exam_date')
        .eq('user_id', user.id)
        .order('exam_date', { ascending: false });

      if (error) throw error;

      // Agrupar por data de exame
      const groupedByDate: Record<string, any[]> = {};
      const typesCount: Record<string, number> = {};

      examImages?.forEach(exam => {
        const dateKey = exam.exam_date || 'Sem data';
        
        if (!groupedByDate[dateKey]) {
          groupedByDate[dateKey] = [];
        }
        groupedByDate[dateKey].push(exam);

        // Contar tipos de exames
        if (exam.exam_type_id) {
          typesCount[exam.exam_type_id] = (typesCount[exam.exam_type_id] || 0) + 1;
        }
      });

      // Buscar nomes dos tipos de exames
      const typeIds = Object.keys(typesCount);
      const { data: examTypes } = await supabase
        .from('exam_types')
        .select('id, name')
        .in('id', typeIds);

      const typeNames: Record<string, string> = {};
      examTypes?.forEach(type => {
        typeNames[type.id] = type.name;
      });

      // Criar grupos com informações de tipos
      const groups: ExamGroup[] = Object.entries(groupedByDate).map(([date, exams]) => {
        const uniqueTypes = [...new Set(exams.map(e => e.exam_type_id).filter(Boolean))];
        const examTypeNames = uniqueTypes.map(id => typeNames[id] || 'Desconhecido');

        return {
          date,
          exams,
          examTypes: examTypeNames
        };
      });

      // Estatísticas de tipos de exames
      const statsWithNames: Record<string, number> = {};
      Object.entries(typesCount).forEach(([typeId, count]) => {
        const typeName = typeNames[typeId] || 'Desconhecido';
        statsWithNames[typeName] = count;
      });

      setExamGroups(groups);
      setExamTypesStats(statsWithNames);
      
      // Abrir primeiro grupo por padrão
      if (groups.length > 0) {
        setOpenGroups(new Set([groups[0].date]));
      }
    } catch (error) {
      console.error('Error fetching exams by date:', error);
      toast.error("Erro ao carregar exames");
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (date: string) => {
    setOpenGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Processado</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Processando</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Erro</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="sticky top-0 z-50 bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate("exams")}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2.4} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold drop-shadow-md">Exames por Data</h1>
            <p className="text-white/90 text-sm drop-shadow">Visualize seus exames organizados por data</p>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* Dashboard de tipos de exames */}
        <Card className="p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Tipos de Exames Realizados
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(examTypesStats).length > 0 ? (
              Object.entries(examTypesStats).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="text-sm text-foreground">{type}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground col-span-2">Nenhum exame com tipo definido</p>
            )}
          </div>
        </Card>

        {/* Grupos de exames por data */}
        {examGroups.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">Nenhum exame encontrado</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {examGroups.map((group) => {
              const isOpen = openGroups.has(group.date);
              const formattedDate = group.date !== 'Sem data' 
                ? format(new Date(group.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                : 'Sem data definida';

              return (
                <Collapsible key={group.date} open={isOpen} onOpenChange={() => toggleGroup(group.date)}>
                  <Card className="overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <button className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-primary" />
                          </div>
                          <div className="text-left">
                            <h3 className="font-semibold text-foreground">{formattedDate}</h3>
                            <p className="text-xs text-muted-foreground">
                              {group.exams.length} {group.exams.length === 1 ? 'exame' : 'exames'}
                              {group.examTypes.length > 0 && ` • ${group.examTypes.join(', ')}`}
                            </p>
                          </div>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="border-t border-border p-4 space-y-3">
                        {group.exams.map((exam) => (
                          <div key={exam.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden">
                                {exam.file_type === 'application/pdf' ? (
                                  <FileText className="w-6 h-6 text-muted-foreground" />
                                ) : (
                                  <img 
                                    src={exam.image_url} 
                                    alt="Exame" 
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {exam.file_type === 'application/pdf' ? 'PDF' : 'Imagem'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Upload: {format(new Date(exam.upload_date), "dd/MM/yyyy HH:mm")}
                                </p>
                              </div>
                            </div>
                            {getStatusBadge(exam.processing_status || 'pending')}
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
