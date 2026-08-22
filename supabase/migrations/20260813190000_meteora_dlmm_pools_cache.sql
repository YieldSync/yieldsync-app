-- Shared cache for Meteora DLMM pool metadata (+ DexScreener token images).
-- Safe to re-run.

create table if not exists public.meteora_dlmm_pools (
  address text primary key,
  name text,
  protocol text not null default 'dlmm',
  created_at_ms bigint,
  is_blacklisted boolean not null default false,
  tvl numeric,
  current_price numeric,
  apr numeric,
  apy numeric,
  dynamic_fee_pct numeric,
  bin_step integer,
  base_fee_pct numeric,
  max_fee_pct numeric,
  protocol_fee_pct numeric,
  collect_fee_mode integer,
  token_x_address text,
  token_x_symbol text,
  token_x_name text,
  token_x_decimals integer,
  token_x_is_verified boolean,
  token_x_freeze_disabled boolean,
  token_x_holders integer,
  token_x_image_url text,
  token_y_address text,
  token_y_symbol text,
  token_y_name text,
  token_y_decimals integer,
  token_y_is_verified boolean,
  token_y_freeze_disabled boolean,
  token_y_holders integer,
  token_y_image_url text,
  raw jsonb,
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meteora_dlmm_pools_fetched_at_idx
  on public.meteora_dlmm_pools (fetched_at desc);

comment on table public.meteora_dlmm_pools is
  'Cached Meteora DLMM pool metadata (datapi) + DexScreener token image URLs.';

alter table public.meteora_dlmm_pools enable row level security;

drop policy if exists meteora_dlmm_pools_select_authenticated on public.meteora_dlmm_pools;
create policy meteora_dlmm_pools_select_authenticated
  on public.meteora_dlmm_pools
  for select
  to authenticated
  using (true);

drop policy if exists meteora_dlmm_pools_insert_authenticated on public.meteora_dlmm_pools;
create policy meteora_dlmm_pools_insert_authenticated
  on public.meteora_dlmm_pools
  for insert
  to authenticated
  with check (true);

drop policy if exists meteora_dlmm_pools_update_authenticated on public.meteora_dlmm_pools;
create policy meteora_dlmm_pools_update_authenticated
  on public.meteora_dlmm_pools
  for update
  to authenticated
  using (true)
  with check (true);
