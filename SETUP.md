# Configuração do banco de dados (Supabase) e deploy na Vercel

## 1. Criar o projeto Supabase
Duas formas, escolha uma:

- **Pela Vercel (recomendado):** no dashboard do seu projeto na Vercel, vá em
  **Storage > Marketplace Database Providers > Supabase** e crie um projeto
  gratuito direto por lá. A Vercel já cria a maioria das variáveis de ambiente
  automaticamente.
- **Direto pelo Supabase:** crie uma conta grátis em supabase.com, crie um
  projeto novo (escolha uma região próxima, ex: São Paulo).

## 2. Rodar o schema do banco
No painel do Supabase, abra **SQL Editor > New query**, cole o conteúdo de
`supabase/schema.sql` deste projeto e execute. Isso cria as 3 tabelas
(`funcionarios`, `usuarios_sistema`, `encomendas`), os relacionamentos, os
índices, ativa o RLS e cria um usuário admin inicial:

- **usuário:** `admin`
- **senha:** `123` (troque assim que possível pela tela de "Acessos Sistema")

## 3. Criar o bucket de fotos
No painel do Supabase: **Storage > New bucket**
- Nome: `encomendas-fotos`
- Marque como **Public bucket**

Isso é suficiente — os uploads são feitos pelo back-end com a service role key,
que ignora RLS, e o bucket público permite que as URLs das fotos sejam
exibidas no mural sem precisar de autenticação.

## 4. Variáveis de ambiente
Copie `.env.local.example` para `.env.local` e preencha (veja os valores em
**Project Settings > Data API** e **Project Settings > API Keys** no Supabase):

```
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
SESSION_SECRET=uma-string-aleatoria-longa (gere com: openssl rand -base64 32)
```

Ao publicar na Vercel, cadastre essas mesmas 3 variáveis em
**Project Settings > Environment Variables**.

## 5. Rodar localmente
```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`, clique em "Acesso Logística" e entre com
`admin` / `123`.

## O que já está pronto
- Tabelas relacionadas: `encomendas.destinatario_id → funcionarios.id` e
  `encomendas.quem_recebeu_id → usuarios_sistema.id`
- Senhas com hash bcrypt, nunca em texto puro
- Sessão de login via cookie `httpOnly` assinado (HMAC), não em `localStorage`
- Fotos armazenadas no Supabase Storage (não mais em base64 no banco)
- RLS ativado em todas as tabelas — toda escrita/leitura passa pelas rotas
  `app/api/**`, que usam a service role key (nunca exposta ao navegador)
