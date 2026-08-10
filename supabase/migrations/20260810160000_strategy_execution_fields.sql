-- Strategy execution fields for the dashboard Strategy Builder.
-- Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

-- Ensure core tracking tables exist (no-op if already present from prior migrations).
create table if not exists public.wallet_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  name text not null,
  status text not null default 'active',
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  address text not null,
  name text,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (user_id, address)
);

create table if not exists public.wallet_list_memberships (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.wallet_lists (id) on delete cascade,
  wallet_id uuid not null references public.wallets (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (list_id, wallet_id)
);

create table if not exists public.copy_trading_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  wallet_address text not null,
  name text,
  label text not null default '',
  source text not null default 'created',
  status text not null default 'active',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists copy_trading_wallets_user_address_uidx
  on public.copy_trading_wallets (user_id, wallet_address);

create table if not exists public.copy_trading_strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  name text not null default '',
  source_wallet text not null,
  source_name text,
  execution_wallet text not null,
  execution_label text,
  copy_pct integer not null default 25
    check (copy_pct >= 1 and copy_pct <= 100),
  min_size_sol numeric(18, 9) not null default 0.1
    check (min_size_sol > 0),
  max_size_sol numeric(18, 9) not null default 2
    check (max_size_sol > 0),
  max_positions integer not null default 5
    check (max_positions >= 1 and max_positions <= 100),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint copy_trading_strategies_min_lte_max check (min_size_sol <= max_size_sol)
);

create index if not exists copy_trading_strategies_user_id_idx
  on public.copy_trading_strategies (user_id);

-- Builder / execution settings
alter table public.copy_trading_strategies
  add column if not exists sizing_mode text not null default 'percentage',
  add column if not exists fixed_size_sol numeric(18, 9),
  add column if not exists slippage_pct numeric(8, 4) not null default 1.5,
  add column if not exists priority_fee_sol numeric(18, 9) not null default 0.0005,
  add column if not exists stop_loss_pct numeric(8, 2),
  add column if not exists take_profit_pct numeric(8, 2),
  add column if not exists token_whitelist text[] not null default '{}',
  add column if not exists token_blacklist text[] not null default '{}',
  add column if not exists auto_sell boolean not null default true,
  add column if not exists auto_sell_retries integer not null default 3;

do $$
begin
  alter table public.copy_trading_strategies
    drop constraint if exists copy_trading_strategies_sizing_mode_check;
  alter table public.copy_trading_strategies
    add constraint copy_trading_strategies_sizing_mode_check
    check (sizing_mode in ('percentage', 'fixed'));

  alter table public.copy_trading_strategies
    drop constraint if exists copy_trading_strategies_auto_sell_retries_check;
  alter table public.copy_trading_strategies
    add constraint copy_trading_strategies_auto_sell_retries_check
    check (auto_sell_retries >= 0 and auto_sell_retries <= 10);

  alter table public.copy_trading_strategies
    drop constraint if exists copy_trading_strategies_slippage_pct_check;
  alter table public.copy_trading_strategies
    add constraint copy_trading_strategies_slippage_pct_check
    check (slippage_pct >= 0 and slippage_pct <= 50);
exception when others then null;
end $$;

comment on column public.copy_trading_strategies.source_wallet is
  'Leader / sync wallet — exactly one tracked wallet per strategy.';
comment on column public.copy_trading_strategies.execution_wallet is
  'Trading wallet that executes mirrored trades.';
comment on column public.copy_trading_strategies.min_size_sol is
  'Minimum buy amount in SOL.';
comment on column public.copy_trading_strategies.auto_sell_retries is
  'Retry count when auto-sell fails (e.g. slippage).';

-- RLS (idempotent)
alter table public.wallets enable row level security;
alter table public.wallet_lists enable row level security;
alter table public.wallet_list_memberships enable row level security;
alter table public.copy_trading_wallets enable row level security;
alter table public.copy_trading_strategies enable row level security;

drop policy if exists "Users can read own wallets" on public.wallets;
create policy "Users can read own wallets"
  on public.wallets for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Users can insert own wallets" on public.wallets;
create policy "Users can insert own wallets"
  on public.wallets for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "Users can update own wallets" on public.wallets;
create policy "Users can update own wallets"
  on public.wallets for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own wallets" on public.wallets;
create policy "Users can delete own wallets"
  on public.wallets for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read own lists" on public.wallet_lists;
create policy "Users can read own lists"
  on public.wallet_lists for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Users can insert own lists" on public.wallet_lists;
create policy "Users can insert own lists"
  on public.wallet_lists for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "Users can update own lists" on public.wallet_lists;
create policy "Users can update own lists"
  on public.wallet_lists for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own lists" on public.wallet_lists;
create policy "Users can delete own lists"
  on public.wallet_lists for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read own memberships" on public.wallet_list_memberships;
create policy "Users can read own memberships"
  on public.wallet_list_memberships for select to authenticated
  using (
    exists (
      select 1 from public.wallet_lists l
      where l.id = list_id and l.user_id = auth.uid()
    )
  );
drop policy if exists "Users can insert own memberships" on public.wallet_list_memberships;
create policy "Users can insert own memberships"
  on public.wallet_list_memberships for insert to authenticated
  with check (
    exists (
      select 1 from public.wallet_lists l
      where l.id = list_id and l.user_id = auth.uid()
    )
    and exists (
      select 1 from public.wallets w
      where w.id = wallet_id and w.user_id = auth.uid()
    )
  );
drop policy if exists "Users can delete own memberships" on public.wallet_list_memberships;
create policy "Users can delete own memberships"
  on public.wallet_list_memberships for delete to authenticated
  using (
    exists (
      select 1 from public.wallet_lists l
      where l.id = list_id and l.user_id = auth.uid()
    )
  );

drop policy if exists "Users can read own copy trading wallets" on public.copy_trading_wallets;
create policy "Users can read own copy trading wallets"
  on public.copy_trading_wallets for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Users can insert own copy trading wallets" on public.copy_trading_wallets;
create policy "Users can insert own copy trading wallets"
  on public.copy_trading_wallets for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "Users can update own copy trading wallets" on public.copy_trading_wallets;
create policy "Users can update own copy trading wallets"
  on public.copy_trading_wallets for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own copy trading wallets" on public.copy_trading_wallets;
create policy "Users can delete own copy trading wallets"
  on public.copy_trading_wallets for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read own copy trading strategies" on public.copy_trading_strategies;
create policy "Users can read own copy trading strategies"
  on public.copy_trading_strategies for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Users can insert own copy trading strategies" on public.copy_trading_strategies;
create policy "Users can insert own copy trading strategies"
  on public.copy_trading_strategies for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "Users can update own copy trading strategies" on public.copy_trading_strategies;
create policy "Users can update own copy trading strategies"
  on public.copy_trading_strategies for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own copy trading strategies" on public.copy_trading_strategies;
create policy "Users can delete own copy trading strategies"
  on public.copy_trading_strategies for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own profile" on public.user_profiles;
create policy "Users can insert own profile"
  on public.user_profiles for insert to authenticated
  with check (auth.uid() = id);

create or replace function public.ensure_wallet_bootstrap()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  list_id uuid;
  free_plan uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select id into free_plan from public.plans where name = 'free' limit 1;

  insert into public.user_profiles (id, plan_id)
  values (uid, free_plan)
  on conflict (id) do nothing;

  select id into list_id
  from public.wallet_lists
  where user_id = uid and name = 'My Wallets'
  limit 1;

  if list_id is null then
    insert into public.wallet_lists (user_id, name, status)
    values (uid, 'My Wallets', 'active')
    returning id into list_id;
  end if;

  return list_id;
end;
$$;

grant execute on function public.ensure_wallet_bootstrap() to authenticated;
