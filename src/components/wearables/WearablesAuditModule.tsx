import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OAuthAuditDashboard } from "./OAuthAuditDashboard";
import { SyncStatusDashboard } from "./SyncStatusDashboard";
import { Shield, Activity } from "lucide-react";

export const WearablesAuditModule = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Auditoria e Segurança OAuth</h2>
        <p className="text-muted-foreground">
          Monitore a segurança e atividade das suas conexões com wearables
        </p>
      </div>

      <Tabs defaultValue="audit" className="space-y-4">
        <TabsList>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Auditoria
          </TabsTrigger>
          <TabsTrigger value="status" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Status de Sincronização
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="space-y-4">
          <OAuthAuditDashboard />
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status das Conexões</CardTitle>
              <CardDescription>
                Gerencie suas conexões com dispositivos wearables
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SyncStatusDashboard />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
