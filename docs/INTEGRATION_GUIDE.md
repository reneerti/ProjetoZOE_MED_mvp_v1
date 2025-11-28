# Guia de Integração Completa - ZOE MED MVP

Este documento explica o fluxo completo de processamento de exames, desde o upload até a detecção de diagnósticos.

---

## Visão Geral do Fluxo

```
┌─────────────┐
│   UPLOAD    │  Usuário envia imagem/PDF do exame
└──────┬──────┘
       │
       ▼
┌─────────────┐
│     OCR     │  Extração de texto (OCR.space, Google Vision, Azure)
└──────┬──────┘  Fallback: IA com visão se OCR falhar
       │
       ▼
┌─────────────┐
│ ESTRUTURAR  │  IA analisa texto e extrai dados estruturados
│   COM IA    │  (Groq, Google AI, Together AI, etc.)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  MATCHING   │  Vincula com entidades do banco:
│  ENTIDADES  │  • Laboratórios (por nome)
└──────┬──────┘  • Médicos (por CRM)
       │          • Exames (biblioteca)
       │          • Parâmetros (códigos)
       ▼
┌─────────────┐
│   SALVAR    │  Grava no banco de dados:
│   BANCO     │  • exam_images (com foreign keys)
└──────┬──────┘  • exam_results (com parameter_code)
       │
       ▼
┌─────────────┐
│  DETECTAR   │  Análise automática de diagnósticos:
│ DIAGNÓSTICOS│  • Aplica regras diagnósticas
└──────┬──────┘  • Calcula confiança e urgência
       │          • Salva em identified_diagnoses
       ▼
┌─────────────┐
│   CACHE     │  Armazena resultado para reutilização
└─────────────┘
```

---

## Componentes Principais

### 1. Serviços de OCR

**Arquivo**: `supabase/functions/_shared/ocrService.ts`

Responsável por extrair texto de imagens. Suporta 3 providers com fallback:

- **OCR.space** (prioridade 1): 25.000 req/mês grátis
- **Google Vision** (prioridade 2): 1.000 req/mês grátis
- **Azure Vision** (prioridade 3): 5.000 req/mês grátis

```typescript
const ocrResult = await extractTextFromImage(imageBase64, 'image/jpeg');
// Returns: { success: true, text: "...", provider: "ocr_space", ... }
```

### 2. Processador de PDF

**Arquivo**: `supabase/functions/_shared/pdfProcessor.ts`

Converte PDF em imagens para processamento OCR:

- **PDF.co** (prioridade 1): 500 créditos/mês grátis
- **ConvertAPI** (prioridade 2): 250 conversões/mês grátis
- **CloudConvert** (prioridade 3): 25 conversões/dia grátis

```typescript
const pdfResult = await processPDF(pdfBase64, { maxPages: 5 });
// Returns: { success: true, pages: [...], provider: "pdf_co" }
```

### 3. Providers de IA

**Arquivo**: `supabase/functions/_shared/aiProviders.ts`

Estrutura os dados extraídos. Suporta 6 providers:

- **Groq** (prioridade 1): Ultrafast, 30 req/min grátis
- **Google AI** (prioridade 2): 60 req/min grátis
- **Together AI** (prioridade 3): Créditos gratuitos iniciais
- **OpenRouter** (prioridade 4): Acesso a múltiplos modelos
- **HuggingFace** (prioridade 5): Inference API gratuita
- **Lovable AI** (fallback): Provider original

```typescript
const aiResult = await analyzeExamsWithAI(prompt);
// Returns: { success: true, content: "{...json...}", provider: "groq", ... }
```

### 4. Entity Matcher

**Arquivo**: `supabase/functions/_shared/entityMatcher.ts`

Vincula dados extraídos com entidades do banco:

#### 4.1 Match de Laboratório

```typescript
const labMatch = await matchOrCreateLaboratory(supabase, "Laboratório XYZ");
// Busca: nome similar (case-insensitive)
// Cria: se não encontrar
// Returns: { id: "uuid", name: "...", matched: true, created: false }
```

#### 4.2 Match de Médico

```typescript
const doctorMatch = await matchOrCreateDoctor(
  supabase,
  "Dr. João Silva",
  "12345/SP"
);
// Busca: CRM exato
// Cria: se não encontrar
// Returns: { id: "uuid", full_name: "...", crm: "12345/SP", ... }
```

**Extração de CRM do texto**:
```typescript
const crm = extractCRMFromText(ocrText);
// Reconhece: "CRM 12345", "CRM-SP 12345", "CRM/SP: 12345"
```

#### 4.3 Match de Exame na Biblioteca

```typescript
const examMatch = await matchExamFromLibrary(
  supabase,
  "Hemograma Completo",
  "Hemograma"
);
// Estratégia 1: Match exato por nome
// Estratégia 2: Match parcial + aliases
// Estratégia 3: Match por categoria + nome
// Returns: { id: "uuid", exam_code: "HEM001", ... }
```

#### 4.4 Mapeamento de Parâmetros

```typescript
const mappings = await mapParametersToLibrary(
  supabase,
  examLibraryId,
  extractedParameters
);
// Match: nome do parâmetro extraído → parameter_code
// Returns: [
//   {
//     parameter_name: "Hemoglobina",
//     parameter_code: "HEM_HB",
//     exam_library_parameter_id: "uuid",
//     reference_range: [...]
//   }
// ]
```

#### 4.5 Determinação de Status

```typescript
const status = determineParameterStatus(
  value,         // 11.5
  referenceRanges,  // [{ min: 12.0, max: 16.0, sex: "female", ... }]
  age,           // 25
  sex            // "female"
);
// Returns: "baixo" | "normal" | "alto" | "critico"
```

### 5. Detector de Diagnósticos

**Arquivo**: `supabase/functions/_shared/diagnosisDetector.ts`

Identifica automaticamente condições clínicas baseado em regras:

```typescript
const diagnoses = await detectDiagnoses(
  supabase,
  userId,
  examImageId,
  userSex
);
// Returns: [
//   {
//     condition_id: "uuid",
//     condition_name: "Anemia Ferropriva",
//     confidence_score: 85,
//     matched_rules: ["Anemia Ferropriva - Critério Clássico"],
//     contributing_parameters: [
//       { parameter_code: "HEM_HB", value: 11.5, expected: "< 12.0" }
//     ],
//     urgency_level: "observacao"
//   }
// ]
```

**Como funciona**:

1. Busca parâmetros do exame com `parameter_code`
2. Busca regras diagnósticas ativas
3. Para cada regra:
   - Verifica se parâmetros atendem aos critérios
   - Calcula peso total
   - Verifica mínimos (matches e weight)
   - Calcula confiança (0-100%)
4. Salva em `identified_diagnoses`

**Exemplo de regra**:
```json
{
  "required_parameters": [
    {
      "parameter_code": "HEM_HB",
      "operator": "<",
      "value_female": 12.0,
      "weight": 3
    },
    {
      "parameter_code": "HEM_VCM",
      "operator": "<",
      "value": 80.0,
      "weight": 2
    }
  ],
  "minimum_matches": 2,
  "minimum_weight": 4
}
```

---

## Estrutura de Dados

### exam_images (Tabela Principal)

```sql
CREATE TABLE exam_images (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  ocr_text TEXT,
  processing_status TEXT,
  exam_date DATE,

  -- Campos TEXT (backward compatibility)
  lab_name TEXT,
  exam_category_id UUID,

  -- Novos vínculos (foreign keys)
  laboratory_id UUID REFERENCES laboratories(id),
  requesting_doctor_id UUID REFERENCES doctors(id),
  reporting_doctor_id UUID REFERENCES doctors(id),
  exam_library_id UUID REFERENCES exam_library(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### exam_results (Parâmetros)

```sql
CREATE TABLE exam_results (
  id UUID PRIMARY KEY,
  exam_image_id UUID REFERENCES exam_images(id),
  parameter_name TEXT NOT NULL,
  value NUMERIC,
  value_text TEXT,
  unit TEXT,
  status TEXT,

  -- Novos campos
  parameter_code TEXT,
  exam_library_parameter_id UUID REFERENCES exam_library_parameters(id)
);
```

### identified_diagnoses (Diagnósticos Detectados)

```sql
CREATE TABLE identified_diagnoses (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  exam_image_id UUID REFERENCES exam_images(id),
  condition_id UUID REFERENCES clinical_conditions(id),
  confidence_score NUMERIC(5,2),
  contributing_parameters JSONB,
  urgency_level TEXT,
  evolution_trend TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Exemplo Prático

### 1. Usuário faz upload de Hemograma

```json
{
  "fileUrl": "https://...",
  "examImageId": "uuid-123"
}
```

### 2. OCR extrai texto

```
LABORATÓRIO XYZ
HEMOGRAMA COMPLETO
Data: 15/11/2024
Dr. João Silva - CRM 12345/SP

Hemoglobina: 11.5 g/dL (12.0 - 16.0)
Hematócrito: 35% (36 - 48)
VCM: 75 fL (80 - 100)
Leucócitos: 7.200 /mm³ (4.000 - 11.000)
```

### 3. IA estrutura dados

```json
{
  "exam_name": "Hemograma Completo",
  "exam_date": "2024-11-15",
  "lab_name": "Laboratório XYZ",
  "category": "Hemograma",
  "parameters": [
    {
      "name": "Hemoglobina",
      "value": "11.5",
      "unit": "g/dL",
      "reference_range": "12.0 - 16.0",
      "status": "baixo"
    },
    {
      "name": "Hematócrito",
      "value": "35",
      "unit": "%",
      "reference_range": "36 - 48",
      "status": "baixo"
    },
    {
      "name": "VCM",
      "value": "75",
      "unit": "fL",
      "reference_range": "80 - 100",
      "status": "baixo"
    }
  ]
}
```

### 4. Entity Matching

```typescript
// Laboratório
labMatch = { id: "lab-uuid", name: "Laboratório XYZ", created: true }

// Médico
doctorMatch = {
  id: "doc-uuid",
  full_name: "Dr. João Silva",
  crm: "12345/SP",
  created: true
}

// Exame
examMatch = {
  id: "exam-lib-uuid",
  exam_code: "HEM001",
  exam_name: "Hemograma Completo"
}

// Parâmetros
parameterMappings = [
  {
    parameter_name: "Hemoglobina",
    parameter_code: "HEM_HB",
    exam_library_parameter_id: "param-uuid-1",
    reference_range: [
      { age_min: 15, sex: "female", min: 12.0, max: 16.0 }
    ]
  },
  {
    parameter_name: "Hematócrito",
    parameter_code: "HEM_HT",
    exam_library_parameter_id: "param-uuid-2"
  },
  {
    parameter_name: "VCM",
    parameter_code: "HEM_VCM",
    exam_library_parameter_id: "param-uuid-3"
  }
]
```

### 5. Salvamento no Banco

```sql
-- exam_images
UPDATE exam_images SET
  ocr_text = 'LABORATÓRIO XYZ...',
  processing_status = 'completed',
  exam_date = '2024-11-15',
  lab_name = 'Laboratório XYZ',
  laboratory_id = 'lab-uuid',
  requesting_doctor_id = 'doc-uuid',
  exam_library_id = 'exam-lib-uuid'
WHERE id = 'uuid-123';

-- exam_results
INSERT INTO exam_results (
  exam_image_id, parameter_name, value, unit, status,
  parameter_code, exam_library_parameter_id
) VALUES
  ('uuid-123', 'Hemoglobina', 11.5, 'g/dL', 'baixo', 'HEM_HB', 'param-uuid-1'),
  ('uuid-123', 'Hematócrito', 35, '%', 'baixo', 'HEM_HT', 'param-uuid-2'),
  ('uuid-123', 'VCM', 75, 'fL', 'baixo', 'HEM_VCM', 'param-uuid-3');
```

### 6. Detecção de Diagnósticos

```typescript
// Sistema verifica regra de Anemia Ferropriva:
// - HEM_HB < 12.0 (female): ✅ (11.5 < 12.0) weight: 3
// - HEM_HT < 36.0: ✅ (35 < 36) weight: 2
// - HEM_VCM < 80.0: ✅ (75 < 80) weight: 2
// Total matches: 3/3 ✅
// Total weight: 7 (mínimo: 5) ✅
// Confidence: 95%

diagnoses = [
  {
    condition_name: "Anemia Ferropriva",
    condition_code: "D50",
    confidence_score: 95,
    urgency_level: "observacao",
    contributing_parameters: [
      { parameter_code: "HEM_HB", value: 11.5, expected: "< 12.0" },
      { parameter_code: "HEM_HT", value: 35, expected: "< 36.0" },
      { parameter_code: "HEM_VCM", value: 75, expected: "< 80.0" }
    ]
  }
]
```

```sql
INSERT INTO identified_diagnoses (
  user_id, exam_image_id, condition_id,
  confidence_score, urgency_level, contributing_parameters
) VALUES (
  'user-uuid', 'uuid-123', 'condition-d50-uuid',
  95, 'observacao',
  '[{"parameter_code":"HEM_HB","value":11.5,"expected":"< 12.0"}]'::JSONB
);
```

---

## Queries Úteis

### Buscar exames com diagnósticos

```sql
SELECT
  ei.exam_date,
  el.exam_name,
  cc.condition_name,
  id.confidence_score,
  id.urgency_level
FROM exam_images ei
LEFT JOIN exam_library el ON ei.exam_library_id = el.id
LEFT JOIN identified_diagnoses id ON ei.id = id.exam_image_id
LEFT JOIN clinical_conditions cc ON id.condition_id = cc.id
WHERE ei.user_id = 'user-uuid'
ORDER BY ei.exam_date DESC;
```

### Evolução de um diagnóstico

```sql
SELECT
  ei.exam_date,
  id.confidence_score,
  id.urgency_level
FROM identified_diagnoses id
JOIN exam_images ei ON id.exam_image_id = ei.id
WHERE id.user_id = 'user-uuid'
  AND id.condition_id = 'condition-uuid'
ORDER BY ei.exam_date ASC;
```

### Parâmetros alterados ao longo do tempo

```sql
SELECT
  ei.exam_date,
  er.parameter_name,
  er.value,
  er.unit,
  er.status
FROM exam_results er
JOIN exam_images ei ON er.exam_image_id = ei.id
WHERE ei.user_id = 'user-uuid'
  AND er.parameter_code = 'HEM_HB'
ORDER BY ei.exam_date ASC;
```

---

## Configuração

### 1. Variáveis de Ambiente

```env
# OCR Services
OCR_SPACE_API_KEY=your_key_here
GOOGLE_VISION_API_KEY=your_key_here
AZURE_VISION_API_KEY=your_key_here

# PDF Processing
PDF_CO_API_KEY=your_key_here
CONVERTAPI_SECRET=your_secret_here
CLOUDCONVERT_API_KEY=your_key_here

# AI Providers
GROQ_API_KEY=your_key_here
GOOGLE_AI_API_KEY=your_key_here
TOGETHER_API_KEY=your_key_here
OPENROUTER_API_KEY=your_key_here
HUGGINGFACE_API_KEY=your_key_here

# Database
SUPABASE_URL=your_url_here
SUPABASE_SERVICE_ROLE_KEY=your_key_here
```

### 2. Migrations

Execute as migrations na ordem:

```bash
# 1. Estrutura base
psql -f supabase/migrations/20251128_complete_database_structure.sql

# 2. Biblioteca de exames
psql -f supabase/migrations/20251128_seed_exam_library.sql

# 3. Condições clínicas
psql -f supabase/migrations/20251128_seed_clinical_conditions.sql

# 4. Atualizar exam_results
psql -f supabase/migrations/20251128_update_exam_results.sql

# 5. Rastreamento de APIs
psql -f supabase/migrations/20251128_create_api_configurations.sql
psql -f supabase/migrations/20251128_add_api_usage_tracking.sql
```

### 3. Deploy das Edge Functions

```bash
supabase functions deploy process-exam-document
supabase functions deploy manage-api-configs
```

---

## Troubleshooting

### Erro: "Nenhum parâmetro mapeado para a biblioteca"

**Causa**: Exame não encontrado na biblioteca ou nomes de parâmetros diferentes

**Solução**:
1. Adicionar aliases ao exame na biblioteca
2. Ajustar mapeamento de parâmetros
3. Verificar logs de matching

### Erro: "Diagnóstico não detectado"

**Causa**: Regras não atendem aos critérios mínimos

**Solução**:
1. Verificar se parâmetros têm `parameter_code`
2. Ajustar `minimum_matches` ou `minimum_weight` nas regras
3. Verificar logs de avaliação de regras

### Erro: "CRM não extraído"

**Causa**: Formato não reconhecido

**Solução**:
1. Adicionar novo padrão em `extractCRMFromText()`
2. Verificar OCR (pode ter erro de leitura)

---

## Melhorias Futuras

- [ ] **Machine Learning** para melhorar matching de parâmetros
- [ ] **Normalização automática** de unidades de medida
- [ ] **Comparação entre laboratórios** (diferentes referências)
- [ ] **Alertas proativos** quando diagnóstico urgente detectado
- [ ] **Sugestões de exames** complementares baseado em diagnósticos
- [ ] **Integração com CID-10** oficial
- [ ] **Export para PDF** com relatório completo
- [ ] **Timeline visual** de evolução de parâmetros

---

## Suporte

- **Documentação**: `/docs`
- **Issues**: https://github.com/reneerti/ProjetoZOE_MED_mvp_v1/issues
- **Email**: admin@zoe-med.app

---

*Última atualização: Novembro 2025*
