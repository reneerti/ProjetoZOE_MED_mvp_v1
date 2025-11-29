# Deploy Rápido - Vercel + Supabase (5 minutos)

## ⚡ Quick Start - Do Zero ao Ar

### Pré-requisitos
- ✅ Conta GitHub (grátis)
- ✅ Node.js instalado (v18+)
- ✅ Git configurado

---

## 📋 Checklist Rápido

```
[ ] Criar conta Supabase
[ ] Criar projeto Supabase
[ ] Copiar credenciais
[ ] Configurar APIs (OCR, IA, PDF)
[ ] Executar migrations
[ ] Deploy functions
[ ] Criar conta Vercel
[ ] Deploy frontend
[ ] Testar aplicação
```

---

## 🚀 Passo a Passo (5 minutos)

### 1️⃣ Criar Projeto Supabase (2 min)

**1.1 Acessar**: https://supabase.com/dashboard

**1.2 Sign up** (use GitHub para login rápido)

**1.3 New Project**:
- Organization: (criar nova ou usar existente)
- Name: `zoe-med-mvp`
- Database Password: `Gerar senha forte` (salvar!)
- Region: **South America (São Paulo)**
- Pricing Plan: **Free**

**1.4 Aguardar** criação (~2 min)

**1.5 Copiar credenciais** (Settings → API):
```
Project URL: https://xxxxxxxxxxxxx.supabase.co
anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (secret!)
```

---

### 2️⃣ Configurar APIs (10 min - SIMULTÂNEO)

Abra várias abas e faça em paralelo:

**OCR.space** (Tab 1):
1. https://ocr.space/ocrapi
2. Register for Free API Key
3. Confirmar email
4. Copiar key: `K88888888888888`

**Groq** (Tab 2 - PRIORITÁRIO):
1. https://console.groq.com/
2. Sign up
3. API Keys → Create API Key
4. Copiar: `gsk_...`

**Google AI** (Tab 3):
1. https://makersuite.google.com/app/apikey
2. Create API Key
3. Copiar: `AIzaSy...`

**PDF.co** (Tab 4):
1. https://pdf.co/
2. Sign up (free)
3. Dashboard → API Key
4. Copiar: `user@email.com_...`

---

### 3️⃣ Configurar Projeto Local (1 min)

```bash
cd ~/ProjetoZOE_MED_mvp_v1

# Criar .env para backend
cat > .env << 'EOF'
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (secret)

# OCR
OCR_SPACE_API_KEY=K88888888888888

# PDF
PDF_CO_API_KEY=user@email.com_...

# IA
GROQ_API_KEY=gsk_...
GOOGLE_AI_API_KEY=AIzaSy...
EOF

# Criar .env.local para frontend
cat > .env.local << 'EOF'
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
EOF
```

---

### 4️⃣ Deploy Backend Supabase (3 min)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link projeto
supabase link --project-ref xxxxxxxxxxxxx
# Pegar ref em: Settings → General → Reference ID

# Push database (migrations)
supabase db push

# Deploy edge functions
supabase functions deploy process-exam-document
supabase functions deploy process-bioimpedance
supabase functions deploy manage-api-configs

# Configurar secrets nas functions
supabase secrets set --env-file .env

# Verificar
supabase functions list
```

**✅ Backend pronto!**

---

### 5️⃣ Deploy Frontend Vercel (2 min)

```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login
# Abre navegador, autorizar

# Deploy (na raiz do projeto)
vercel --prod
```

**Responder prompts**:
```
? Set up and deploy "~/ProjetoZOE_MED_mvp_v1"? [Y/n] Y
? Which scope? (Use arrow keys)
  > Your Account
? Link to existing project? [y/N] N
? What's your project's name? zoe-med-mvp
? In which directory is your code located? ./
? Want to modify these settings? [y/N] N
```

Aguardar build (~1 min)...

**✅ Pronto!**

URL gerada: `https://zoe-med-mvp.vercel.app`

---

### 6️⃣ Configurar Variáveis no Vercel (1 min)

```bash
# Adicionar variáveis de ambiente
vercel env add VITE_SUPABASE_URL production
# Colar: https://xxxxxxxxxxxxx.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY production
# Colar: eyJhbGc...

# Redeploy para aplicar variáveis
vercel --prod
```

---

### 7️⃣ Testar Aplicação (2 min)

**Acessar**: `https://zoe-med-mvp.vercel.app`

**Testar**:
1. ✅ Página carrega
2. ✅ Criar conta
3. ✅ Receber email de confirmação
4. ✅ Login
5. ✅ Upload de exame (se tiver imagem de teste)

---

## ✅ Checklist Pós-Deploy

```
[ ] Frontend acessível (https://....vercel.app)
[ ] Backend rodando (Supabase Dashboard → Functions)
[ ] Database criado (Supabase → Database)
[ ] Migrations executadas (ver tabelas no SQL Editor)
[ ] Functions deployed (3/3)
[ ] Secrets configurados (APIs)
[ ] Cadastro funciona
[ ] Login funciona
```

---

## 🔧 Configurações Adicionais (Opcional)

### Domínio Customizado

**Comprar domínio** (~R$ 80/ano):
- https://registro.br (recomendado)
- GoDaddy, Namecheap, etc.

**Configurar no Vercel**:
1. Dashboard → Settings → Domains
2. Add Domain: `zoe-med.app`
3. Adicionar DNS records no registrador:
   ```
   Type: CNAME
   Name: @
   Value: cname.vercel-dns.com
   ```
4. Aguardar propagação (5min-24h)
5. SSL automático ✅

---

## 🎯 Próximos Passos

### Melhorar Performance

```bash
# Adicionar no vercel.json
cat > vercel.json << 'EOF'
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://xxxxxxxxxxxxx.supabase.co/:path*"
    }
  ]
}
EOF

vercel --prod
```

### Analytics (Grátis)

1. Vercel Dashboard → Analytics → Enable
2. Ver métricas:
   - Page views
   - Unique visitors
   - Performance (Core Web Vitals)

### Git Auto-Deploy

```bash
# Conectar repositório GitHub
vercel link

# Agora todo git push no main = auto-deploy! 🚀
git add .
git commit -m "Update"
git push origin main
# Vercel detecta e faz deploy automático
```

---

## 📊 Monitoramento

### Logs do Frontend (Vercel)
https://vercel.com/seu-user/zoe-med-mvp/deployments

### Logs do Backend (Supabase)
https://supabase.com/dashboard/project/xxxxx/logs

### Database (Supabase)
https://supabase.com/dashboard/project/xxxxx/editor

---

## ⚠️ Troubleshooting

### Frontend não carrega

```bash
# Verificar build local
npm run build
npm run preview

# Ver logs Vercel
vercel logs
```

### Backend não responde

```bash
# Testar functions
curl https://xxxxxxxxxxxxx.supabase.co/functions/v1/process-exam-document \
  -H "Authorization: Bearer eyJhbGc..."

# Ver logs
supabase functions logs process-exam-document
```

### Database vazio

```bash
# Re-executar migrations
supabase db reset
supabase db push
```

### APIs não funcionam

```bash
# Verificar secrets
supabase secrets list

# Re-configurar
supabase secrets set OCR_SPACE_API_KEY=K88888888888888
```

---

## 💰 Limites Free Tier

### Vercel Free
- ✅ 100GB bandwidth/mês
- ✅ Unlimited deployments
- ✅ Automatic HTTPS
- ✅ Git integration
- ❌ 1 team member (você)

### Supabase Free
- ✅ 500MB database (≈50k exames)
- ✅ 2GB bandwidth/mês
- ✅ 1GB file storage
- ✅ 500k Edge Function invocations
- ❌ Pausa após 1 semana inativo (reativa automático ao acessar)

**Suficiente para**: 100-200 usuários MVP

---

## 🎓 Comandos Úteis

```bash
# Ver status
vercel ls
supabase status

# Ver logs em tempo real
vercel logs --follow
supabase functions logs process-exam-document --tail

# Rollback deploy anterior (Vercel)
vercel rollback

# Executar SQL no banco
supabase db remote exec "SELECT COUNT(*) FROM exam_images"

# Backup database
supabase db dump > backup.sql
```

---

## 📞 Suporte

### Documentação
- Vercel: https://vercel.com/docs
- Supabase: https://supabase.com/docs

### Comunidades
- Vercel Discord: https://vercel.com/discord
- Supabase Discord: https://discord.supabase.com

---

## 🎯 Resumo: Do ZERO ao AR

```bash
# 1. Criar projeto Supabase (web)
# 2. Obter APIs (web)

# 3. Configurar local
cd ProjetoZOE_MED_mvp_v1
# Criar .env e .env.local

# 4. Deploy backend
supabase login
supabase link --project-ref xxxxx
supabase db push
supabase functions deploy
supabase secrets set --env-file .env

# 5. Deploy frontend
vercel login
vercel --prod

# 6. PRONTO! ✅
```

**Tempo total**: ~15 minutos

**Custo**: R$ 0/mês

**Manutenção**: 0 horas/mês

---

🎉 **Parabéns! Seu MVP está no ar!**

Agora é focar no produto e validar com usuários reais! 🚀
