/**
 * Gerenciador de Configurações de APIs
 *
 * Interface para admins configurarem API keys e testarem conectividade
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Eye, EyeOff, CheckCircle, XCircle, RefreshCw, Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface APIConfig {
  id: string;
  category: string;
  provider: string;
  priority: number;
  config_data: {
    api_key?: string;
    api_key_masked?: string;
    endpoint?: string;
    model?: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    ssl?: boolean;
  };
  is_active: boolean;
  last_tested_at?: string;
  last_test_status?: 'success' | 'failed';
  last_test_message?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  ocr: '📄 OCR (Reconhecimento de Texto)',
  pdf: '📑 Conversão de PDF',
  ai: '🤖 Inteligência Artificial',
  database: '🗄️ Banco de Dados Externo',
};

const PROVIDER_LABELS: Record<string, string> = {
  ocr_space: 'OCR.space',
  google_vision: 'Google Cloud Vision',
  azure_vision: 'Azure Computer Vision',
  pdf_co: 'PDF.co',
  convert_api: 'ConvertAPI',
  cloudconvert: 'CloudConvert',
  groq: 'Groq',
  google_ai: 'Google AI (Gemini)',
  together_ai: 'Together AI',
  openrouter: 'OpenRouter',
  huggingface: 'Hugging Face',
  postgres: 'PostgreSQL',
};

export function APIConfigurationManager() {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<APIConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [editedConfigs, setEditedConfigs] = useState<Record<string, APIConfig>>({});

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('manage-api-configs', {
        body: { action: 'list' },
      });

      if (error) throw error;
      setConfigs(data.configs || []);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar configurações de APIs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const testConfiguration = async (configId: string) => {
    try {
      setTesting(configId);
      const { data, error } = await supabase.functions.invoke('manage-api-configs', {
        body: { action: 'test', id: configId },
      });

      if (error) throw error;

      toast({
        title: data.test.success ? 'Teste Bem-sucedido' : 'Teste Falhou',
        description: data.test.message,
        variant: data.test.success ? 'default' : 'destructive',
      });

      // Recarregar configurações para atualizar status
      await loadConfigurations();
    } catch (error) {
      console.error('Erro ao testar:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao testar configuração',
        variant: 'destructive',
      });
    } finally {
      setTesting(null);
    }
  };

  const saveConfiguration = async (config: APIConfig) => {
    try {
      setSaving(true);
      const { error } = await supabase.functions.invoke('manage-api-configs', {
        body: {
          action: 'upsert',
          id: config.id,
          category: config.category,
          provider: config.provider,
          priority: config.priority,
          config_data: config.config_data,
        },
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Configuração salva com sucesso',
      });

      // Limpar edição
      const newEditedConfigs = { ...editedConfigs };
      delete newEditedConfigs[config.id];
      setEditedConfigs(newEditedConfigs);

      await loadConfigurations();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao salvar configuração',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (configId: string) => {
    try {
      const { error } = await supabase.functions.invoke('manage-api-configs', {
        body: { action: 'toggle', id: configId },
      });

      if (error) throw error;
      await loadConfigurations();
    } catch (error) {
      console.error('Erro ao alternar status:', error);
    }
  };

  const updateConfigField = (configId: string, field: string, value: any) => {
    const config = configs.find(c => c.id === configId);
    if (!config) return;

    const updatedConfig = editedConfigs[configId] || { ...config };
    updatedConfig.config_data = {
      ...updatedConfig.config_data,
      [field]: value,
    };

    setEditedConfigs({
      ...editedConfigs,
      [configId]: updatedConfig,
    });
  };

  const getConfigToDisplay = (config: APIConfig): APIConfig => {
    return editedConfigs[config.id] || config;
  };

  const hasChanges = (configId: string): boolean => {
    return !!editedConfigs[configId];
  };

  const renderConfigFields = (config: APIConfig) => {
    const displayConfig = getConfigToDisplay(config);
    const data = displayConfig.config_data;

    if (config.category === 'database') {
      return (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Host</Label>
            <Input
              value={data.host || ''}
              onChange={(e) => updateConfigField(config.id, 'host', e.target.value)}
              placeholder="db.exemplo.com"
            />
          </div>
          <div>
            <Label>Porta</Label>
            <Input
              type="number"
              value={data.port || 5432}
              onChange={(e) => updateConfigField(config.id, 'port', parseInt(e.target.value))}
            />
          </div>
          <div>
            <Label>Database</Label>
            <Input
              value={data.database || ''}
              onChange={(e) => updateConfigField(config.id, 'database', e.target.value)}
              placeholder="zoe_med"
            />
          </div>
          <div>
            <Label>Username</Label>
            <Input
              value={data.username || ''}
              onChange={(e) => updateConfigField(config.id, 'username', e.target.value)}
              placeholder="admin"
            />
          </div>
          <div className="col-span-2">
            <Label>Password</Label>
            <div className="flex gap-2">
              <Input
                type={showKeys[config.id] ? 'text' : 'password'}
                value={data.password || ''}
                onChange={(e) => updateConfigField(config.id, 'password', e.target.value)}
                placeholder="••••••••"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowKeys({ ...showKeys, [config.id]: !showKeys[config.id] })}
              >
                {showKeys[config.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <Switch
              checked={data.ssl ?? true}
              onCheckedChange={(checked) => updateConfigField(config.id, 'ssl', checked)}
            />
            <Label>Usar SSL/TLS</Label>
          </div>
        </div>
      );
    }

    // Para OCR, PDF, AI
    return (
      <div className="space-y-4">
        <div>
          <Label>API Key</Label>
          <div className="flex gap-2">
            <Input
              type={showKeys[config.id] ? 'text' : 'password'}
              value={data.api_key || ''}
              onChange={(e) => updateConfigField(config.id, 'api_key', e.target.value)}
              placeholder={data.api_key_masked || '••••••••••••'}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowKeys({ ...showKeys, [config.id]: !showKeys[config.id] })}
            >
              {showKeys[config.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        {data.endpoint && (
          <div>
            <Label>Endpoint</Label>
            <Input value={data.endpoint} disabled className="bg-muted" />
          </div>
        )}
        {data.model && (
          <div>
            <Label>Modelo</Label>
            <Input value={data.model} disabled className="bg-muted" />
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Agrupar por categoria
  const groupedConfigs = configs.reduce((acc, config) => {
    if (!acc[config.category]) {
      acc[config.category] = [];
    }
    acc[config.category].push(config);
    return acc;
  }, {} as Record<string, APIConfig[]>);

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Configure as API keys para os serviços de OCR, IA e banco de dados.
          As chaves são armazenadas de forma criptografada. Teste cada configuração antes de ativar.
        </AlertDescription>
      </Alert>

      {Object.entries(groupedConfigs).map(([category, categoryConfigs]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{CATEGORY_LABELS[category] || category}</CardTitle>
            <CardDescription>
              Configure os provedores para {category}. Prioridade 1 = Principal, 2+ = Redundância
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryConfigs.map((config) => {
              const displayConfig = getConfigToDisplay(config);
              const isEdited = hasChanges(config.id);

              return (
                <div key={config.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <h4 className="font-semibold">
                          {PROVIDER_LABELS[config.provider] || config.provider}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Prioridade {config.priority}
                        </p>
                      </div>
                      {config.last_tested_at && (
                        <div className="flex items-center gap-2 text-sm">
                          {config.last_test_status === 'success' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-muted-foreground">
                            {new Date(config.last_tested_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={displayConfig.is_active}
                        onCheckedChange={() => toggleActive(config.id)}
                      />
                      <Label className="text-sm">
                        {displayConfig.is_active ? 'Ativo' : 'Inativo'}
                      </Label>
                    </div>
                  </div>

                  {renderConfigFields(config)}

                  {config.last_test_message && (
                    <Alert variant={config.last_test_status === 'success' ? 'default' : 'destructive'}>
                      <AlertDescription>{config.last_test_message}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testConfiguration(config.id)}
                      disabled={testing === config.id}
                    >
                      {testing === config.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Testar Conexão
                    </Button>
                    {isEdited && (
                      <Button
                        size="sm"
                        onClick={() => saveConfiguration(displayConfig)}
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Salvar Alterações
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
