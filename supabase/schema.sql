-- ============================================================
-- Sistema de Encomendas Biscoitê — Schema do banco (Supabase/Postgres)
-- Rode este arquivo inteiro no SQL Editor do Supabase (Dashboard > SQL Editor > New query)
-- ============================================================

-- Extensão para gerar UUIDs
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Tabela: funcionarios (destinatários das encomendas)
-- ------------------------------------------------------------
create table if not exists public.funcionarios (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  setor       text not null,
  email       text not null,
  whatsapp    text,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Tabela: usuarios_sistema (login de operadores/portaria/admin)
-- ------------------------------------------------------------
create table if not exists public.usuarios_sistema (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  usuario     text not null unique,
  senha_hash  text not null,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Tabela: encomendas
-- ------------------------------------------------------------
create table if not exists public.encomendas (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),

  -- Relacionamento com o destinatário (funcionário). Se o funcionário for
  -- excluído, a encomenda continua existindo (histórico), só perde o vínculo.
  destinatario_id   uuid references public.funcionarios(id) on delete set null,

  -- Relacionamento com o operador que registrou (login). Guardamos também
  -- o nome em texto (quem_recebeu) como "foto" histórica, pois o operador
  -- pode ser removido do sistema depois e o nome ainda precisa aparecer.
  quem_recebeu_id   uuid references public.usuarios_sistema(id) on delete set null,
  quem_recebeu      text not null,

  status            text not null default 'recebido' check (status in ('recebido', 'retirado')),
  numero_nota       text,
  foto_url          text,
  quem_retirou      text,
  retirado_em       timestamptz
);

create index if not exists idx_encomendas_destinatario on public.encomendas(destinatario_id);
create index if not exists idx_encomendas_status        on public.encomendas(status);
create index if not exists idx_encomendas_created_at     on public.encomendas(created_at desc);

-- ------------------------------------------------------------
-- Row Level Security
-- Toda leitura/escrita passa pelas rotas de back-end (Route Handlers)
-- usando a Service Role Key, que ignora RLS. Por isso deixamos RLS
-- ativado SEM políticas para anon/authenticated: acesso direto pelo
-- navegador fica bloqueado por padrão.
-- ------------------------------------------------------------
alter table public.funcionarios     enable row level security;
alter table public.usuarios_sistema enable row level security;
alter table public.encomendas       enable row level security;

-- ------------------------------------------------------------
-- Seed: usuário admin inicial
-- login: admin | senha: 123  (TROQUE a senha assim que possível)
-- Hash gerado com bcrypt (10 rounds)
-- ------------------------------------------------------------
insert into public.usuarios_sistema (nome, usuario, senha_hash)
values ('Portaria Principal', 'admin', '$2b$10$JU.XmR7BTaNRHS/flBUWyOYKE5.oCDqvQBRnwEf5vKy21ggzAODC2')
on conflict (usuario) do nothing;
