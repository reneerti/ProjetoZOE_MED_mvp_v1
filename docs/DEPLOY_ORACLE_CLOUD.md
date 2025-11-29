# Guia Completo de Deploy - ZOE MED MVP no Oracle Cloud

## 📋 Sumário

1. [Preparação - Criar Conta Oracle Cloud](#1-preparação)
2. [Criar VM Linux (Recomendado - Always Free)](#2-criar-vm-linux)
3. [Configurar Servidor](#3-configurar-servidor)
4. [Opção A: Supabase Cloud (Recomendado para MVP)](#4a-supabase-cloud)
5. [Opção B: PostgreSQL Self-Hosted](#4b-postgresql-self-hosted)
6. [Configurar Todas as APIs](#5-configurar-apis)
7. [Deploy do Backend (Supabase Functions)](#6-deploy-backend)
8. [Deploy do Frontend (React)](#7-deploy-frontend)
9. [Configurar Domínio e SSL](#8-domínio-ssl)
10. [Executar Migrations](#9-executar-migrations)
11. [Testar Funcionamento](#10-testar)
12. [Monitoramento e Manutenção](#11-monitoramento)

---

## 1. Preparação

### 1.1 Criar Conta Oracle Cloud

1. Acesse: https://www.oracle.com/cloud/free/
2. Clique em **"Start for free"**
3. Preencha dados:
   - Email
   - País: Brasil
   - Nome completo
4. Verificar email
5. Adicionar cartão de crédito (não será cobrado no tier gratuito)
6. Aguardar aprovação (1-24h)

### 1.2 Oracle Cloud Always Free - Recursos Disponíveis

✅ **Compute** (VM):
- 2 VMs AMD (1 core, 1GB RAM cada)
- **ou** 4 VMs ARM (4 cores, 24GB RAM total) ⭐ **RECOMENDADO**

✅ **Storage**:
- 200GB block storage total

✅ **Networking**:
- 10TB outbound/mês

✅ **Database**:
- 2 Oracle Autonomous Database (Always Free)
- **ou usar PostgreSQL na VM**

---

## 2. Criar VM Linux

### 2.1 Acessar Console Oracle Cloud

1. Login: https://cloud.oracle.com/
2. No menu superior: **Compute** → **Instances**
3. Clique em **"Create Instance"**

### 2.2 Configurar VM (Always Free - ARM)

**Nome**: `zoe-med-mvp`

**Placement**:
- Availability Domain: (deixar padrão)

**Image and Shape**:
- **Image**: Oracle Linux 8 (ou Ubuntu 22.04)
- Clique em **"Change Shape"**
- **Shape Series**: Ampere (ARM)
- **Shape**: VM.Standard.A1.Flex
- **OCPUs**: 4 (usar todos os cores disponíveis)
- **Memory**: 24 GB (usar toda RAM disponível)
- Clique **"Select Shape"**

**Networking**:
- **VCN**: (criar nova ou usar default)
- **Subnet**: Public Subnet
- ✅ **Assign a public IPv4 address**

**Add SSH Keys**:
- Escolha uma opção:
  - **Generate a key pair**: Download `.pem` file ⭐ **RECOMENDADO**
  - **Upload public key**: se já tiver uma chave SSH

**Boot Volume**:
- Size: 100 GB (máximo gratuito)

Clique em **"Create"**

### 2.3 Aguardar Provisionamento

- Status: **PROVISIONING** → **RUNNING** (2-5 minutos)
- Anote o **Public IP Address**: ex: `123.45.67.89`

### 2.4 Configurar Firewall (Security List)

1. Na página da instância, clique na **VCN** (link azul)
2. **Security Lists** → **Default Security List**
3. **Add Ingress Rules** (adicionar regras de entrada):

```
Source CIDR: 0.0.0.0/0
IP Protocol: TCP
Destination Port: 22 (SSH)
Description: SSH access

Source CIDR: 0.0.0.0/0
IP Protocol: TCP
Destination Port: 80 (HTTP)
Description: HTTP

Source CIDR: 0.0.0.0/0
IP Protocol: TCP
Destination Port: 443 (HTTPS)
Description: HTTPS

Source CIDR: 0.0.0.0/0
IP Protocol: TCP
Destination Port: 3000 (React Dev)
Description: React Frontend

Source CIDR: 0.0.0.0/0
IP Protocol: TCP
Destination Port: 8080 (Supabase)
Description: Supabase Local

Source CIDR: 0.0.0.0/0
IP Protocol: TCP
Destination Port: 5432 (PostgreSQL)
Description: PostgreSQL
```

---

## 3. Configurar Servidor

### 3.1 Conectar via SSH

**No Windows** (usar PowerShell):
```powershell
ssh -i C:\path\to\downloaded-key.pem opc@123.45.67.89
```

**No Linux/Mac**:
```bash
chmod 400 ~/Downloads/downloaded-key.pem
ssh -i ~/Downloads/downloaded-key.pem opc@123.45.67.89
# ou ubuntu@123.45.67.89 se escolheu Ubuntu
```

Se pedir confirmação de fingerprint, digite `yes`

### 3.2 Atualizar Sistema

```bash
# Oracle Linux / CentOS / RHEL
sudo yum update -y

# Ubuntu / Debian
sudo apt update && sudo apt upgrade -y
```

### 3.3 Instalar Dependências Essenciais

```bash
# Oracle Linux
sudo yum install -y git curl wget vim firewalld

# Ubuntu
sudo apt install -y git curl wget vim ufw
```

### 3.4 Configurar Firewall Local

```bash
# Oracle Linux
sudo systemctl start firewalld
sudo systemctl enable firewalld
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --permanent --add-port=5432/tcp
sudo firewall-cmd --reload

# Ubuntu
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 8080/tcp
sudo ufw allow 5432/tcp
sudo ufw enable
```

### 3.5 Instalar Node.js

```bash
# Instalar NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash

# Recarregar shell
source ~/.bashrc

# Instalar Node.js LTS
nvm install --lts
nvm use --lts

# Verificar instalação
node --version  # v20.x.x
npm --version   # 10.x.x
```

### 3.6 Instalar Deno (para Supabase Functions)

```bash
curl -fsSL https://deno.land/install.sh | sh

# Adicionar ao PATH
echo 'export DENO_INSTALL="$HOME/.deno"' >> ~/.bashrc
echo 'export PATH="$DENO_INSTALL/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verificar
deno --version
```

### 3.7 Instalar Supabase CLI

```bash
npm install -g supabase

# Verificar
supabase --version
```

---

## 4a. Supabase Cloud (RECOMENDADO para MVP)

### Por que usar Supabase Cloud?

✅ **Gratuito para MVP** (500MB storage, 2GB bandwidth)
✅ **Gerenciado** (backups, updates automáticos)
✅ **SSL automático**
✅ **Edge Functions** prontas
✅ **Menos configuração**

### 4a.1 Criar Projeto Supabase

1. Acesse: https://supabase.com/dashboard
2. Clique em **"New Project"**
3. Preencha:
   - **Name**: `zoe-med-mvp`
   - **Database Password**: (gerar senha forte)
   - **Region**: São Paulo (South America)
   - **Pricing Plan**: Free
4. Clique em **"Create New Project"**
5. Aguardar (2-5 minutos)

### 4a.2 Obter Credenciais

Após criação, vá em **Settings** → **API**:

Anote:
```
Project URL: https://xxxxx.supabase.co
anon key: eyJhbGc...
service_role key: eyJhbGc... (secret - não expor)
```

### 4a.3 Configurar Variáveis de Ambiente

Na VM, criar arquivo `.env`:

```bash
cd ~
mkdir zoe-med-mvp
cd zoe-med-mvp

cat > .env << 'EOF'
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# APIs de OCR
OCR_SPACE_API_KEY=
GOOGLE_VISION_API_KEY=
AZURE_VISION_API_KEY=

# APIs de PDF
PDF_CO_API_KEY=
CONVERTAPI_SECRET=
CLOUDCONVERT_API_KEY=

# APIs de IA
GROQ_API_KEY=
GOOGLE_AI_API_KEY=
TOGETHER_API_KEY=
OPENROUTER_API_KEY=
HUGGINGFACE_API_KEY=
LOVABLE_API_KEY=
EOF
```

**Pule para seção 5 (Configurar APIs)**

---

## 4b. PostgreSQL Self-Hosted (Alternativa)

### Só use se NÃO quiser Supabase Cloud

### 4b.1 Instalar PostgreSQL

```bash
# Oracle Linux
sudo yum install -y postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Ubuntu
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 4b.2 Configurar PostgreSQL

```bash
# Mudar para usuário postgres
sudo -u postgres psql

-- Criar database
CREATE DATABASE zoe_med_mvp;

-- Criar usuário
CREATE USER zoeadmin WITH ENCRYPTED PASSWORD 'SuaSenhaForte123!';

-- Dar permissões
GRANT ALL PRIVILEGES ON DATABASE zoe_med_mvp TO zoeadmin;

-- Sair
\q
```

### 4b.3 Configurar Acesso Remoto

```bash
# Editar pg_hba.conf
sudo vim /var/lib/pgsql/data/pg_hba.conf
# ou Ubuntu: /etc/postgresql/14/main/pg_hba.conf

# Adicionar linha (ANTES das outras regras):
host    all             all             0.0.0.0/0               md5

# Editar postgresql.conf
sudo vim /var/lib/pgsql/data/postgresql.conf
# ou Ubuntu: /etc/postgresql/14/main/postgresql.conf

# Modificar linha:
listen_addresses = '*'

# Reiniciar
sudo systemctl restart postgresql
```

### 4b.4 Instalar Supabase Local

```bash
cd ~/zoe-med-mvp

# Inicializar Supabase
supabase init

# Configurar para usar PostgreSQL local
# Editar supabase/config.toml e adicionar:
[db]
port = 5432
shadow_port = 54320
major_version = 14

# Linkar com banco local
supabase db remote set "postgresql://zoeadmin:SuaSenhaForte123!@localhost:5432/zoe_med_mvp"

# Iniciar Supabase local
supabase start
```

---

## 5. Configurar APIs

### 5.1 APIs de OCR (escolha pelo menos 1)

#### OCR.space (Gratuito - 25.000 req/mês)

1. Acesse: https://ocr.space/ocrapi
2. Clique em **"Register for Free API Key"**
3. Preencha email
4. Receba key por email
5. Adicione ao `.env`:
```bash
OCR_SPACE_API_KEY=K88888888888888
```

#### Google Vision API (1.000 req/mês grátis)

1. Acesse: https://console.cloud.google.com/
2. Criar projeto: **"ZOE MED MVP"**
3. Ativar API: **Cloud Vision API**
4. Criar credenciais: **API Key**
5. Adicione ao `.env`:
```bash
GOOGLE_VISION_API_KEY=AIzaSy...
```

#### Azure Computer Vision (5.000 req/mês grátis)

1. Acesse: https://portal.azure.com/
2. Criar recurso: **Computer Vision**
3. Free tier: **F0**
4. Obter **Key** e **Endpoint**
5. Adicione ao `.env`:
```bash
AZURE_VISION_API_KEY=abc123...
AZURE_VISION_ENDPOINT=https://xxxxx.cognitiveservices.azure.com/
```

### 5.2 APIs de PDF (escolha pelo menos 1)

#### PDF.co (500 créditos/mês grátis)

1. Acesse: https://pdf.co/
2. Sign up (free plan)
3. Dashboard → **API Key**
4. Adicione ao `.env`:
```bash
PDF_CO_API_KEY=user@email.com_abc123...
```

#### ConvertAPI (250 conversões/mês grátis)

1. Acesse: https://www.convertapi.com/
2. Sign up
3. Dashboard → **Secret**
4. Adicione ao `.env`:
```bash
CONVERTAPI_SECRET=abc123...
```

### 5.3 APIs de IA (escolha pelo menos 2)

#### Groq (Ultrafast - RECOMENDADO)

1. Acesse: https://console.groq.com/
2. Sign up
3. **API Keys** → **Create API Key**
4. Adicione ao `.env`:
```bash
GROQ_API_KEY=gsk_...
```

#### Google AI (Gemini)

1. Acesse: https://makersuite.google.com/app/apikey
2. Criar API Key
3. Adicione ao `.env`:
```bash
GOOGLE_AI_API_KEY=AIzaSy...
```

#### Together AI

1. Acesse: https://api.together.xyz/
2. Sign up
3. Settings → **API Keys**
4. Adicione ao `.env`:
```bash
TOGETHER_API_KEY=...
```

#### OpenRouter (Acesso a múltiplos modelos)

1. Acesse: https://openrouter.ai/
2. Sign up
3. Keys → **Create Key**
4. Adicione ao `.env`:
```bash
OPENROUTER_API_KEY=sk-or-v1-...
```

### 5.4 Verificar Configuração

```bash
cd ~/zoe-med-mvp
cat .env
```

Deve ter pelo menos:
- ✅ Supabase (URL + Keys)
- ✅ 1 API de OCR
- ✅ 1 API de PDF
- ✅ 2 APIs de IA

---

## 6. Deploy do Backend (Supabase Functions)

### 6.1 Clonar Repositório

```bash
cd ~/zoe-med-mvp

# Clone seu repositório
git clone https://github.com/reneerti/ProjetoZOE_MED_mvp_v1.git .

# Checkout na branch correta
git checkout claude/refactor-ocr-service-016PxucXnScettdygCSCC56q
```

### 6.2 Configurar Supabase

```bash
# Login no Supabase
supabase login

# Linkar com projeto (se usando Supabase Cloud)
supabase link --project-ref xxxxx  # ref do seu projeto

# Ou para local
supabase start
```

### 6.3 Deploy das Functions

```bash
# Deploy todas as functions
supabase functions deploy process-exam-document
supabase functions deploy process-bioimpedance
supabase functions deploy manage-api-configs

# Verificar deploy
supabase functions list
```

### 6.4 Configurar Secrets nas Functions

```bash
# Supabase Cloud
supabase secrets set --env-file .env

# Ou individualmente
supabase secrets set OCR_SPACE_API_KEY=K88888888888888
supabase secrets set GROQ_API_KEY=gsk_...
# ... repetir para todas
```

---

## 7. Deploy do Frontend (React)

### 7.1 Instalar Dependências

```bash
cd ~/zoe-med-mvp

# Instalar pacotes
npm install
```

### 7.2 Configurar Variáveis de Ambiente do Frontend

```bash
cat > .env.local << 'EOF'
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
EOF
```

### 7.3 Build de Produção

```bash
npm run build
```

Isso cria pasta `dist/` com arquivos estáticos.

### 7.4 Instalar NGINX

```bash
# Oracle Linux
sudo yum install -y nginx

# Ubuntu
sudo apt install -y nginx

# Iniciar
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 7.5 Configurar NGINX

```bash
sudo vim /etc/nginx/conf.d/zoe-med.conf
```

Adicionar:

```nginx
server {
    listen 80;
    server_name 123.45.67.89;  # Seu IP público

    root /home/opc/zoe-med-mvp/dist;
    index index.html;

    # Logs
    access_log /var/log/nginx/zoe-med-access.log;
    error_log /var/log/nginx/zoe-med-error.log;

    # Compressão
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache estático
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Salvar e testar:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 7.6 Ajustar Permissões

```bash
sudo chmod -R 755 /home/opc/zoe-med-mvp/dist
sudo chown -R nginx:nginx /home/opc/zoe-med-mvp/dist

# Oracle Linux: desabilitar SELinux (temporário para testes)
sudo setenforce 0
```

---

## 8. Configurar Domínio e SSL

### 8.1 Registrar Domínio (Opcional para MVP)

Se quiser domínio:
1. Compre em: Registro.br, GoDaddy, Namecheap
2. Exemplo: `zoe-med.app`

### 8.2 Apontar DNS para VM

No painel do registrador, adicionar:

```
Tipo: A
Nome: @
Valor: 123.45.67.89 (IP da VM)
TTL: 3600

Tipo: A
Nome: www
Valor: 123.45.67.89
TTL: 3600
```

Aguardar propagação (5min - 48h)

### 8.3 Instalar Certbot (SSL Gratuito)

```bash
# Oracle Linux
sudo yum install -y certbot python3-certbot-nginx

# Ubuntu
sudo apt install -y certbot python3-certbot-nginx
```

### 8.4 Obter Certificado SSL

```bash
# Com domínio
sudo certbot --nginx -d zoe-med.app -d www.zoe-med.app

# Seguir instruções:
# - Email para renovação
# - Aceitar termos
# - Redirecionar HTTP → HTTPS: Yes
```

Certbot automaticamente:
- ✅ Obtém certificado
- ✅ Configura NGINX
- ✅ Configura auto-renovação

### 8.5 Testar Renovação Automática

```bash
sudo certbot renew --dry-run
```

---

## 9. Executar Migrations

### 9.1 Conectar ao Banco

**Se Supabase Cloud**:
```bash
# Obter string de conexão
# Dashboard → Settings → Database → Connection String (Direct)

psql "postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres"
```

**Se PostgreSQL local**:
```bash
psql -U zoeadmin -d zoe_med_mvp
```

### 9.2 Executar Todas as Migrations na Ordem

```bash
cd ~/zoe-med-mvp/supabase/migrations

# Estrutura base de exames (já feito anteriormente)
psql ... < 20251128_complete_database_structure.sql
psql ... < 20251128_seed_exam_library.sql
psql ... < 20251128_seed_clinical_conditions.sql
psql ... < 20251128_update_exam_results.sql

# API Management (já feito)
psql ... < 20251128_create_api_configurations.sql
psql ... < 20251128_add_api_usage_tracking.sql

# BIOIMPEDÂNCIA (NOVO)
psql ... < 20251129_bioimpedance_structure.sql
psql ... < 20251129_seed_bioimpedance_library.sql
psql ... < 20251129_seed_bioimpedance_conditions.sql

# MEDICAÇÕES (NOVO)
psql ... < 20251129_medications_structure.sql
psql ... < 20251129_seed_medications.sql

# SUPLEMENTAÇÃO (NOVO)
psql ... < 20251129_supplements_structure.sql
psql ... < 20251129_seed_supplements.sql
```

Ou usar Supabase CLI:

```bash
cd ~/zoe-med-mvp
supabase db push
```

### 9.3 Verificar Tabelas Criadas

```sql
-- Listar todas as tabelas
\dt

-- Deve mostrar:
-- exam_images
-- exam_results
-- exam_library
-- bioimpedance_records
-- bioimpedance_results
-- medication_library
-- user_prescriptions
-- supplement_library
-- user_supplements
-- ... e muitas outras
```

---

## 10. Testar Funcionamento

### 10.1 Acessar Aplicação

**No navegador**:
```
http://123.45.67.89
# ou
https://zoe-med.app (se configurou domínio)
```

### 10.2 Testar Cadastro de Usuário

1. Criar conta
2. Verificar email
3. Login

### 10.3 Testar Upload de Exame

1. Ir em **"Meus Exames"**
2. Fazer upload de uma imagem de exame
3. Aguardar processamento
4. Verificar se:
   - ✅ OCR extraiu texto
   - ✅ IA estruturou dados
   - ✅ Parâmetros foram salvos
   - ✅ Status calculado corretamente
   - ✅ Diagnósticos detectados (se aplicável)

### 10.4 Testar Bioimpedância

1. Upload de relatório de bioimpedância
2. Verificar detecção de condições

### 10.5 Testar Medicações

1. Cadastrar medicação
2. Verificar interações

### 10.6 Verificar Logs

```bash
# Logs do NGINX
sudo tail -f /var/log/nginx/zoe-med-access.log
sudo tail -f /var/log/nginx/zoe-med-error.log

# Logs do Supabase (se local)
supabase logs

# Logs das Functions
supabase functions logs process-exam-document
```

---

## 11. Monitoramento e Manutenção

### 11.1 Configurar Monitoramento Básico

```bash
# Instalar htop (monitor de recursos)
sudo yum install -y htop  # Oracle Linux
sudo apt install -y htop  # Ubuntu

# Ver uso de recursos
htop
```

### 11.2 Backup Automático do Banco

**Se Supabase Cloud**: Backups automáticos já incluídos

**Se PostgreSQL local**:

```bash
# Criar script de backup
cat > ~/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=/home/opc/backups
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump -U zoeadmin zoe_med_mvp > $BACKUP_DIR/backup_$TIMESTAMP.sql
# Manter apenas últimos 7 dias
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
EOF

chmod +x ~/backup-db.sh

# Adicionar ao crontab (rodar diariamente às 2h)
crontab -e
# Adicionar linha:
0 2 * * * /home/opc/backup-db.sh
```

### 11.3 Monitorar Uso de APIs

```sql
-- Ver uso de APIs
SELECT
  provider,
  COUNT(*) as requests,
  SUM(estimated_cost_usd) as total_cost,
  AVG(response_time_ms) as avg_response_time
FROM api_usage_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY provider
ORDER BY requests DESC;
```

### 11.4 Configurar Alertas (Opcional)

1. Supabase Dashboard → **Database** → **Webhooks**
2. Criar webhook para erros críticos
3. Integrar com email ou Slack

---

## 12. Checklist Final

### Antes de Testar MVP

- [ ] VM criada e acessível
- [ ] Firewall configurado (Cloud + Local)
- [ ] Node.js e Deno instalados
- [ ] Supabase configurado (Cloud ou Local)
- [ ] Banco de dados criado
- [ ] Migrations executadas com sucesso
- [ ] Pelo menos 1 API de OCR configurada
- [ ] Pelo menos 1 API de PDF configurada
- [ ] Pelo menos 2 APIs de IA configuradas
- [ ] Backend (Functions) deployed
- [ ] Frontend built e servido via NGINX
- [ ] SSL configurado (se tiver domínio)
- [ ] Teste de cadastro funcionando
- [ ] Teste de upload funcionando
- [ ] Logs acessíveis
- [ ] Backup configurado

---

## 13. Custos Estimados

### Oracle Cloud Always Free ✅ GRÁTIS
- VM ARM 4 cores, 24GB RAM: **$0/mês**
- 200GB storage: **$0/mês**
- 10TB bandwidth: **$0/mês**

### Supabase Cloud (Free Tier) ✅ GRÁTIS
- 500MB database: **$0/mês**
- 2GB bandwidth: **$0/mês**
- 50MB file storage: **$0/mês**

### APIs (Free Tiers)
- OCR.space: 25k req/mês **$0**
- Google Vision: 1k req/mês **$0**
- PDF.co: 500 créditos/mês **$0**
- Groq: Generoso (varia) **$0**
- Google AI: 60 req/min **$0**

### Domínio (Opcional)
- .com.br: ~R$ 40/ano
- .app: ~R$ 80/ano

### Total para MVP: **R$ 0 - R$ 80/ano** 🎉

---

## 14. Troubleshooting Comum

### Erro: "Cannot connect to database"

```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Ver logs
sudo journalctl -u postgresql -f
```

### Erro: "Functions not deploying"

```bash
# Verificar login
supabase login

# Re-linkar projeto
supabase link --project-ref xxxxx

# Deploy com verbose
supabase functions deploy process-exam-document --debug
```

### Erro: "502 Bad Gateway" no NGINX

```bash
# Verificar se aplicação está rodando
ps aux | grep node

# Ver logs NGINX
sudo tail -f /var/log/nginx/error.log

# Testar config NGINX
sudo nginx -t
```

### Frontend não carrega após build

```bash
# Rebuild
cd ~/zoe-med-mvp
rm -rf dist
npm run build

# Verificar permissões
sudo chown -R nginx:nginx dist/
sudo chmod -R 755 dist/
```

---

## 15. Próximos Passos Após MVP

1. **Adicionar domínio personalizado**
2. **Configurar CDN** (Cloudflare)
3. **Implementar analytics**
4. **Adicionar mais APIs** (redundância)
5. **Monitoramento avançado** (Grafana)
6. **Auto-scaling** (quando sair do free tier)
7. **Implementar CI/CD** (GitHub Actions)

---

## 16. Suporte

### Documentação Oficial

- Oracle Cloud: https://docs.oracle.com/cloud/
- Supabase: https://supabase.com/docs
- NGINX: https://nginx.org/en/docs/

### Comunidade

- Oracle Cloud Forum: https://cloudcustomerconnect.oracle.com/
- Supabase Discord: https://discord.supabase.com/
- Stack Overflow: https://stackoverflow.com/

---

**Boa sorte com o MVP! 🚀**

Se precisar de ajuda em alguma etapa específica, estou aqui! 💪
