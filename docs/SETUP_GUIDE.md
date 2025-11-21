# Guia de Configuracao - ZOE MED MVP

Este guia detalha como configurar todas as APIs e servicos necessarios para rodar o projeto.

---

## Indice

1. [Visao Geral da Arquitetura](#visao-geral-da-arquitetura)
2. [APIs de OCR (Gratuitas)](#apis-de-ocr-gratuitas)
3. [APIs de Conversao PDF (Gratuitas)](#apis-de-conversao-pdf-gratuitas)
4. [APIs de IA (Gratuitas)](#apis-de-ia-gratuitas)
5. [Configuracao do Supabase](#configuracao-do-supabase)
6. [Variaveis de Ambiente](#variaveis-de-ambiente)
7. [Migracao da Arquitetura Antiga](#migracao-da-arquitetura-antiga)

---

## Visao Geral da Arquitetura

### Arquitetura Nova (Recomendada)

```
[Upload]
    |
    v
[Detectar Tipo] --> PDF? --> [Conversao PDF->Imagem]
    |                              |
    v                              v
[OCR Dedicado] <------------------+
    |
    v
[Texto Extraido]
    |
    v
[IA Estruturar Dados] --> [Cache]
    |
    v
[Banco de Dados]
```

### Beneficios:
- **OCR separado da IA**: Menor custo e maior precisao
- **Suporte a PDF**: Conversao automatica para imagem
- **Cache inteligente**: Evita reprocessamento
- **Multiplos provedores**: Fallback automatico
- **Processamento incremental**: So processa dados novos

---

## APIs de OCR (Gratuitas)

### 1. OCR.space (Recomendado para MVP)

**Limite Gratuito**: 25.000 requisicoes/mes

**Como obter a API Key**:

1. Acesse: https://ocr.space/ocrapi
2. Clique em "Get your free API key"
3. Preencha o formulario com seu email
4. Confirme o email recebido
5. Sua API Key sera exibida na pagina

**Configuracao**:
```bash
OCR_SPACE_API_KEY=K123456789abcdef
```

**Caracteristicas**:
- Suporta Portugues (Engine 2)
- Processa tabelas de exames
- Detecta orientacao automatica
- Limite de 1MB por imagem (gratuito)

---

### 2. Google Cloud Vision (Para Producao)

**Limite Gratuito**: 1.000 unidades/mes

**Como obter a API Key**:

1. Acesse: https://console.cloud.google.com/
2. Crie um novo projeto ou selecione existente
3. Ative a API "Cloud Vision API":
   - Menu > APIs e Servicos > Biblioteca
   - Busque "Cloud Vision API"
   - Clique em "Ativar"
4. Crie credenciais:
   - Menu > APIs e Servicos > Credenciais
   - "Criar credenciais" > "Chave de API"
5. (Opcional) Restrinja a chave para apenas Cloud Vision API

**Configuracao**:
```bash
GOOGLE_VISION_API_KEY=AIzaSyABC123...
```

---

### 3. Azure Computer Vision (Alternativa Enterprise)

**Limite Gratuito**: 5.000 transacoes/mes

**Como obter**:

1. Acesse: https://portal.azure.com/
2. Crie uma conta gratuita se necessario
3. Crie um recurso:
   - "Criar recurso" > "IA + Machine Learning"
   - Selecione "Computer Vision"
4. Apos criar, va em "Chaves e Endpoint"
5. Copie o Endpoint e uma das chaves

**Configuracao**:
```bash
AZURE_VISION_ENDPOINT=https://seu-recurso.cognitiveservices.azure.com/
AZURE_VISION_API_KEY=abc123def456...
```

---

## APIs de Conversao PDF (Gratuitas)

### 1. PDF.co (Recomendado)

**Limite Gratuito**: 500 creditos/mes (1 credito = 1 pagina)

**Como obter**:

1. Acesse: https://pdf.co/
2. Clique em "Get Started Free"
3. Crie uma conta
4. Va em "Dashboard" > "API Keys"
5. Copie sua API Key

**Configuracao**:
```bash
PDF_CO_API_KEY=seu-api-key-aqui
```

---

### 2. ConvertAPI (Alternativa)

**Limite Gratuito**: 250 conversoes/mes

**Como obter**:

1. Acesse: https://www.convertapi.com/
2. Clique em "Sign Up Free"
3. Confirme o email
4. Va em "Authentication" no dashboard
5. Copie o "Secret"

**Configuracao**:
```bash
CONVERT_API_KEY=seu-secret-aqui
```

---

### 3. CloudConvert (Alta Qualidade)

**Limite Gratuito**: 25 minutos de conversao/dia

**Como obter**:

1. Acesse: https://cloudconvert.com/
2. Crie uma conta gratuita
3. Va em "Dashboard" > "API" > "API Keys"
4. Crie uma nova API Key

**Configuracao**:
```bash
CLOUDCONVERT_API_KEY=seu-api-key-aqui
```

---

## APIs de IA (Gratuitas)

### 1. Groq (Recomendado - Mais Rapido)

**Limite Gratuito**: 30 req/min, 14.4k tokens/min

**Como obter**:

1. Acesse: https://console.groq.com/
2. Crie uma conta (login com Google/GitHub)
3. Va em "API Keys"
4. Clique em "Create API Key"
5. De um nome e copie a chave

**Configuracao**:
```bash
GROQ_API_KEY=gsk_abc123...
```

**Modelos disponiveis**:
- `llama-3.3-70b-versatile` (recomendado)
- `mixtral-8x7b-32768`
- `llama-3.1-8b-instant`

---

### 2. Google AI Studio (Gemini)

**Limite Gratuito**: 60 req/min, 1M tokens/dia

**Como obter**:

1. Acesse: https://aistudio.google.com/
2. Faca login com conta Google
3. Clique em "Get API Key"
4. Selecione um projeto ou crie novo
5. Copie a API Key gerada

**Configuracao**:
```bash
GOOGLE_AI_API_KEY=AIzaSyABC123...
```

**Modelos disponiveis**:
- `gemini-2.0-flash-exp` (recomendado)
- `gemini-1.5-flash`
- `gemini-1.5-pro`

---

### 3. Together AI

**Limite Gratuito**: $1 em creditos gratuitos

**Como obter**:

1. Acesse: https://www.together.ai/
2. Clique em "Start Building"
3. Crie uma conta
4. Va em "Settings" > "API Keys"
5. Crie uma nova chave

**Configuracao**:
```bash
TOGETHER_API_KEY=sua-chave-aqui
```

---

### 4. OpenRouter (Acesso a Varios Modelos)

**Limite Gratuito**: Modelos gratuitos disponiveis

**Como obter**:

1. Acesse: https://openrouter.ai/
2. Crie uma conta
3. Va em "Keys" no menu
4. Clique em "Create Key"
5. Copie a chave gerada

**Configuracao**:
```bash
OPENROUTER_API_KEY=sk-or-v1-abc123...
```

**Modelos gratuitos**:
- `google/gemini-2.0-flash-exp:free`
- `meta-llama/llama-3.2-3b-instruct:free`

---

### 5. Hugging Face Inference

**Limite Gratuito**: Rate limit baixo, mas gratuito

**Como obter**:

1. Acesse: https://huggingface.co/
2. Crie uma conta
3. Va em "Settings" > "Access Tokens"
4. Crie um novo token com permissao "read"
5. Copie o token

**Configuracao**:
```bash
HUGGINGFACE_API_KEY=hf_abc123...
```

---

## Configuracao do Supabase

### Variaveis ja existentes:

Estas variaveis ja estao configuradas no seu Supabase:

```bash
SUPABASE_URL=https://irlfnzxmeympvsslbnwn.supabase.co
SUPABASE_ANON_KEY=eyJhbG... (sua chave anonima)
SUPABASE_SERVICE_ROLE_KEY=eyJhbG... (sua chave de servico)
```

### Configurar Secrets no Supabase

Para adicionar as novas API keys:

1. Acesse o dashboard do Supabase
2. Va em "Project Settings" > "Edge Functions"
3. Role ate "Secrets"
4. Adicione cada variavel:

```bash
# OCR
OCR_SPACE_API_KEY=sua-chave

# PDF
PDF_CO_API_KEY=sua-chave

# IA
GROQ_API_KEY=sua-chave
GOOGLE_AI_API_KEY=sua-chave
```

### Via CLI Supabase:

```bash
# Instalar CLI
npm install -g supabase

# Login
supabase login

# Definir secrets
supabase secrets set OCR_SPACE_API_KEY=sua-chave
supabase secrets set PDF_CO_API_KEY=sua-chave
supabase secrets set GROQ_API_KEY=sua-chave
supabase secrets set GOOGLE_AI_API_KEY=sua-chave
```

---

## Variaveis de Ambiente

### Arquivo `.env.example` completo:

```bash
# ═══════════════════════════════════════════════════════════════
# SUPABASE (Obrigatorio)
# ═══════════════════════════════════════════════════════════════
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbG...
VITE_SUPABASE_PROJECT_ID=seu-projeto-id

# ═══════════════════════════════════════════════════════════════
# OCR - Escolha pelo menos um
# ═══════════════════════════════════════════════════════════════
# OCR.space (Gratuito - 25k req/mes)
OCR_SPACE_API_KEY=

# Google Cloud Vision (Gratuito - 1k unidades/mes)
GOOGLE_VISION_API_KEY=

# Azure Computer Vision (Gratuito - 5k trans/mes)
AZURE_VISION_ENDPOINT=
AZURE_VISION_API_KEY=

# ═══════════════════════════════════════════════════════════════
# CONVERSAO PDF - Escolha pelo menos um para PDFs
# ═══════════════════════════════════════════════════════════════
# PDF.co (Gratuito - 500 creditos/mes)
PDF_CO_API_KEY=

# ConvertAPI (Gratuito - 250 conv/mes)
CONVERT_API_KEY=

# CloudConvert (Gratuito - 25 min/dia)
CLOUDCONVERT_API_KEY=

# ═══════════════════════════════════════════════════════════════
# IA - Escolha pelo menos um (recomendado: Groq + Google AI)
# ═══════════════════════════════════════════════════════════════
# Groq (Gratuito - 30 req/min)
GROQ_API_KEY=

# Google AI / Gemini (Gratuito - 60 req/min)
GOOGLE_AI_API_KEY=

# Together AI (Gratuito - $1 creditos)
TOGETHER_API_KEY=

# OpenRouter (Freemium)
OPENROUTER_API_KEY=

# Hugging Face (Gratuito)
HUGGINGFACE_API_KEY=

# Lovable AI (Pago - ja configurado se usando Lovable)
LOVABLE_API_KEY=

# ═══════════════════════════════════════════════════════════════
# INTEGRACOES (Opcional)
# ═══════════════════════════════════════════════════════════════
# Google Fit
GOOGLE_FIT_CLIENT_ID=
GOOGLE_FIT_CLIENT_SECRET=
```

---

## Migracao da Arquitetura Antiga

### O que mudou:

| Antes | Depois |
|-------|--------|
| OCR via Lovable AI (pago) | OCR.space gratuito |
| Sem suporte a PDF | PDF convertido para imagem |
| Uma IA (Lovable) | Multiplas IAs com fallback |
| Cache basico | Cache inteligente + incremental |
| CORS aberto (*) | CORS com whitelist |

### Endpoints:

| Antigo | Novo |
|--------|------|
| `/process-ocr` | `/process-exam-document` |
| (mesmo) | Suporta PDF |
| (mesmo) | Usa OCR dedicado |

### Atualizacao no Frontend:

O endpoint antigo continua funcionando. Para usar o novo:

```typescript
// Antes
const response = await supabase.functions.invoke('process-ocr', {
  body: { imageUrl, examImageId }
});

// Depois (recomendado)
const response = await supabase.functions.invoke('process-exam-document', {
  body: { fileUrl, examImageId, forceReprocess: false }
});
```

---

## Checklist de Configuracao

- [ ] Criar conta no OCR.space e obter API key
- [ ] Criar conta no PDF.co e obter API key
- [ ] Criar conta no Groq e obter API key
- [ ] Criar conta no Google AI Studio e obter API key
- [ ] Configurar secrets no Supabase
- [ ] Fazer deploy das novas Edge Functions
- [ ] Testar upload de imagem
- [ ] Testar upload de PDF
- [ ] Verificar cache funcionando

---

## Suporte

Em caso de duvidas:
- Verifique os logs no Supabase Dashboard > Edge Functions > Logs
- Confirme que as API keys estao corretas
- Teste cada API individualmente primeiro

---

*Ultima atualizacao: Novembro 2025*
