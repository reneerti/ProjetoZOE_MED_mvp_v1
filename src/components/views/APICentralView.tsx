/**
 * Central de Configurações de APIs
 *
 * Página para administradores gerenciarem APIs, visualizarem custos e métricas
 * ACESSO RESTRITO: Apenas usuários com role 'admin'
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { APIConfigurationManager } from '@/components/APIConfigurationManager';
import { APIUsageDashboard } from '@/components/APIUsageDashboard';
import { ShieldAlert, Settings, BarChart3, ArrowLeft, Loader2 } from 'lucide-react';

export function APICentralView({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Erro ao verificar role:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(data?.role === 'admin');
      }
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Acesso negado
  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-red-500" />
              <CardTitle>Acesso Restrito</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTitle>Permissão Negada</AlertTitle>
              <AlertDescription>
                Apenas administradores podem acessar a Central de APIs.
                Esta área contém configurações críticas do sistema e informações sensíveis.
              </AlertDescription>
            </Alert>

            <div className="bg-muted rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Por que este acesso é restrito?</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Contém API keys e credenciais sensíveis</li>
                <li>Permite modificar configurações do sistema</li>
                <li>Visualiza custos e métricas operacionais</li>
                <li>Pode impactar o funcionamento de todo o sistema</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button onClick={onBack} variant="outline" className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => window.location.href = 'mailto:admin@zoe-med.app?subject=Solicitar%20Acesso%20Admin'}
              >
                Solicitar Acesso
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Acesso permitido - Interface principal
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Central de APIs</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie configurações, monitore uso e controle custos das APIs
          </p>
        </div>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      {/* Aviso de Segurança */}
      <Alert className="border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/20">
        <ShieldAlert className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
        <AlertTitle>Área Administrativa</AlertTitle>
        <AlertDescription>
          Você está em uma área restrita. Todas as alterações são auditadas.
          As API keys são armazenadas de forma criptografada.
        </AlertDescription>
      </Alert>

      {/* Tabs Principais */}
      <Tabs defaultValue="configs" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="configs" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Métricas e Custos
          </TabsTrigger>
        </TabsList>

        {/* Tab: Configurações */}
        <TabsContent value="configs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de APIs</CardTitle>
              <CardDescription>
                Configure as API keys para os serviços de OCR, conversão de PDF, IA e banco de dados.
                Teste cada configuração antes de ativar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <APIConfigurationManager />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Métricas */}
        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Uso e Custos</CardTitle>
              <CardDescription>
                Monitore o uso de cada API, analise custos e identifique oportunidades de otimização.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <APIUsageDashboard />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Informações Adicionais */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Dicas de Uso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="font-semibold min-w-[120px]">Prioridades:</span>
            <span className="text-muted-foreground">
              1 = Principal, 2+ = Redundância. O sistema tenta APIs na ordem de prioridade.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold min-w-[120px]">Teste:</span>
            <span className="text-muted-foreground">
              Sempre teste antes de ativar. Evita erros em produção.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold min-w-[120px]">Custos:</span>
            <span className="text-muted-foreground">
              Monitore a aba de Métricas para evitar surpresas na fatura.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold min-w-[120px]">Segurança:</span>
            <span className="text-muted-foreground">
              API keys são criptografadas. Nunca compartilhe com terceiros.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
