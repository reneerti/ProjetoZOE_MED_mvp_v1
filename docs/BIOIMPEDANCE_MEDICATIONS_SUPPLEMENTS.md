## Estruturas de Bioimpedância, Medicações e Suplementação - ZOE MED MVP

Este documento descreve as novas estruturas implementadas para **Bioimpedância**, **Medicações** e **Suplementação**, seguindo a mesma arquitetura inteligente dos exames laboratoriais.

---

## 📊 1. BIOIMPEDÂNCIA

Sistema completo para análise de composição corporal com detecção automática de condições.

### Arquitetura

```
Upload Relatório BIA → OCR → IA Estrutura → Matching Biblioteca →
Cálculo Status → Detecção Condições → Salvar Banco → Cache
```

### Tabelas Principais

#### `bioimpedance_parameter_library`
Biblioteca de parâmetros com faixas de referência por idade, sexo e nível atlético.

**Parâmetros incluídos** (20 parâmetros):
- **Composição Corporal**: BF%, Massa Muscular, Massa Magra, SMI, Massa Óssea
- **Água Corporal**: TBW%, ICW, ECW, Razão ECW/TBW
- **Metabolismo**: BMR, TDEE
- **Muscular Segmentado**: Braços, Pernas, Tronco
- **Outros**: Gordura Visceral, Idade Metabólica, Ângulo de Fase, Proteína

**Exemplo de parâmetro**:
```sql
SELECT * FROM bioimpedance_parameter_library
WHERE parameter_code = 'BIA_BF';

-- Retorna:
{
  "parameter_code": "BIA_BF",
  "parameter_name": "Percentual de Gordura Corporal",
  "category": "composicao_corporal",
  "unit": "%",
  "reference_ranges": [
    {
      "age_min": 18,
      "age_max": 39,
      "sex": "male",
      "athletic_level": "sedentary",
      "min": 8,
      "max": 20,
      "optimal_min": 14,
      "optimal_max": 17,
      "critical_max": 25
    },
    {
      "age_min": 18,
      "age_max": 39,
      "sex": "female",
      "athletic_level": "sedentary",
      "min": 21,
      "max": 33,
      "optimal_min": 21,
      "optimal_max": 24,
      "critical_max": 39
    }
  ]
}
```

#### `bioimpedance_records`
Registros de medições do usuário.

```sql
CREATE TABLE bioimpedance_records (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  measurement_date DATE NOT NULL,
  device_brand TEXT,          -- InBody, Tanita, Omron
  device_model TEXT,
  file_url TEXT,
  processing_status TEXT DEFAULT 'pending'
);
```

#### `bioimpedance_results`
Resultados individuais de cada parâmetro.

```sql
CREATE TABLE bioimpedance_results (
  id UUID PRIMARY KEY,
  record_id UUID,
  parameter_code TEXT,        -- BIA_BF, BIA_MM, etc.
  parameter_name TEXT,
  value NUMERIC,
  unit TEXT,
  status TEXT,                -- muito_baixo, baixo, normal, ideal, alto, muito_alto, critico
  percentile NUMERIC(5,2),    -- 0-100
  z_score NUMERIC(5,2)        -- Desvios padrão
);
```

### Condições Detectáveis

**9 condições implementadas**:
1. **BIA_OB** - Obesidade por Composição Corporal
2. **BIA_SARC** - Sarcopenia
3. **BIA_SARC_OB** - Obesidade Sarcopênica
4. **BIA_DEHYD** - Desidratação
5. **BIA_EDEMA** - Retenção de Líquidos
6. **BIA_LOW_MM** - Baixa Massa Muscular
7. **BIA_HIGH_VF** - Gordura Visceral Elevada
8. **BIA_LOW_BMR** - Metabolismo Basal Reduzido
9. **BIA_LOW_PA** - Baixa Integridade Celular

**Exemplo de regra diagnóstica**:
```json
{
  "condition": "Obesidade Sarcopênica",
  "criteria": {
    "required_parameters": [
      {
        "parameter_code": "BIA_BF",
        "operator": ">",
        "value_male": 25.0,
        "value_female": 33.0,
        "weight": 3
      },
      {
        "parameter_code": "BIA_SMI",
        "operator": "<",
        "value_male": 8.5,
        "value_female": 6.75,
        "weight": 3
      }
    ],
    "minimum_matches": 2,
    "minimum_weight": 6
  },
  "health_risks": [
    "Risco cardiometabólico elevado",
    "Síndrome metabólica",
    "Fragilidade aumentada"
  ],
  "recommendations": [
    "Programa combinado: musculação + aeróbico",
    "Dieta hipocalórica rica em proteínas",
    "Acompanhamento multidisciplinar"
  ]
}
```

### Queries Úteis

```sql
-- Ver última bioimpedância com condições detectadas
SELECT
  br.measurement_date,
  br.device_brand,
  jsonb_agg(DISTINCT jsonb_build_object(
    'parameter', bres.parameter_name,
    'value', bres.value,
    'unit', bres.unit,
    'status', bres.status
  )) AS parameters,
  jsonb_agg(DISTINCT jsonb_build_object(
    'condition', bc.condition_name,
    'confidence', ibc.confidence_score,
    'severity', ibc.severity_level
  )) FILTER (WHERE bc.id IS NOT NULL) AS conditions
FROM bioimpedance_records br
LEFT JOIN bioimpedance_results bres ON br.id = bres.record_id
LEFT JOIN identified_bioimpedance_conditions ibc ON br.id = ibc.record_id
LEFT JOIN bioimpedance_conditions bc ON ibc.condition_id = bc.id
WHERE br.user_id = 'user-uuid'
GROUP BY br.id
ORDER BY br.measurement_date DESC
LIMIT 1;
```

---

## 💊 2. MEDICAÇÕES

Sistema completo para rastreamento de medicamentos, prescrições e adesão ao tratamento.

### Tabelas Principais

#### `medication_library`
Biblioteca de medicamentos com informações completas.

**Medicamentos incluídos**:
- **Antidiabéticos GLP-1**: Monjaro (Tirzepatida), Ozempic (Semaglutida)
- **Biguanidas**: Metformina (Glifage)
- **Estatinas**: Atorvastatina (Lipitor)
- **Anti-hipertensivos**: Losartana (Cozaar)
- **Hormônios**: Levotiroxina (Puran T4)

**Exemplo - Monjaro**:
```json
{
  "medication_code": "MED_MONJ",
  "commercial_name": "Monjaro",
  "generic_name": "Tirzepatida",
  "category": "antidiabeticos",
  "subcategory": "agonistas_glp1_gip",
  "therapeutic_class": "Agonista duplo GLP-1 e GIP",
  "presentation": [
    {"dosage": "2.5mg", "form": "caneta injetável", "package": "4 canetas"},
    {"dosage": "5mg", "form": "caneta injetável", "package": "4 canetas"},
    {"dosage": "7.5mg", "form": "caneta injetável", "package": "4 canetas"},
    {"dosage": "10mg", "form": "caneta injetável", "package": "4 canetas"},
    {"dosage": "12.5mg", "form": "caneta injetável", "package": "4 canetas"},
    {"dosage": "15mg", "form": "caneta injetável", "package": "4 canetas"}
  ],
  "common_side_effects": [
    "Náusea", "Vômitos", "Diarreia", "Diminuição do apetite"
  ],
  "drug_interactions": [
    "Insulina (risco de hipoglicemia)",
    "Sulfonilureias (risco de hipoglicemia)"
  ]
}
```

#### `medication_dosage_guidelines`
Diretrizes de posologia com esquemas de titulação.

**Exemplo - Titulação do Monjaro**:
```json
{
  "medication": "Monjaro",
  "indication": "Diabetes Tipo 2",
  "titration_schedule": [
    {"week": 1, "dosage": 2.5, "instructions": "Dose inicial"},
    {"week": 5, "dosage": 5, "instructions": "Aumento após 4 semanas"},
    {"week": 9, "dosage": 7.5, "instructions": "Aumento opcional"},
    {"week": 13, "dosage": 10, "instructions": "Aumento opcional"},
    {"week": 17, "dosage": 12.5, "instructions": "Aumento opcional"},
    {"week": 21, "dosage": 15, "instructions": "Dose máxima"}
  ]
}
```

#### `user_prescriptions`
Prescrições médicas do usuário.

```sql
CREATE TABLE user_prescriptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  medication_id UUID,
  medication_name TEXT NOT NULL,
  prescribing_doctor_id UUID,
  start_date DATE NOT NULL,
  dosage NUMERIC NOT NULL,
  dosage_unit TEXT NOT NULL,
  frequency TEXT NOT NULL,      -- 1x/dia, 2x/dia, 1x/semana
  is_active BOOLEAN DEFAULT true
);
```

#### `medication_administration_log`
Log de administração para rastreamento de adesão.

```sql
CREATE TABLE medication_administration_log (
  id UUID PRIMARY KEY,
  prescription_id UUID NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  administered_time TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',  -- pending, taken, skipped, late
  side_effects_reported TEXT
);
```

#### `medication_adherence_analysis`
Análise de adesão ao tratamento.

```sql
CREATE TABLE medication_adherence_analysis (
  id UUID PRIMARY KEY,
  prescription_id UUID NOT NULL,
  total_scheduled_doses INTEGER,
  doses_taken INTEGER,
  doses_skipped INTEGER,
  adherence_rate NUMERIC(5,2),   -- 0-100%
  adherence_level TEXT           -- excelente (>90%), bom (80-90%), regular (70-80%), ruim (<70%)
);
```

### Interações Medicamentosas

**Exemplo**: Metformina + Contraste Iodado
```sql
INSERT INTO drug_interaction_alerts (
  medication_a_id, medication_b_id,
  interaction_type, severity, description, recommendations
) VALUES (
  'metformina_id',
  'contraste_iodado_id',
  'farmacocinetica',
  'grave',
  'Risco de acidose láctica',
  'CRÍTICO: Suspender metformina 48h antes de exames com contraste iodado'
);
```

### Funções Úteis

```sql
-- Detectar interações entre medicamentos ativos
SELECT * FROM check_drug_interactions('user-uuid');

-- Calcular taxa de adesão
SELECT calculate_adherence_rate('prescription-uuid', 30); -- últimos 30 dias
```

---

## 🌿 3. SUPLEMENTAÇÃO

Sistema completo para rastreamento de suplementos e nutrientes.

### Tabelas Principais

#### `supplement_library`
Biblioteca de suplementos com informações completas.

**Suplementos incluídos** (15 suplementos):

**Vitaminas**:
- Vitamina D3 (Colecalciferol)
- Vitamina B12 (Metilcobalamina)
- Vitamina C (Ácido Ascórbico)

**Minerais**:
- Magnésio (Quelato/Glicinato)
- Zinco (Quelato)
- Ferro (Bisglicinato)

**Ácidos Graxos**:
- Ômega 3 (EPA + DHA)

**Probióticos**:
- Probióticos Multi-cepas

**Aminoácidos**:
- Creatina Monohidratada
- Whey Protein

**Fitoterápicos**:
- Cúrcuma (Curcumina)

**Exemplo - Vitamina D3**:
```json
{
  "supplement_code": "SUP_VIT_D3",
  "name": "Vitamina D3 (Colecalciferol)",
  "category": "vitaminas",
  "subcategory": "vitaminas_liposoluveis",
  "recommended_dosage_min": 1000,
  "recommended_dosage_max": 4000,
  "dosage_unit": "UI",
  "upper_limit_safe": 10000,
  "benefits": [
    "Saúde óssea e prevenção de osteoporose",
    "Função imunológica",
    "Saúde muscular",
    "Regulação do cálcio",
    "Melhora do humor"
  ],
  "deficiency_symptoms": [
    "Fadiga e fraqueza muscular",
    "Dores ósseas e articulares",
    "Depressão",
    "Infecções frequentes"
  ],
  "absorption_enhancers": [
    "Gorduras saudáveis",
    "Tomado com refeições"
  ],
  "best_time_to_take": "manhã",
  "take_with_food": true
}
```

#### `user_supplements`
Suplementos em uso pelo usuário.

```sql
CREATE TABLE user_supplements (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  supplement_id UUID,
  supplement_name TEXT NOT NULL,
  brand TEXT,
  dosage NUMERIC NOT NULL,
  frequency TEXT NOT NULL,       -- diario, dias_alternados, 2x_semana
  time_of_day TEXT[],            -- [manha, tarde, noite, jejum]
  with_food BOOLEAN,
  start_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true
);
```

#### `nutrient_levels`
Níveis de nutrientes baseados em exames.

```sql
CREATE TABLE nutrient_levels (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  exam_image_id UUID,            -- Vinculado a exam_images
  nutrient_name TEXT NOT NULL,   -- Vitamina D, B12, Ferro, etc.
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  reference_min NUMERIC,
  reference_max NUMERIC,
  status TEXT,                   -- deficiente, insuficiente, adequado, excessivo
  test_date DATE NOT NULL
);
```

#### `supplement_recommendations`
Recomendações automáticas baseadas em deficiências.

```sql
CREATE TABLE supplement_recommendations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  supplement_id UUID,
  reason TEXT NOT NULL,
  based_on TEXT[],              -- [deficiencia_detectada, sintomas, bioimpedancia]
  recommended_dosage NUMERIC,
  priority TEXT DEFAULT 'media', -- baixa, media, alta, critica
  status TEXT DEFAULT 'pending'  -- pending, accepted, rejected
);
```

### Interações Suplemento-Medicamento

**Exemplos implementados**:

```sql
-- Vitamina D + Atorvastatina (benéfico)
{
  "interaction_type": "potencializacao",
  "severity": "leve",
  "description": "Vitamina D pode reduzir mialgias causadas por estatinas",
  "recommendations": "Combinação benéfica. Monitorar níveis de vitamina D."
}

-- Ferro + Levotiroxina (CRÍTICO)
{
  "interaction_type": "reducao_absorcao",
  "severity": "moderada",
  "description": "Ferro reduz significativamente a absorção de levotiroxina",
  "recommendations": "CRÍTICO: Espaçar em no mínimo 4 horas"
}

-- Magnésio + Metformina (benéfico)
{
  "interaction_type": "potencializacao",
  "severity": "leve",
  "description": "Metformina reduz magnésio; suplementação é benéfica",
  "recommendations": "Suplementação recomendada em usuários de longo prazo"
}
```

### Funções Úteis

```sql
-- Detectar interações suplemento-medicamento
SELECT * FROM check_supplement_drug_interactions('user-uuid');

-- Gerar recomendações baseadas em deficiências detectadas
SELECT generate_supplement_recommendations('user-uuid');
```

---

## 🔄 INTEGRAÇÃO ENTRE MÓDULOS

### Fluxo Completo Integrado

```
1. EXAMES LABORATORIAIS
   ↓
   Detecta deficiências (ex: Vitamina D baixa, Anemia)
   ↓
2. SUPLEMENTAÇÃO
   ↓
   Gera recomendações automáticas
   ↓
3. BIOIMPEDÂNCIA
   ↓
   Monitora evolução da composição corporal
   ↓
4. MEDICAÇÕES
   ↓
   Verifica interações medicamento-suplemento
   Ajusta posologia baseado em resultados
```

### Exemplo Prático Integrado

**Caso: Paciente com Diabetes Tipo 2**

1. **Exame Laboratorial** detecta:
   - Glicemia elevada (120 mg/dL)
   - HbA1c 7.2%
   - Vitamina D deficiente (18 ng/mL)
   - Magnésio baixo

2. **Sistema prescreve medicação**:
   - Metformina 850mg 2x/dia
   - (Médico pode adicionar Monjaro posteriormente)

3. **Sistema recomenda suplementos**:
   - Vitamina D3 4000 UI/dia
   - Magnésio 200mg/dia (importante com metformina)

4. **Bioimpedância revela**:
   - Gordura visceral elevada (nível 12)
   - Massa muscular baixa
   - Sistema detecta: "Obesidade Sarcopênica"

5. **Recomendações integradas**:
   - Musculação 3x/semana
   - Proteína: 1.5g/kg/dia
   - Considerar Whey Protein + Creatina
   - Monitorar glicemia antes/após exercícios

6. **Acompanhamento**:
   - Taxa de adesão à metformina: 92% ✅
   - Evolução bioimpedância: +2kg massa muscular em 3 meses
   - Próximo exame: verificar HbA1c e vitamina D

---

## 📊 DASHBOARDS E VIEWS

### Views Úteis Criadas

```sql
-- Bioimpedância completa
CREATE VIEW bioimpedance_complete_records AS ...

-- Prescrições ativas
CREATE VIEW active_prescriptions AS ...

-- Suplementos ativos
CREATE VIEW active_supplements AS ...
```

### Queries para Dashboard

**Visão Geral do Paciente**:
```sql
WITH patient_summary AS (
  SELECT
    'exames' AS source,
    COUNT(*) AS count,
    MAX(exam_date) AS last_date
  FROM exam_images WHERE user_id = 'user-uuid'
  UNION ALL
  SELECT
    'bioimpedancia',
    COUNT(*),
    MAX(measurement_date)
  FROM bioimpedance_records WHERE user_id = 'user-uuid'
  UNION ALL
  SELECT
    'medicacoes',
    COUNT(*),
    MAX(start_date)
  FROM user_prescriptions WHERE user_id = 'user-uuid' AND is_active = true
  UNION ALL
  SELECT
    'suplementos',
    COUNT(*),
    MAX(start_date)
  FROM user_supplements WHERE user_id = 'user-uuid' AND is_active = true
)
SELECT * FROM patient_summary;
```

**Alertas Críticos**:
```sql
SELECT 'Interação Medicamentosa' AS alert_type, severity, description
FROM check_drug_interactions('user-uuid')
WHERE severity IN ('grave', 'contraindicada')

UNION ALL

SELECT 'Interação Suplemento-Medicamento', severity, description
FROM check_supplement_drug_interactions('user-uuid')
WHERE severity IN ('grave', 'moderada')

UNION ALL

SELECT 'Condição Bioimpedância', urgency_level, condition_name
FROM identified_bioimpedance_conditions ibc
JOIN bioimpedance_conditions bc ON ibc.condition_id = bc.id
WHERE ibc.user_id = 'user-uuid'
  AND urgency_level = 'critica';
```

---

## 🚀 DEPLOYMENT

### Migrations

Executar na ordem:

```bash
# 1. Bioimpedância
psql -f supabase/migrations/20251129_bioimpedance_structure.sql
psql -f supabase/migrations/20251129_seed_bioimpedance_library.sql
psql -f supabase/migrations/20251129_seed_bioimpedance_conditions.sql

# 2. Medicações
psql -f supabase/migrations/20251129_medications_structure.sql
psql -f supabase/migrations/20251129_seed_medications.sql

# 3. Suplementação
psql -f supabase/migrations/20251129_supplements_structure.sql
psql -f supabase/migrations/20251129_seed_supplements.sql
```

### Edge Functions

```bash
# Deploy função de bioimpedância
supabase functions deploy process-bioimpedance
```

---

## 📚 PRÓXIMOS PASSOS

- [ ] Interface de registro de bioimpedância
- [ ] Interface de gerenciamento de medicações
- [ ] Interface de rastreamento de suplementos
- [ ] Alertas push para horários de medicação
- [ ] Gráficos de evolução de bioimpedância
- [ ] Relatórios médicos em PDF
- [ ] Integração com wearables (glucômetros, balanças inteligentes)

---

**Última atualização**: Novembro 2025
