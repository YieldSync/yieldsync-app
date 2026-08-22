-- Cache for the Meteora DLMM portfolio API (pool-aggregated wallet positions),
-- the per-position event history, and the position addresses we recover from
-- our own chain extraction. Safe to re-run.

-- One row per (wallet, mode, pool). `rank` keeps the upstream ordering so the
-- UI can slice arbitrary pages out of the cache without refetching.
create table if not exists public.meteora_wallet_pools (
  wallet text not null,
  -- 'open' = /portfolio/open, 'closed' = /portfolio (history)
  mode text not null,
  pool text not null,
  rank integer not null default 0,
  source_page integer not null default 1,
  token_x_mint text,
  token_y_mint text,
  token_x_symbol text,
  token_y_symbol text,
  token_x_icon text,
  token_y_icon text,
  bin_step numeric,
  base_fee numeric,
  collect_fee_mode integer,
  open_position_count integer,
  list_positions text[],
  balances_sol numeric,
  balances_usd numeric,
  unclaimed_fees_sol numeric,
  unclaimed_fees_usd numeric,
  total_deposit_sol numeric,
  total_deposit_usd numeric,
  total_withdrawal_sol numeric,
  total_withdrawal_usd numeric,
  total_fee_sol numeric,
  total_fee_usd numeric,
  pnl_sol numeric,
  pnl_usd numeric,
  pnl_pct numeric,
  pnl_sol_pct numeric,
  fee_per_tvl_24h numeric,
  out_of_range boolean,
  last_closed_at bigint,
  raw jsonb,
  fetched_at timestamptz not null default now(),
  primary key (wallet, mode, pool)
);

create index if not exists meteora_wallet_pools_rank_idx
  on public.meteora_wallet_pools (wallet, mode, rank);

comment on table public.meteora_wallet_pools is
  'Cached Meteora DLMM portfolio rows (pool aggregates) per wallet and mode.';

-- Page bookkeeping: which upstream pages we already pulled, plus the totals
-- the API reports for the whole wallet.
create table if not exists public.meteora_wallet_pages (
  wallet text not null,
  mode text not null,
  page integer not null,
  page_size integer not null default 20,
  has_next boolean not null default false,
  total_count integer,
  total_positions integer,
  sol_price numeric,
  summary jsonb,
  fetched_at timestamptz not null default now(),
  primary key (wallet, mode, page)
);

comment on table public.meteora_wallet_pages is
  'Fetch bookkeeping for the Meteora portfolio API (page -> totals, freshness).';

-- Per-position event history (/positions/<address>/historical).
create table if not exists public.meteora_position_events (
  position text not null,
  signature text not null,
  ix_index integer not null,
  event_type text not null,
  pool text,
  user_address text,
  block_time bigint,
  slot bigint,
  token_x text,
  token_y text,
  amount_x numeric,
  amount_y numeric,
  amount_x_usd numeric,
  amount_y_usd numeric,
  total_usd numeric,
  fetched_at timestamptz not null default now(),
  primary key (position, signature, ix_index)
);

create index if not exists meteora_position_events_pool_idx
  on public.meteora_position_events (pool, block_time desc);

comment on table public.meteora_position_events is
  'Cached Meteora position event history, loaded on demand when a row expands.';

-- Closed positions have no address in the portfolio API, so we recover it from
-- our own transaction extraction and keep the mapping here.
create table if not exists public.wallet_position_index (
  wallet text not null,
  position text not null,
  pool text,
  protocol text,
  is_closed boolean not null default false,
  opened_at bigint,
  closed_at bigint,
  first_slot bigint,
  last_slot bigint,
  source text not null default 'extraction',
  updated_at timestamptz not null default now(),
  primary key (wallet, position)
);

create index if not exists wallet_position_index_pool_idx
  on public.wallet_position_index (wallet, pool, closed_at desc);

comment on table public.wallet_position_index is
  'Position addresses per wallet and pool, recovered from our own chain extraction.';

do $$
declare
  t text;
begin
  foreach t in array array[
    'meteora_wallet_pools',
    'meteora_wallet_pages',
    'meteora_position_events',
    'wallet_position_index'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_select_authenticated', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      t || '_select_authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_authenticated', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (true)',
      t || '_insert_authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_authenticated', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (true) with check (true)',
      t || '_update_authenticated', t);
  end loop;
end $$;
