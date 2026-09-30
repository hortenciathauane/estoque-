-- =========================================================================
-- CONTROLE DE ESTOQUE - TABELA E POLÍTICAS DE ACESSO (RLS)
-- Execute este script no SQL Editor do Supabase.
-- Cria a estrutura com estoque em branco, pronto para novos cadastros.
-- =========================================================================

-- 1. Habilitar extensões úteis
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =========================================================================
-- 2. CRIAÇÃO DA TABELA DE ITENS DE ESTOQUE
-- =========================================================================

create table if not exists public.estoque_items (
  id text primary key default concat('liv-', gen_random_uuid()),
  nome text not null,
  autor text not null default '',
  categoria text not null default 'Geral',
  isbn text default '',
  quantidade integer not null default 0 check (quantidade >= 0),
  valor_custo numeric(10,2) not null default 0 check (valor_custo >= 0),
  valor_revenda numeric(10,2) not null default 0 check (valor_revenda >= 0),
  valor_lucro numeric(10,2) not null default 0,
  margem_lucro numeric(5,2) not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Índices para otimização de pesquisas, filtros e ordenações
create index if not exists idx_estoque_nome on public.estoque_items (nome);
create index if not exists idx_estoque_categoria on public.estoque_items (categoria);
create index if not exists idx_estoque_quantidade on public.estoque_items (quantidade);
create index if not exists idx_estoque_created_at on public.estoque_items (created_at desc);

-- =========================================================================
-- 3. CÁLCULO AUTOMÁTICO DE LUCRO E MARGEM NO PRÓPRIO BANCO DE DADOS
-- Regra: Valor de lucro = Valor de revenda - Valor de custo
-- =========================================================================

create or replace function public.calcular_lucro_estoque()
returns trigger as $$
begin
  -- Atualiza o carimbo de modificação
  new.updated_at := timezone('utc'::text, now());
  
  -- Cálculo automático obrigatório do valor de lucro
  new.valor_lucro := round((new.valor_revenda - new.valor_custo), 2);
  
  -- Cálculo automático da margem percentual de lucro
  if new.valor_revenda > 0 then
    new.margem_lucro := round(((new.valor_lucro / new.valor_revenda) * 100), 2);
  else
    new.margem_lucro := 0;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_calcular_lucro on public.estoque_items;
create trigger trigger_calcular_lucro
  before insert or update on public.estoque_items
  for each row
  execute function public.calcular_lucro_estoque();

-- =========================================================================
-- 4. POLÍTICAS DE ROW LEVEL SECURITY (RLS) NA TABELA
-- =========================================================================

alter table public.estoque_items enable row level security;

-- Política de Leitura (Select)
drop policy if exists "Permitir leitura de estoque" on public.estoque_items;
create policy "Permitir leitura de estoque"
  on public.estoque_items
  for select
  using (true);

-- Política de Inserção (Insert)
drop policy if exists "Permitir insercao de estoque" on public.estoque_items;
create policy "Permitir insercao de estoque"
  on public.estoque_items
  for insert
  with check (true);

-- Política de Atualização (Update)
drop policy if exists "Permitir atualizacao de estoque" on public.estoque_items;
create policy "Permitir atualizacao de estoque"
  on public.estoque_items
  for update
  using (true)
  with check (true);

-- Política de Exclusão (Delete)
drop policy if exists "Permitir exclusao de estoque" on public.estoque_items;
create policy "Permitir exclusao de estoque"
  on public.estoque_items
  for delete
  using (true);
