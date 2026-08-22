-- Per-position rows from the Meteora pool PnL endpoint
-- (/positions/<pool>/pnl?user=<wallet>). This is the only upstream source that
-- reports position addresses for closed positions, so it also serves as the
-- lookup that turns a pool row into its events. Safe to re-run.

create table if not exists public.meteora_wallet_positions (
  wallet text not null,
  position text not null,
  pool text not null,
  is_closed boolean not null default false,
  is_out_of_range boolean,
  created_at bigint,
  closed_at bigint,
  updated_at bigint,
  lower_bin_id integer,
  upper_bin_id integer,
  min_price numeric,
  max_price numeric,
  pnl_sol numeric,
  pnl_usd numeric,
  pnl_sol_pct numeric,
  deposit_sol numeric,
  withdrawal_sol numeric,
  fee_sol numeric,
  balance_sol numeric,
  unclaimed_fee_sol numeric,
  raw jsonb,
  fetched_at timestamptz not null default now(),
  primary key (wallet, position)
);

create index if not exists meteora_wallet_positions_pool_idx
  on public.meteora_wallet_positions (wallet, pool, created_at desc);

comment on table public.meteora_wallet_positions is
  'Cached per-position PnL rows per wallet and pool, including position addresses.';

alter table public.meteora_wallet_positions enable row level security;

drop policy if exists meteora_wallet_positions_select_authenticated
  on public.meteora_wallet_positions;
create policy meteora_wallet_positions_select_authenticated
  on public.meteora_wallet_positions
  for select to authenticated using (true);

drop policy if exists meteora_wallet_positions_insert_authenticated
  on public.meteora_wallet_positions;
create policy meteora_wallet_positions_insert_authenticated
  on public.meteora_wallet_positions
  for insert to authenticated with check (true);

drop policy if exists meteora_wallet_positions_update_authenticated
  on public.meteora_wallet_positions;
create policy meteora_wallet_positions_update_authenticated
  on public.meteora_wallet_positions
  for update to authenticated using (true) with check (true);
