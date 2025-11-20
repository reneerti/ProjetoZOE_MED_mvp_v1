import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Pill, Activity, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface Annotation {
  id: string;
  date: string;
  type: 'medication' | 'lifestyle' | 'event';
  title: string;
  description: string;
}

interface TimelineAnnotationProps {
  annotations: Annotation[];
  onAdd: (annotation: Omit<Annotation, 'id'>) => void;
  onEdit: (id: string, annotation: Omit<Annotation, 'id'>) => void;
  onDelete: (id: string) => void;
}

export const TimelineAnnotation = ({ annotations, onAdd, onEdit, onDelete }: TimelineAnnotationProps) => {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    date: string;
    type: 'medication' | 'lifestyle' | 'event';
    title: string;
    description: string;
  }>({
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'event',
    title: '',
    description: ''
  });

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      type: 'event',
      title: '',
      description: ''
    });
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (!formData.title) return;

    if (editingId) {
      onEdit(editingId, formData);
    } else {
      onAdd(formData);
    }

    setOpen(false);
    resetForm();
  };

  const handleEdit = (annotation: Annotation) => {
    setFormData({
      date: annotation.date,
      type: annotation.type,
      title: annotation.title,
      description: annotation.description
    });
    setEditingId(annotation.id);
    setOpen(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'medication':
        return <Pill className="w-4 h-4" />;
      case 'lifestyle':
        return <Activity className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'medication':
        return 'Medicação';
      case 'lifestyle':
        return 'Mudança de Vida';
      default:
        return 'Evento';
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'medication':
        return 'bg-accent/10 text-accent border-accent/20';
      case 'lifestyle':
        return 'bg-success/10 text-success border-success/20';
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Anotações e Eventos</h3>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Anotação' : 'Nova Anotação'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Data</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Tipo</label>
                <select
                  className="w-full p-2 border rounded-md bg-background"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                >
                  <option value="event">Evento</option>
                  <option value="medication">Mudança de Medicação</option>
                  <option value="lifestyle">Mudança de Estilo de Vida</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Título</label>
                <Input
                  placeholder="Ex: Iniciou novo medicamento"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Descrição</label>
                <Textarea
                  placeholder="Detalhes adicionais..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <Button onClick={handleSubmit} className="w-full" disabled={!formData.title}>
                {editingId ? 'Salvar Alterações' : 'Adicionar Anotação'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {annotations.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhuma anotação registrada
        </p>
      ) : (
        <div className="space-y-3">
          {annotations.map((annotation) => (
            <div key={annotation.id} className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getTypeBadgeClass(annotation.type)}>
                    {getTypeIcon(annotation.type)}
                    <span className="ml-1">{getTypeLabel(annotation.type)}</span>
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(annotation.date), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(annotation)}
                    className="h-6 w-6 p-0"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(annotation.id)}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <h4 className="font-medium text-sm text-foreground mb-1">{annotation.title}</h4>
              {annotation.description && (
                <p className="text-xs text-muted-foreground">{annotation.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
