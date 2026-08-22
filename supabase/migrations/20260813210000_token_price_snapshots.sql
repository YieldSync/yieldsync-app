-- Historical token prices at a point in time (Mobula price-at), used to value
-- position flows in SOL. Prices for a past timestamp never change, so a row is
-- written once and read forever. Safe to re-run.

create table if not exists public.token_price_snapshots (
  mint text not null,
  -- Unix seconds, floored to the bucket size used by the fetcher.
  ts bigint not null,
  price_usd numeric not null,
  symbol text,
  source text not null default 'mobula',
  -- Timestamp of the swap the price came from, when upstream reports it.
  swap_ts bigint,
  fetched_at timestamptz not null default now(),
  primary key (mint, ts)
);

create index if not exists token_price_snapshots_mint_idx
  on public.token_price_snapshots (mint, ts desc);

comment on table public.token_price_snapshots is
  'Cached historical USD prices per mint and unix second (Mobula price-at).';

alter table public.token_price_snapshots enable row level security;

drop policy if exists token_price_snapshots_select_authenticated on public.token_price_snapshots;
create policy token_price_snapshots_select_authenticated
  on public.token_price_snapshots
  for select
  to authenticated
  using (true);

drop policy if exists token_price_snapshots_insert_authenticated on public.token_price_snapshots;
create policy token_price_snapshots_insert_authenticated
  on public.token_price_snapshots
  for insert
  to authenticated
  with check (true);

drop policy if exists token_price_snapshots_update_authenticated on public.token_price_snapshots;
create policy token_price_snapshots_update_authenticated
  on public.token_price_snapshots
  for update
  to authenticated
  using (true)
  with check (true);
