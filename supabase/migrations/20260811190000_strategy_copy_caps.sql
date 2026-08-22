-- Strategy sizing / quote-side filters from classic copy UI.
-- Safe to re-run.

alter table public.copy_trading_strategies
  add column if not exists sol_side_only boolean not null default true,
  add column if not exists include_usdc_pools boolean not null default false,
  add column if not exists score_trades boolean not null default false;

comment on column public.copy_trading_strategies.sol_side_only is
  'When true, only copy deposits funded on the SOL/WSOL side (skip token-side entries).';
comment on column public.copy_trading_strategies.include_usdc_pools is
  'When true, also copy USDC-paired pools (may require SOL↔USDC swap).';
comment on column public.copy_trading_strategies.score_trades is
  'When true, size/skip based on trade score (honeypot/rug hard-blocks remain separate).';

-- Allow "no max size" via NULL (unlimited). Keep existing rows as-is.
alter table public.copy_trading_strategies
  alter column max_size_sol drop not null;

do $$
begin
  alter table public.copy_trading_strategies
    drop constraint if exists copy_trading_strategies_min_lte_max;
  alter table public.copy_trading_strategies
    add constraint copy_trading_strategies_min_lte_max
    check (
      max_size_sol is null
      or min_size_sol <= max_size_sol
    );
exception when others then null;
end $$;
