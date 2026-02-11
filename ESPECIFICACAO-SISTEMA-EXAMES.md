# 📋 ESPECIFICAÇÃO COMPLETA — Sistema de Exames ZoeMed

> Documento para reconstrução do sistema do zero no Lovable, focando apenas nos módulos: **EXAMES, DASHBOARD, SCORE DE SAÚDE, EVOLUÇÕES**.

---

## 1. VISÃO GERAL

### O que é
Aplicação web (PWA) de saúde pessoal focada em **análise inteligente de exames laboratoriais** com IA. O usuário faz upload de imagens/PDFs de exames, o sistema extrai dados via OCR com IA, analisa os resultados contra parâmetros de referência clínica, calcula um **Score de Saúde** (0-1000, estilo Serasa), agrupa resultados por categoria, identifica pré-diagnósticos e acompanha a evolução ao longo do tempo.

### Stack Tecnológica
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (Auth, Database, Storage, Edge Functions)
- **IA:** Lovable AI (Gemini 2.5 Flash/Pro) via gateway `ai.gateway.lovable.dev`
- **Gráficos:** Recharts
- **Validação:** Zod
- **Estado:** React Query (TanStack Query)

### Arquitetura de Navegação
- SPA com navegação por estado (`currentView`) — sem rotas React Router (exceto `/auth`)
- Bottom Navigation com 4-5 abas
- Views renderizadas condicionalmente via switch/case
- Estado da view persistido em `localStorage`

---

## 2. AUTENTICAÇÃO

### Hook: `useAuth`
```typescript
// Usa supabase.auth.onAuthStateChange para listener
// supabase.auth.getSession para sessão existente
// Retorna: { user, session, loading, signOut, hasRole }
```

### Fluxo
1. Página `/auth` com formulários de login/signup (email + senha)
2. Verificação de email obrigatória (NÃO usar auto-confirm)
3. Após login, redireciona para `/` (Index)
4. Se não autenticado, redireciona para `/auth`
5. Roles: `admin`, `user`, `controller` (tabela `user_roles`)

### Página Auth
- Formulário de login com email/senha
- Formulário de cadastro com validação de senha forte
- Toggle entre login/cadastro

---

## 3. BANCO DE DADOS — Tabelas Necessárias

### 3.1 Tabelas Core de Exames

#### `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY, -- mesmo ID do auth.users
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- Trigger: criar perfil automaticamente ao criar usuário (on auth.users INSERT)
```

#### `user_roles`
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL, -- ENUM: 'admin', 'user', 'controller'
  created_at TIMESTAMPTZ DEFAULT now()
);
-- Trigger: atribuir role 'user' ao criar novo usuário
```

#### `exam_categories`
```sql
CREATE TABLE exam_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- Ex: "Hemograma", "Perfil Lipídico", "Glicemia"
  description TEXT,
  icon TEXT, -- Emoji ou nome de ícone
  created_at TIMESTAMPTZ DEFAULT now()
);
-- Dados seed: Hemograma, Perfil Lipídico, Glicemia, Função Renal, Função Hepática, Tireoide, Vitaminas, Hormônios
```

#### `exam_types`
```sql
CREATE TABLE exam_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES exam_categories(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `exam_images` (tabela principal de exames)
```sql
CREATE TABLE exam_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL, -- path no Storage
  ocr_text TEXT, -- texto extraído pelo OCR
  processing_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  exam_date DATE,
  lab_name TEXT,
  requesting_doctor TEXT,
  reporting_doctor TEXT,
  upload_date TIMESTAMPTZ DEFAULT now(),
  file_type TEXT, -- 'image' ou 'pdf'
  exam_category_id UUID REFERENCES exam_categories(id),
  exam_type_id UUID REFERENCES exam_types(id),
  exam_id UUID REFERENCES exams(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `exam_results` (parâmetros extraídos)
```sql
CREATE TABLE exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_image_id UUID REFERENCES exam_images(id),
  parameter_name TEXT NOT NULL,
  value NUMERIC,
  value_text TEXT,
  unit TEXT,
  status TEXT DEFAULT 'normal', -- 'normal', 'high', 'low', 'critical'
  parameter_id UUID REFERENCES exam_parameters(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `exam_parameters` (parâmetros de referência por tipo de exame)
```sql
CREATE TABLE exam_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_type_id UUID REFERENCES exam_types(id),
  parameter_name TEXT NOT NULL,
  unit TEXT,
  reference_min NUMERIC,
  reference_max NUMERIC,
  critical_low NUMERIC,
  critical_high NUMERIC,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `clinical_reference_parameters` (referências clínicas gerais)
```sql
CREATE TABLE clinical_reference_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter_name TEXT NOT NULL,
  parameter_category TEXT NOT NULL, -- Ex: "Glicemia", "Lipidograma"
  unit TEXT,
  reference_min NUMERIC,
  reference_max NUMERIC,
  critical_min NUMERIC,
  critical_max NUMERIC,
  description TEXT,
  related_conditions TEXT[], -- Ex: ["Diabetes", "Síndrome Metabólica"]
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- Seed com parâmetros comuns: Glicose, Hemoglobina, Colesterol Total, LDL, HDL, etc.
```

#### `exams` (exames manuais/legacy)
```sql
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  exam_name TEXT NOT NULL,
  exam_date DATE NOT NULL,
  status TEXT NOT NULL,
  results JSONB,
  notes TEXT,
  category_id UUID REFERENCES exam_categories(id),
  type_id UUID REFERENCES exam_types(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.2 Tabelas de Análise e Score

#### `health_analysis` (análise integrada + score)
```sql
CREATE TABLE health_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE, -- uma análise por usuário (upsert)
  health_score NUMERIC, -- Score 0-10 (multiplicado por 100 no frontend = 0-1000)
  analysis_summary JSONB, -- Contém: summary, pre_diagnostics, grouped_results, evolution
  attention_points JSONB, -- Pontos de atenção
  specialist_recommendations JSONB, -- Especialistas recomendados
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Estrutura do `analysis_summary` JSONB:**
```json
{
  "summary": "Resumo geral da saúde",
  "pre_diagnostics": [
    {
      "name": "Síndrome Metabólica",
      "severity": "high|medium|low",
      "related_parameters": [
        { "name": "HOMA-IR", "value": 3.5, "unit": "", "status": "alto" }
      ],
      "explanation": "Explicação simples",
      "recommendations": ["Recomendação 1", "Recomendação 2"]
    }
  ],
  "grouped_results": [
    {
      "category_name": "Glicemia e Insulina",
      "category_icon": "heart",
      "parameters": [
        {
          "name": "Glicose",
          "value": 95,
          "unit": "mg/dL",
          "status": "normal",
          "reference_range": "70 - 100 mg/dL"
        }
      ]
    }
  ],
  "evolution": [...],
  "patient_view": {...}
}
```

#### `health_alerts`
```sql
CREATE TABLE health_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  exam_image_id UUID REFERENCES exam_images(id),
  parameter_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  critical_threshold NUMERIC NOT NULL,
  threshold_type TEXT NOT NULL, -- 'high' ou 'low'
  severity TEXT NOT NULL, -- 'warning' ou 'critical'
  status TEXT DEFAULT 'unread', -- 'unread', 'read', 'dismissed'
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `evolution_notes`
```sql
CREATE TABLE evolution_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  note_date DATE NOT NULL,
  notes TEXT,
  health_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.3 Tabelas de Infraestrutura IA

#### `ai_usage_logs`
```sql
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  function_name TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'lovable_ai', 'gemini_api', 'groq_api', 'cache_hit'
  model TEXT,
  success BOOLEAN DEFAULT true,
  response_time_ms INTEGER,
  tokens_used INTEGER,
  estimated_cost_usd NUMERIC,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `ai_response_cache`
```sql
CREATE TABLE ai_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL,
  function_name TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  response_data JSONB NOT NULL,
  provider TEXT NOT NULL,
  model TEXT,
  tokens_used INTEGER,
  hit_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `rate_limits`
```sql
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.4 Functions de Banco

#### `check_rate_limit`
```sql
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER
) RETURNS JSONB AS $$
-- Verifica se o usuário excedeu o limite de requisições
-- Retorna: { allowed: boolean, retry_after: integer, reset_at: timestamp }
-- Lógica: conta requests na janela de tempo, se < max permite, senão bloqueia
$$;
```

#### `handle_new_user` (trigger)
```sql
-- Trigger em auth.users AFTER INSERT
-- Cria registro em profiles com id = new.id
-- Cria registro em user_roles com role = 'user'
```

### 3.5 Storage Buckets

#### `exam-images`
- Bucket para armazenar imagens/PDFs dos exames
- Políticas: usuários só acessam seus próprios arquivos
- Path: `{user_id}/{timestamp}.{ext}`

### 3.6 RLS Policies (Padrão para todas as tabelas)
```sql
-- Padrão para tabelas com user_id:
-- SELECT: auth.uid() = user_id
-- INSERT: auth.uid() = user_id (WITH CHECK)
-- UPDATE: auth.uid() = user_id
-- DELETE: auth.uid() = user_id

-- exam_categories, exam_types, clinical_reference_parameters: SELECT público
-- exam_parameters: SELECT público
```

---

## 4. EDGE FUNCTIONS (Backend)

### 4.1 `process-ocr` — Extração OCR com IA

**Fluxo:**
1. Recebe `imageUrl` + `examImageId`
2. Autentica usuário via header `Authorization`
3. Verifica rate limit (10/min)
4. Verifica ownership do exame
5. Baixa imagem, converte para base64
6. Envia para Lovable AI (Gemini 2.5 Flash) com prompt de OCR
7. Extrai JSON estruturado: `exam_name`, `exam_date`, `lab_name`, `category`, `parameters[]`
8. Salva `ocr_text` em `exam_images`
9. Insere parâmetros em `exam_results`
10. Busca `exam_category_id` pelo nome da categoria

**Prompt OCR:**
```
Analise esta imagem de exame médico e extraia:
- exam_name, exam_date (YYYY-MM-DD), lab_name, category
- parameters: [{ name, value (só número), unit, reference, status }]
- full_text: texto completo organizado
```

**Modelo:** `google/gemini-2.5-flash` (com visão)
**Response format:** `json_object`

### 4.2 `analyze-exams-integrated` — Análise Integrada com IA

**Fluxo:**
1. Autentica usuário
2. Rate limit (5/min — operação intensiva)
3. Busca todos `exam_images` com status `completed`
4. Busca `clinical_reference_parameters` (referências)
5. Busca `exam_results` dos exames
6. Enriquece resultados com referências clínicas
7. Envia para IA (Gemini 2.5 Pro) com prompt de análise integrada
8. IA retorna: `health_score`, `pre_diagnostics`, `grouped_results`, `attention_points`, `specialists`
9. Valida JSON com schema Zod
10. Cria `health_alerts` para valores críticos
11. Faz upsert em `health_analysis`

**Modelo:** `google/gemini-2.5-pro` (raciocínio complexo)

**Estrutura de retorno da IA:**
```json
{
  "health_score": 6.2,
  "summary": "...",
  "pre_diagnostics": [...],
  "grouped_results": [...],
  "attention_points": [...],
  "specialists": [...]
}
```

### 4.3 `analyze-exam` — Análise Individual

- Recebe dados de 1 exame
- Retorna análise textual com: análise geral, pontos de atenção, recomendações
- Modelo: `google/gemini-2.5-flash`

### 4.4 Sistema de Fallback de IA (`_shared/aiFallback.ts`)

**Cadeia de fallback tripla:**
1. **Lovable AI** (gateway principal) → `ai.gateway.lovable.dev`
2. **Google Gemini API** (fallback 1) → requer `GOOGLE_AI_API_KEY`
3. **Groq API** (fallback 2) → requer `GROQ_API_KEY`

**Features:**
- Cache inteligente (24h TTL) em `ai_response_cache`
- Controle de orçamento via `ai_budget_config`
- Logging de uso em `ai_usage_logs`
- Estimativa de custo por chamada

### 4.5 Secrets Necessários
- `LOVABLE_API_KEY` (automático no Lovable Cloud)
- `GOOGLE_AI_API_KEY` (fallback — opcional)
- `GROQ_API_KEY` (fallback — opcional)

---

## 5. MÓDULOS DO FRONTEND

### 5.1 DASHBOARD (Tela Inicial)

**Componente:** `Dashboard.tsx`

**Header:** 
- Logo, nome do usuário, botão de logout
- Ícone de alertas com badge de contagem

**Health Score Card:**
- Score numérico grande (0-1000, estilo Serasa)
- Badge de classificação: Excelente (≥800), Muito Bom (≥600), Bom (≥400), Regular (≥200), Necessita Atenção (<200)
- Barra de progresso com gradiente verde→ciano
- Mini gráfico de evolução de marcadores críticos
- Clique → navega para Health Dashboard
- Score cacheado em `localStorage`

**Cards de Módulos:**
- **Meus Exames:** contagem de exames, badges (normais/atenção/críticos), borda azul
- **Evolução Geral:** score, borda amarela
- Cada card é clicável e navega para o módulo

**Dados carregados em paralelo:**
```typescript
const [profile, examResults, examImages, medications, bioimpedance, 
       analysis, alerts, roles, supplements, wearables] = await Promise.all([...]);
```

### 5.2 MEUS EXAMES (`ExamsModule.tsx`)

**Header verde gradiente** com filtros (Todos, Normais, Atenção)

**Seção Upload:**
- Botões: Tirar Foto (camera) + Upload Arquivo
- Aceita: JPG, PNG, WEBP, PDF (máx 10MB)
- Compressão automática de imagem (max 1920px, quality 0.85, max 2MB)
- Preview da imagem antes de confirmar
- Metadados opcionais: médico solicitante, médico laudador, data do exame

**Fluxo de Upload:**
1. Seleciona arquivo → comprime → mostra preview
2. Preenche metadados (opcional) → confirma
3. Upload para Storage (`exam-images/{userId}/{timestamp}.ext`)
4. Insere registro em `exam_images` (status: pending)
5. Invoca `process-ocr` em background
6. Listener realtime: quando status muda para `completed`, atualiza lista
7. Invoca `analyze-exams-integrated` automaticamente

**Botão "Analisar com IA":**
- Invoca `analyze-exams-integrated`
- Exibe loading com animação
- Atualiza análise no estado local

**Resultados:**
- `ExamPreDiagnostics` — cards de possíveis pré-diagnósticos agrupados
- `ExamGroupedResults` — parâmetros organizados por categoria clínica
- Filtro por status (normal/atenção)

**Botões auxiliares:**
- Histórico de uploads
- Estatísticas
- Ver exames por data

### 5.3 MEUS EXAMES — Vista Alternativa (`MyExamsModule.tsx`)

**Tabs:** Upload | Resultados | Análise

**Aba Resultados:**
- Exames agrupados por CATEGORIA (Hemograma, Perfil Lipídico, etc.)
- Cada grupo é colapsável (accordion)
- Cada parâmetro mostra: nome, valor, unidade, status badge
- Comparação temporal: ícone trending up/down entre exames

**Aba Análise:**
- `PatientAnalysisView` — visão integrada da análise do paciente
- Dados de `health_analysis.analysis_summary.patient_view`

### 5.4 EXAMES POR DATA (`ExamsByDateView.tsx`)

- Lista exames agrupados por data (formato DD/MM/YYYY)
- Estrutura colapsável tipo pasta
- Mostra lab_name, contagem de parâmetros, status geral

### 5.5 PRÉ-DIAGNÓSTICOS (`ExamPreDiagnostics.tsx`)

**Props:** `preDiagnostics: PreDiagnostic[]`

**Card por pré-diagnóstico:**
- Gradiente de cor por severidade (high=vermelho, medium=amarelo, low=azul)
- Ícone por tipo (Heart, Activity, Droplet, AlertCircle)
- Ícone Brain (roxo) para indicar análise IA
- Lista de parâmetros relacionados com valores e status
- Explicação em texto
- Lista de recomendações
- **Disclaimer médico obrigatório** em cada card

### 5.6 RESULTADOS AGRUPADOS (`ExamGroupedResults.tsx`)

**Props:** `groupedResults: GroupedResult[]`, `statusFilter`

**Card por categoria:**
- Ícone por categoria (Heart, Droplet, Activity, etc.)
- Badge de contagem de parâmetros
- Background verde se TODOS normais, vermelho se há críticos
- Lista de parâmetros com: nome, valor, unidade, status badge, range de referência
- Clique no parâmetro → abre gráfico de tendência (`ParameterTrendChart`)
- Clique na categoria → abre modal de evolução (`ExamCategoryEvolutionModal`)

### 5.7 HEALTH DASHBOARD (`HealthDashboardView.tsx`)

**Página completa** (não modal) acessível clicando no Health Score Card.

**Conteúdo:**
- Score de saúde em destaque
- Tabs por categoria: Todas, Cardiologia, Metabolismo, Função Hepática
- Tabela de parâmetros com cores por status
- Gráficos de evolução temporal por categoria
- Pontos de atenção em destaque
- Recomendações de especialistas

### 5.8 EVOLUÇÃO (`EvolutionModule.tsx`)

**Header** com score de saúde e botões de navegação

**Seção Análise de Saúde:**
- Score visual
- Pontos de atenção com badges de severidade
- Recomendações de especialistas com prioridade

**Gráficos de Evolução:**
- Select de parâmetro para visualizar
- LineChart (Recharts) com dados temporais
- Valores de referência como linhas horizontais
- Tooltip com detalhes

**Dados carregados:**
```typescript
// health_analysis → score, attention_points, specialist_recommendations
// exam_results com join exam_images → dados para gráficos
// exam_parameters → linhas de referência
```

### 5.9 GRÁFICOS DE EVOLUÇÃO (`ExamEvolutionCharts.tsx`)

**Features:**
- Lista de parâmetros disponíveis (extraídos de exam_results)
- Seleção múltipla de parâmetros para comparar
- Filtro por período (3m, 6m, 1a, todos)
- Zoom in/out
- LineChart com múltiplas linhas (uma cor por parâmetro)
- Tooltip detalhado

### 5.10 COMPARAÇÃO POR PERÍODO (`PeriodComparisonView.tsx`)

- Selecionar 2 períodos para comparar side-by-side
- Gráficos before/after
- Indicadores de tendência

### 5.11 TIMELINE DO PACIENTE (`PatientTimelineView.tsx`)

- Timeline vertical cronológica
- Eventos: uploads, análises, alertas
- Filtros por categoria de parâmetro
- Anotações/observações

### 5.12 ALERTAS CRÍTICOS (`CriticalAlertsDashboard.tsx`)

- Lista de health_alerts não lidos
- Severidade: critical (vermelho), warning (amarelo)
- Ação: marcar como lido, dispensar
- Badge no dashboard com contagem

---

## 6. COMPONENTES AUXILIARES

### 6.1 Bottom Navigation (`BottomNav.tsx`)
```
Dashboard | Exames | Evolução | Perfil
```

### 6.2 Image Compression (`lib/imageCompression.ts`)
- Redimensiona para max 1920x1920
- Qualidade 0.85
- Max output 2MB
- Retorna File comprimido

### 6.3 Exam Cache Hook (`useExamCache.tsx`)
- Cache local dos dados de análise
- Refresh manual
- Invalidação após nova análise
- Timestamp de última atualização

### 6.4 Subscription Hook (`useSubscription.tsx`)
- Controla limite de uploads por plano
- `checkExamLimit()` → `{ allowed, message }`
- `incrementExamCount()`

---

## 7. DESIGN SYSTEM

### Cores Semânticas (index.css)
```css
--primary: cor principal (verde médico)
--success: verde (#10B981)
--warning: amarelo (#F59E0B)
--destructive: vermelho (#EF4444)
--accent: ciano (#06B6D4)
```

### Padrões Visuais
- Cards com `border-l-4` colorido por módulo
- Badges de status com cores: verde=normal, vermelho=alterado/crítico
- Ícone Brain (roxo) = informação gerada por IA
- Gradientes no header de cada módulo
- Animações: `animate-fade-in`, `animate-slide-in-right`, `animate-scale-in`
- Mobile-first, max-width 2xl centralizado
- Sombras em cards: `shadow-lg`, `hover:shadow-xl`

### Regras de UX
1. **Disclaimer médico** em toda análise IA
2. **Cores por criticidade:** vermelho=crítico, amarelo=atenção, verde=normal
3. **Exames só nos últimos 12 meses** contam para o score
4. **Resultados exclusivamente no módulo EXAMES** (não no dashboard)
5. **Upload + Resultados** na mesma view (MEUS EXAMES é a entrada principal)

---

## 8. FLUXO COMPLETO DO USUÁRIO

```
1. Cadastro/Login
   └→ Página /auth → email + senha → verificação email

2. Dashboard
   └→ Health Score Card (0-1000)
   └→ Cards: Meus Exames, Evolução
   └→ Alertas de saúde (badge)

3. Meus Exames (módulo principal)
   └→ Upload foto/arquivo
       └→ Compressão automática
       └→ Preview + metadados (médico, data)
       └→ Upload para Storage
       └→ process-ocr (background)
           └→ Baixa imagem → base64
           └→ Envia para Gemini Flash (visão)
           └→ Extrai: nome, data, lab, parâmetros
           └→ Salva em exam_images + exam_results
       └→ analyze-exams-integrated (automático)
           └→ Busca todos exames + referências
           └→ Envia para Gemini Pro
           └→ Retorna: score, pré-diagnósticos, agrupamentos
           └→ Cria health_alerts para críticos
           └→ Upsert em health_analysis
   └→ Visualização de resultados
       └→ Pré-diagnósticos (cards coloridos)
       └→ Resultados agrupados por categoria
       └→ Filtros: Todos, Normais, Atenção
   └→ Botão "Analisar com IA" (re-análise manual)

4. Health Dashboard
   └→ Score detalhado
   └→ Parâmetros por categoria
   └→ Gráficos de evolução
   └→ Pontos de atenção
   └→ Especialistas recomendados

5. Evolução
   └→ Gráficos temporais de parâmetros
   └→ Seleção múltipla de parâmetros
   └→ Filtro por período
   └→ Comparação com referências

6. Alertas
   └→ Lista de valores críticos
   └→ Marcar como lido
```

---

## 9. REALTIME

```sql
-- Habilitar realtime para acompanhar processamento OCR
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_images;
```

**Uso no frontend:**
```typescript
supabase.channel('exam-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'exam_images',
    filter: 'processing_status=eq.completed'
  }, async (payload) => {
    // Recarregar exames
    // Executar análise integrada
    // Atualizar UI
  })
  .subscribe();
```

---

## 10. VALIDAÇÃO (Zod)

### Frontend (`lib/validation.ts`)
```typescript
// fileUploadSchema: File, tipo (jpg/png/webp/pdf), max 10MB
// examMetadataSchema: requestingDoctor, reportingDoctor, examDate
```

### Backend (`_shared/aiSchemas.ts`)
```typescript
// ocrExtractionSchema: valida saída do OCR
// analysisSchema: valida saída da análise integrada
```

---

## 11. OBSERVAÇÕES PARA RECONSTRUÇÃO

### Ordem de Implementação Sugerida
1. **Auth** — login/signup/verificação email
2. **Database** — todas as tabelas + RLS + triggers
3. **Storage** — bucket exam-images
4. **Dashboard** — layout básico + Health Score Card
5. **Upload de Exames** — upload + compressão
6. **Edge Function process-ocr** — OCR com Gemini Flash
7. **Edge Function analyze-exams-integrated** — análise com Gemini Pro
8. **Resultados** — ExamPreDiagnostics + ExamGroupedResults
9. **Evolução** — gráficos com Recharts
10. **Health Dashboard** — visão completa do score
11. **Alertas** — health_alerts + notificações
12. **Realtime** — atualização automática pós-OCR

### Pontos Críticos
- **NÃO usar auto-confirm de email** 
- **RLS em TODAS as tabelas** com user_id
- **Compressão obrigatória** antes do upload
- **Rate limiting** em todas as edge functions
- **Disclaimer médico** em toda análise IA
- **Cache de IA** para economizar chamadas
- **Fallback chain** para resiliência
- **Validação Zod** tanto no front quanto no back
