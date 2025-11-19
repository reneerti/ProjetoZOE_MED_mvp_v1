# Configuração do Google OAuth (Login Social e Google Fit)

## Erro 403: "You do not have access to this page"

Este erro ocorre quando o Google OAuth não está configurado corretamente. Siga os passos abaixo:

## 1. Criar Projeto no Google Cloud Console

1. Acesse https://console.cloud.google.com/
2. Crie um novo projeto ou selecione um existente
3. Anote o **Project ID**

## 2. Configurar OAuth Consent Screen

1. Vá em: **APIs & Services** > **OAuth consent screen**
2. Escolha **External** (para permitir qualquer usuário Gmail)
3. Preencha as informações obrigatórias:
   - **App name**: Zoe Med
   - **User support email**: seu email
   - **Developer contact information**: seu email
4. Em **Scopes**, adicione:
   - `userinfo.email`
   - `userinfo.profile`
   - `openid`
   - `fitness.activity.read`
   - `fitness.heart_rate.read`
   - `fitness.sleep.read`
5. Clique em **Save and Continue**

## 3. Adicionar Usuários de Teste (IMPORTANTE!)

**Se o app estiver em "Testing mode":**

1. Vá em **OAuth consent screen**
2. Role até **Test users**
3. Clique em **ADD USERS**
4. Adicione os emails que poderão fazer login (incluindo o seu)
5. **Sem usuários de teste, você receberá erro 403!**

**OU** publique o app:
1. Clique em **PUBLISH APP**
2. Aguarde aprovação do Google (pode levar dias)

## 4. Criar Credenciais OAuth 2.0

1. Vá em: **APIs & Services** > **Credentials**
2. Clique em **+ CREATE CREDENTIALS** > **OAuth client ID**
3. Tipo: **Web application**
4. **Name**: Zoe Med Web Client

### Authorized JavaScript origins:
```
https://irlfnzxmeympvsslbnwn.supabase.co
https://zoemed-mvp-v1.lovable.app
http://localhost:5173
```

### Authorized redirect URIs:
```
https://irlfnzxmeympvsslbnwn.supabase.co/auth/v1/callback
https://irlfnzxmeympvsslbnwn.supabase.co/functions/v1/google-fit-auth
https://zoemed-mvp-v1.lovable.app
http://localhost:5173
```

5. Clique em **CREATE**
6. Copie o **Client ID** e **Client Secret**

## 5. Habilitar APIs Necessárias

1. Vá em: **APIs & Services** > **Library**
2. Procure e habilite:
   - **Google Fitness API**
   - **Google+ API** (para login social)

## 6. Configurar Secrets no Lovable Cloud

No Lovable, adicione os seguintes secrets:

```
GOOGLE_FIT_CLIENT_ID=seu_client_id_aqui
GOOGLE_FIT_CLIENT_SECRET=seu_client_secret_aqui
```

## 7. Configurar Auth no Lovable Cloud

1. Abra o Lovable Cloud Dashboard
2. Vá em **Authentication** > **Providers**
3. Habilite **Google**
4. Cole o **Client ID** e **Client Secret**
5. Salve as configurações

## Verificação

Após configurar, teste:

1. **Login Social**: Clique em "Continuar com Google" na tela de login
2. **Google Fit**: No módulo Wearables, clique em "Conectar Google Fit"

### Se ainda receber erro 403:
- Verifique se seu email está na lista de **Test users**
- Ou publique o app clicando em **PUBLISH APP**
- Verifique se todos os redirect URIs estão corretos
- Aguarde alguns minutos para propagação das configurações

## Webhook do Google Fit (Opcional)

Para receber notificações em tempo real quando novos dados estiverem disponíveis:

1. A edge function `google-fit-webhook` receberá as notificações
2. Adicione esta URL como webhook endpoint no Google Cloud Console:
```
https://irlfnzxmeympvsslbnwn.supabase.co/functions/v1/google-fit-webhook
```

3. Configure o webhook seguindo: https://developers.google.com/fit/scenarios/read-daily-step-total#subscribe_to_data
