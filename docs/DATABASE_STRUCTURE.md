##

 Estrutura Completa do Banco de Dados - ZOE MED

Este documento explica como funciona o fluxo completo de processamento de exames e diagnósticos.

---

## 📊 Fluxo Completo de Processamento

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. UPLOAD DO EXAME                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
         Usuario faz upload de imagem/PDF do exame
                              ↓
                    ┌─────────────────┐
                    │  exam_images    │
                    ├─────────────────┤
                    │ - user_id       │
                    │ - image_url     │
                    │ - status: pending│
                    └─────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 2. PROCESSAMENTO OCR                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
              Servico OCR extrai texto da imagem
                     (OCR.space/Google Vision)
                              ↓
                    ┌─────────────────┐
                    │  exam_images    │
                    ├─────────────────┤
                    │ - ocr_text ✓    │
                    │ - status: processing│
                    └─────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 3. ESTRUTURAÇÃO COM IA                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
        IA estrutura o texto e identifica:
        - Nome do exame
        - Data do exame
        - Laboratorio
        - Parametros e valores
                              ↓
           ┌──────────────────────────────────┐
           │ Busca na BIBLIOTECA DE EXAMES    │
           │ (exam_library)                   │
           │                                  │
           │ Encontrou "Hemograma Completo"?  │
           └──────────────┬───────────────────┘
                          │
              ┌───────────┴────────────┐
              │                        │
             SIM                      NÃO
              │                        │
              ↓                        ↓
    ┌──────────────────┐    ┌──────────────────┐
    │ MATCH EXATO      │    │ CRIA GENÉRICO    │
    │ exam_library_id  │    │ sem library_id   │
    └──────────────────┘    └──────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 4. SALVAMENTO NO BANCO                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
           Atualiza exam_images com relacionamentos:
                              ↓
       ┌────────────────────────────────────────────┐
       │  exam_images                               │
       ├────────────────────────────────────────────┤
       │ - ocr_text: "HEMOGRAMA COMPLETO..."        │
       │ - exam_library_id: uuid-hemograma          │
       │ - laboratory_id: uuid-lab (se encontrado)  │
       │ - requesting_doctor_id: uuid-doc           │
       │ - exam_date: "2024-11-28"                  │
       │ - status: completed ✓                      │
       └────────────────────────────────────────────┘
                              ↓
            Salva cada parâmetro extraído:
                              ↓
       ┌────────────────────────────────────────────┐
       │  exam_results                              │
       ├────────────────────────────────────────────┤
       │ - exam_image_id                            │
       │ - parameter_name: "Hemácias"               │
       │ - value: 4.5                               │
       │ - unit: "milhões/mm³"                      │
       │ - status: "normal"                         │
       └────────────────────────────────────────────┘
       │ - parameter_name: "Hemoglobina"            │
       │ - value: 13.2                              │
       │ - unit: "g/dL"                             │
       │ - status: "normal"                         │
       └────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 5. ANÁLISE DE DIAGNÓSTICOS (QUANDO SOLICITADO)                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
    Usuario clica em "Analisar Exames" no dashboard
                              ↓
          ┌─────────────────────────────────────┐
          │ Sistema busca REGRAS DE DIAGNÓSTICO │
          │ (diagnostic_rules)                  │
          └─────────────────────────────────────┘
                              ↓
           Para cada regra, verifica critérios:
                              ↓
    ┌──────────────────────────────────────────────────┐
    │ EXEMPLO: Anemia Ferropriva                       │
    ├──────────────────────────────────────────────────┤
    │ Critérios:                                       │
    │ - Hemoglobina < 13.5 (homem) ou < 12.0 (mulher) │
    │ - VCM < 80                                       │
    │ - HCM < 27                                       │
    │                                                  │
    │ Usuario tem:                                     │
    │ - Hemoglobina: 11.5 ✓ (abaixo)                  │
    │ - VCM: 75 ✓ (abaixo)                            │
    │ - HCM: 24 ✓ (abaixo)                            │
    │                                                  │
    │ ➡️ 3 de 3 critérios atendidos                    │
    │ ➡️ Confiança: 85%                                │
    │ ➡️ DIAGNÓSTICO IDENTIFICADO!                     │
    └──────────────────────────────────────────────────┘
                              ↓
       ┌────────────────────────────────────────────┐
       │  identified_diagnoses                      │
       ├────────────────────────────────────────────┤
       │ - user_id                                  │
       │ - condition_id: "Anemia Ferropriva"        │
       │ - confidence_score: 85.0                   │
       │ - contributing_parameters: [               │
       │     {                                      │
       │       "parameter": "Hemoglobina",          │
       │       "value": 11.5,                       │
       │       "expected": "12.0-16.0",             │
       │       "deviation": -4.2%                   │
       │     }                                      │
       │   ]                                        │
       │ - recommended_specialists: ["Hematologia"] │
       │ - urgency_level: "attention"               │
       │ - status: "identified"                     │
       └────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 6. EVOLUÇÃO DE DIAGNÓSTICOS (PRÓXIMOS EXAMES)                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
      Quando novo exame é processado:
                              ↓
    Sistema compara parametros com diagnóstico anterior
                              ↓
       ┌────────────────────────────────────────────┐
       │ EXEMPLO: Acompanhamento Anemia             │
       ├────────────────────────────────────────────┤
       │ Exame Anterior (30 dias atrás):            │
       │ - Hemoglobina: 11.5                        │
       │                                            │
       │ Exame Atual:                               │
       │ - Hemoglobina: 12.8                        │
       │                                            │
       │ ➡️ Melhora de +11.3%                        │
       │ ➡️ Tendência: "improving"                   │
       └────────────────────────────────────────────┘
                              ↓
       ┌────────────────────────────────────────────┐
       │  diagnosis_evolution_history               │
       ├────────────────────────────────────────────┤
       │ - diagnosis_id                             │
       │ - parameters_snapshot: {...}               │
       │ - trend: "improving"                       │
       │ - trend_percentage: +11.3                  │
       │ - snapshot_date: "2024-11-28"              │
       └────────────────────────────────────────────┘
```

---

## 🗄️ Tabelas Principais

### 1. Biblioteca de Exames

| Tabela | Descrição | Exemplo |
|--------|-----------|---------|
| **exam_library** | Catálogo de exames | Hemograma Completo, Perfil Lipídico |
| **exam_library_parameters** | Parâmetros de cada exame | Hemoglobina (12-16 g/dL), Colesterol (<200 mg/dL) |

**Como funciona**:
- Pré-cadastrado com exames comuns brasileiros
- Cada exame tem código único (HEM001, LIP001)
- Parâmetros incluem valores de referência por idade/sexo

### 2. Processamento de Exames

| Tabela | Descrição | Quando preenche |
|--------|-----------|-----------------|
| **exam_images** | Arquivo enviado pelo usuário | No upload |
| **exam_results** | Parâmetros extraídos | Após OCR + IA |

**Relacionamentos**:
```sql
exam_images
├── exam_library_id      (qual tipo de exame)
├── laboratory_id        (onde foi feito)
├── requesting_doctor_id (quem solicitou)
└── reporting_doctor_id  (quem laudou)

exam_results
└── exam_image_id        (pertence a qual exame)
```

### 3. Diagnósticos

| Tabela | Descrição | Quando preenche |
|--------|-----------|-----------------|
| **clinical_conditions** | Condições clínicas | Pré-cadastrado |
| **diagnostic_rules** | Regras de detecção | Pré-cadastrado |
| **identified_diagnoses** | Diagnósticos encontrados | Após análise |
| **diagnosis_evolution_history** | Evolução | A cada nova análise |

---

## 🔍 Como Funciona o Match de Diagnósticos

### Exemplo: Anemia Ferropriva

**1. Regra cadastrada**:
```json
{
  "required_parameters": [
    {
      "parameter_code": "HEM_HB",
      "operator": "<",
      "value_male": 13.5,
      "value_female": 12.0,
      "weight": 3
    },
    {
      "parameter_code": "HEM_VCM",
      "operator": "<",
      "value": 80.0,
      "weight": 2
    },
    {
      "parameter_code": "HEM_HCM",
      "operator": "<",
      "value": 27.0,
      "weight": 2
    }
  ],
  "minimum_matches": 3,
  "minimum_weight": 5
}
```

**2. Parâmetros do paciente**:
```
Hemoglobina: 11.5 g/dL  (ref: 12.0-16.0) ← BAIXO ✓
VCM: 75 fL              (ref: 80-100)    ← BAIXO ✓
HCM: 24 pg              (ref: 27-33)     ← BAIXO ✓
```

**3. Cálculo de Match**:
```
Matches: 3/3 parâmetros ✓
Peso total: 3+2+2 = 7 (mínimo exigido: 5) ✓
Confiança: 85%
➡️ DIAGNÓSTICO IDENTIFICADO
```

**4. Resultado salvo**:
```sql
INSERT INTO identified_diagnoses (
  user_id,
  condition_id,         -- Anemia Ferropriva
  confidence_score,     -- 85.0
  urgency_level,        -- "attention"
  contributing_parameters, -- JSON com os 3 parâmetros
  recommended_specialists  -- ["Hematologia"]
)
```

---

## 📈 Métricas e Tendências

### Cálculo de Evolução

```sql
-- Buscar exame anterior
SELECT value FROM exam_results
WHERE parameter_name = 'Hemoglobina'
  AND exam_image_id IN (
    SELECT id FROM exam_images
    WHERE user_id = current_user
    ORDER BY exam_date DESC
    LIMIT 2
  )

-- Resultado:
-- Anterior: 11.5
-- Atual: 12.8

-- Cálculo:
trend_percentage = ((12.8 - 11.5) / 11.5) * 100 = +11.3%

-- Classificação:
IF trend_percentage > 5%    THEN 'improving'
IF -5% <= trend <= 5%       THEN 'stable'
IF trend_percentage < -5%   THEN 'worsening'
```

---

## 🏥 Entidades Auxiliares

### Médicos

```sql
doctors
├── full_name: "Dr. João Silva"
├── crm: "12345-SP"
├── specialties: ["Cardiologia", "Clínica Médica"]
└── doctor_type: "general"
```

**Quando usar**:
- OCR detecta "Dr. João Silva CRM 12345-SP"
- Sistema busca em `doctors` por CRM
- Se encontrar, vincula `requesting_doctor_id`
- Se não, deixa como TEXT em `requesting_doctor` (compatibilidade)

### Laboratórios

```sql
laboratories
├── name: "Laboratório ABC"
├── cnpj: "12.345.678/0001-90"
├── address_city: "São Paulo"
└── accreditations: ["PALC", "DICQ"]
```

**Quando usar**:
- OCR detecta "Laboratório ABC"
- Sistema busca em `laboratories` por nome
- Vincula `laboratory_id`

---

## 🔧 Funções Úteis

### 1. Buscar Valor de Referência

```sql
SELECT get_reference_range(
  'HEM_HB',     -- parâmetro
  35,           -- idade em anos
  'female'      -- sexo
);

-- Retorna:
{
  "min": 12.0,
  "max": 16.0,
  "critical_min": 8.0,
  "critical_max": 18.0
}
```

### 2. Verificar Diagnósticos

```sql
SELECT * FROM check_for_diagnoses(
  'user-uuid',
  'health_analysis-uuid'
);
```

---

## 📊 Views Úteis

### 1. Exames Completos

```sql
SELECT * FROM exam_images_complete
WHERE user_id = current_user
ORDER BY exam_date DESC;

-- Retorna tudo junto:
-- - Dados do exame
-- - Nome do laboratório
-- - Nome dos médicos
-- - Categoria do exame
```

### 2. Diagnósticos Ativos

```sql
SELECT * FROM active_diagnoses_by_patient
WHERE user_id = current_user;

-- Retorna:
-- - Condição identificada
-- - Confiança
-- - Urgência
-- - Evolução (improving/stable/worsening)
-- - Especialistas recomendados
```

---

## 🚀 Migração e Uso

### 1. Rodar Migrations

```bash
# Estrutura completa
psql -f supabase/migrations/20251128_complete_database_structure.sql

# Popular exames
psql -f supabase/migrations/20251128_seed_exam_library.sql

# Popular condições
psql -f supabase/migrations/20251128_seed_clinical_conditions.sql
```

### 2. Uso no Código

```typescript
// Após OCR extrair texto
const aiResult = await structureWithAI(ocrText);

// Buscar exame na biblioteca
const { data: examLib } = await supabase
  .from('exam_library')
  .select('id')
  .eq('exam_code', 'HEM001')
  .single();

// Salvar com relacionamento
await supabase
  .from('exam_images')
  .update({
    exam_library_id: examLib.id,
    ocr_text: ocrText,
    status: 'completed'
  })
  .eq('id', examImageId);

// Salvar parâmetros
await supabase
  .from('exam_results')
  .insert(
    aiResult.parameters.map(param => ({
      exam_image_id: examImageId,
      parameter_name: param.name,
      value: param.value,
      unit: param.unit,
      status: param.status
    }))
  );

// Verificar diagnósticos
const { data: diagnoses } = await supabase
  .rpc('check_for_diagnoses', {
    p_user_id: userId,
    p_health_analysis_id: analysisId
  });
```

---

## 📝 Notas Importantes

1. **Compatibilidade**: Campos TEXT antigos (`lab_name`, `requesting_doctor`, `reporting_doctor`) são mantidos para compatibilidade

2. **Prioridade**: Sistema tenta relacionar com entidades (laboratórios/médicos) mas funciona sem elas

3. **Extensibilidade**: Adicione novos exames facilmente em `exam_library`

4. **Diagnósticos**: Sistema sugere, mas médico deve confirmar

5. **Performance**: Índices em todas as buscas frequentes

---

## 🎯 Benefícios da Nova Estrutura

✅ **Padronização**: Exames e parâmetros padronizados
✅ **Rastreabilidade**: Histórico completo de evolução
✅ **Inteligência**: Detecção automática de diagnósticos
✅ **Completude**: Dados de médicos e laboratórios estruturados
✅ **Escalabilidade**: Fácil adicionar novos exames/condições
✅ **Auditoria**: Tudo rastreado e com timestamps

---

*Última atualização: Novembro 2025*
