# Guia de Gerenciamento de APIs - ZOE MED MVP

Este documento explica o novo sistema centralizado de gerenciamento de APIs implementado no projeto.

---

## Visao Geral

O sistema agora permite que administradores:
- Configurem API keys centralizadamente pela interface
- Testem conectividade de cada API antes de ativar
- Monitorem uso e custos em tempo real
- Controlem limites de gastos
- Visualizem métricas de performance

---

## Como Acessar

### Pelo Menu Recursos

1. Faça login como **Administrador**
2. Vá em **Menu** > **Recursos**
3. Clique em **"Central de APIs"**

> ⚠️ **IMPORTANTE**: Apenas usuários com role `admin` podem acessar esta funcionalidade.

---

## Funcionalidades

### 1. Configuração de APIs

#### Categorias Suportadas:

| Categoria | Providers | Uso |
|-----------|-----------|-----|
| **OCR** | OCR.space, Google Vision, Azure Vision | Extração de texto de imagens |
| **PDF** | PDF.co, ConvertAPI, CloudConvert | Conversão PDF para imagem |
| **IA** | Groq, Google AI, Together AI, OpenRouter, HuggingFace | Análise e estruturação de dados |
| **Database** | PostgreSQL | Banco de dados externo (opcional) |

#### Como Configurar:

1. Selecione a categoria (OCR, PDF, IA, etc)
2. Escolha o provedor
3. Insira a API Key
4. **Clique em "Testar Conexão"**
5. Se teste passar, **ative** a configuração
6. **Salve as alterações**

#### Prioridades:

- **Prioridade 1**: API principal (usada primeiro)
- **Prioridade 2+**: APIs de redundância (fallback)

O sistema tenta as APIs na ordem de prioridade até obter sucesso.

---

### 2. Monitoramento de Uso

#### Métricas Disponíveis:

- **Total de Requisições**: Quantidade de chamadas à API
- **Taxa de Sucesso**: % de requisições bem-sucedidas
- **Custo Total**: Gastos estimados em USD
- **Tempo Médio de Resposta**: Performance de cada API

#### Visualizações:

##### Por Provedor
```
OCR.space
  - 1.250 requisições
  - 98.5% sucesso
  - $0.0000 custo
  - 245ms tempo médio
```

##### Custos Mensais
```
Novembro 2025
  Groq: $0.0000 (5.230 req)
  Google AI: $0.0000 (1.850 req)
```

##### Performance
Gráfico de barras comparando tempo de resposta de cada API.

---

### 3. Rastreamento de Custos

#### Como Funciona:

Cada vez que uma API é chamada, o sistema registra:
- Provedor utilizado
- Tempo de resposta
- Tokens utilizados (para IAs)
- Custo estimado

#### Tabelas do Banco:

```sql
-- Registro de cada chamada
api_usage_logs (
  configuration_id,
  provider,
  success,
  response_time_ms,
  tokens_used,
  estimated_cost_usd,
  created_at
)

-- Estatísticas agregadas
api_usage_summary (view)
api_monthly_costs (view)
```

#### Funções Disponíveis:

```sql
-- Registrar uso
SELECT log_api_usage(
  p_configuration_id := config_uuid,
  p_category := 'ai',
  p_provider := 'groq',
  p_user_id := user_uuid,
  p_function_name := 'analyze-exams',
  p_operation := 'analyze',
  p_success := true,
  p_response_time_ms := 1250,
  p_tokens_used := 450,
  p_estimated_cost_usd := 0.0001
);

-- Obter estatísticas
SELECT * FROM get_api_usage_stats(
  p_days := 30,
  p_category := 'ai'
);
```

---

### 4. Controle de Limites

#### Configurar Limites de Custo:

```sql
INSERT INTO api_cost_limits (
  category,
  provider,
  daily_limit_usd,
  monthly_limit_usd,
  alert_threshold_percent,
  auto_disable
) VALUES (
  'ai',
  'groq',
  1.00,  -- $1/dia
  10.00, -- $10/mês
  80,    -- Alertar em 80%
  true   -- Desabilitar automaticamente
);
```

#### Verificar Limite:

```sql
SELECT check_api_cost_limit('ai', 'groq');
```

Retorna:
```json
{
  "allowed": true,
  "daily_spent": 0.45,
  "monthly_spent": 2.30,
  "warning": false
}
```

---

## Segurança

### Criptografia de API Keys

As API keys são armazenadas **criptografadas** no banco:

```typescript
// Ao salvar
const encrypted = await encrypt(apiKey);

// Ao usar
const decrypted = await decrypt(encrypted);
```

> Chave de criptografia: `API_CONFIG_ENCRYPTION_KEY` (variável de ambiente)

### Controle de Acesso

```typescript
// Verificação de admin
const { data: userRole } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .single();

if (userRole?.role !== 'admin') {
  return 403; // Forbidden
}
```

### Row Level Security (RLS)

```sql
-- Apenas admins podem ver/modificar configurações
CREATE POLICY "Admins can manage API configurations"
  ON api_configurations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
```

### Auditoria

Todas as alterações são registradas:

```sql
api_configuration_history (
  configuration_id,
  action,        -- 'created', 'updated', 'tested'
  changes,       -- JSON com alterações
  test_result,   -- Resultado do teste
  changed_by,    -- UUID do admin
  changed_at
)
```

---

## Integracao com Servicos Existentes

### Usar Configuração em Edge Functions

```typescript
// Buscar configuração ativa
const { data } = await supabase.functions.invoke('manage-api-configs', {
  body: {
    action: 'get_active',
    category: 'ocr',
    priority: 1
  }
});

const config = data.config.config_data;
const apiKey = config.api_key; // Já descriptografada

// Usar a API
const response = await fetch(config.endpoint, {
  headers: { 'apikey': apiKey }
});
```

### Registrar Uso Após Chamada

```typescript
import { logAPIUsage } from '../_shared/usageTracker';

const startTime = Date.now();
const response = await callOCR(...);
const responseTime = Date.now() - startTime;

// Registrar no banco
await logAPIUsage({
  configurationId: config.id,
  category: 'ocr',
  provider: 'ocr_space',
  userId: user.id,
  functionName: 'process-exam-document',
  operation: 'ocr',
  success: response.ok,
  responseTimeMs: responseTime,
  estimatedCost: 0.0001
});
```

---

## Migration e Deploy

### 1. Rodar Migrations

```bash
# Criar tabelas de configuração
supabase db push

# Ou aplicar migrations específicas
psql -h db.supabase.co -U postgres -d zoe_med \
  -f supabase/migrations/20251128_create_api_configurations.sql \
  -f supabase/migrations/20251128_add_api_usage_tracking.sql
```

### 2. Deploy de Edge Functions

```bash
# Deploy da função de gerenciamento
supabase functions deploy manage-api-configs

# Verificar deploy
supabase functions list
```

### 3. Adicionar ao Menu

Editar o componente de navegação para incluir link:

```typescript
{
  id: 'api-central',
  label: 'Central de APIs',
  icon: Settings,
  view: 'api-central',
  adminOnly: true
}
```

---

## Troubleshooting

### Erro: "Permissão Negada"

**Causa**: Usuário não é admin

**Solução**:
```sql
-- Tornar usuário admin
INSERT INTO user_roles (user_id, role)
VALUES ('uuid-do-usuario', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

### Teste de API Falhando

**Passos**:
1. Verifique se a API key está correta
2. Teste manualmente com curl/Postman
3. Verifique logs da edge function
4. Confirme que o endpoint está acessível

### Custos Não Sendo Rastreados

**Verifique**:
1. A função `log_api_usage` está sendo chamada?
2. Há registros na tabela `api_usage_logs`?
3. O `estimated_cost_usd` está sendo calculado?

```sql
-- Ver últimos logs
SELECT * FROM api_usage_logs
ORDER BY created_at DESC
LIMIT 10;
```

---

## Melhores Práticas

### 1. Sempre Teste Antes de Ativar
Evita erros em produção. Use o botão "Testar Conexão".

### 2. Configure Limites de Custo
Previne surpresas na fatura:

```sql
INSERT INTO api_cost_limits VALUES
  ('ai', 'groq', 5.00, 50.00, 80, true);
```

### 3. Monitore Regularmente
Acesse a aba "Métricas e Custos" semanalmente.

### 4. Use Fallbacks
Configure pelo menos 2 APIs por categoria:
- Prioridade 1: API principal (gratuita)
- Prioridade 2: API backup (gratuita/paga)

### 5. Rotacione API Keys
Periodicamente, troque as keys por segurança.

---

## Roadmap Futuro

- [ ] Alertas automáticos por email quando limite atingido
- [ ] Gráficos de tendência de custos
- [ ] Export de relatórios em CSV/PDF
- [ ] Integração com Slack para notificações
- [ ] Auto-scaling baseado em uso
- [ ] ML para prever custos futuros

---

## Suporte

Em caso de dúvidas:
- Documentação: `/docs`
- Email: admin@zoe-med.app
- GitHub Issues: https://github.com/reneerti/ProjetoZOE_MED_mvp_v1/issues

---

*Última atualização: Novembro 2025*
