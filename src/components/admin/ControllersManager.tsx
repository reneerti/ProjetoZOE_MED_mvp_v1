import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Users, Trash2 } from "lucide-react";

interface ControllersManagerProps {
  onRefresh: () => void;
}

export const ControllersManager = ({ onRefresh }: ControllersManagerProps) => {
  const [controllers, setControllers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedController, setSelectedController] = useState<string | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedController) {
      fetchPatients(selectedController);
    }
  }, [selectedController]);

  const fetchData = async () => {
    try {
      const [rolesRes, profilesRes] = await Promise.all([
        supabase.from('user_roles').select('user_id, role').eq('role', 'controller'),
        supabase.from('profiles').select('*')
      ]);

      const controllerProfiles = (rolesRes.data || []).map(role => {
        const profile = profilesRes.data?.find(p => p.id === role.user_id);
        return { ...profile, role: role.role };
      });

      setControllers(controllerProfiles);
      setAllUsers(profilesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async (controllerId: string) => {
    try {
      const { data: relationships } = await supabase
        .from('controller_patients')
        .select('patient_id')
        .eq('controller_id', controllerId);

      if (relationships) {
        const patientIds = relationships.map(r => r.patient_id);
        const { data: patientProfiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', patientIds);

        setPatients(patientProfiles || []);
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
    }
  };

  const handlePromoteToController = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: 'controller' }, { onConflict: 'user_id,role' });

      if (error) throw error;

      toast.success("Usuário promovido a controlador!");
      fetchData();
      onRefresh();
    } catch (error) {
      console.error("Error promoting user:", error);
      toast.error("Erro ao promover usuário");
    }
  };

  const handleAddPatient = async (patientId: string) => {
    if (!selectedController) return;

    try {
      const { error } = await supabase
        .from('controller_patients')
        .insert({
          controller_id: selectedController,
          patient_id: patientId
        });

      if (error) throw error;

      toast.success("Paciente vinculado!");
      fetchPatients(selectedController);
      setOpenDialog(false);
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error("Paciente já vinculado");
      } else {
        console.error("Error adding patient:", error);
        toast.error("Erro ao vincular paciente");
      }
    }
  };

  const handleRemovePatient = async (patientId: string) => {
    if (!selectedController) return;

    try {
      const { error } = await supabase
        .from('controller_patients')
        .delete()
        .eq('controller_id', selectedController)
        .eq('patient_id', patientId);

      if (error) throw error;

      toast.success("Paciente desvinculado!");
      fetchPatients(selectedController);
    } catch (error) {
      console.error("Error removing patient:", error);
      toast.error("Erro ao desvincular paciente");
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Promote User to Controller */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Promover Usuário a Controlador
        </h3>
        <div className="flex gap-2">
          <Select onValueChange={handlePromoteToController}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um usuário" />
            </SelectTrigger>
            <SelectContent>
              {allUsers.filter(u => !controllers.find(c => c.id === u.id)).map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.display_name || user.id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Controllers List */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Controladores ({controllers.length})
        </h3>
        <div className="space-y-3">
          {controllers.map((controller) => (
            <Card key={controller.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold">{controller.display_name || "Sem nome"}</h4>
                  <p className="text-xs text-muted-foreground">ID: {controller.id.slice(0, 8)}...</p>
                </div>
                <Badge variant="secondary">Controlador</Badge>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedController(controller.id)}
                  className="flex-1"
                >
                  Ver Pacientes
                </Button>

                <Dialog open={openDialog && selectedController === controller.id} onOpenChange={setOpenDialog}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      onClick={() => setSelectedController(controller.id)}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Adicionar Paciente
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Paciente</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      {allUsers
                        .filter(u => !patients.find(p => p.id === u.id) && u.id !== controller.id)
                        .map((user) => (
                          <Card
                            key={user.id}
                            className="p-3 cursor-pointer hover:bg-muted/50"
                            onClick={() => handleAddPatient(user.id)}
                          >
                            <p className="font-medium text-sm">{user.display_name || "Sem nome"}</p>
                            <p className="text-xs text-muted-foreground">ID: {user.id.slice(0, 8)}...</p>
                          </Card>
                        ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {selectedController === controller.id && patients.length > 0 && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  <p className="text-sm font-medium">Pacientes ({patients.length})</p>
                  {patients.map((patient) => (
                    <div key={patient.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <div>
                        <p className="text-sm font-medium">{patient.display_name || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground">{patient.id.slice(0, 8)}...</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemovePatient(patient.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
