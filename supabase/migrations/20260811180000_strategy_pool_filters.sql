-- Pool entry filters for copy strategies (Meteora pool metadata).
-- Safe to re-run.

alter table public.copy_trading_strategies
  add column if not exists min_pool_age_minutes integer,
  add column if not exists max_pool_age_minutes integer,
  add column if not exists skip_blacklisted boolean not null default true,
  add column if not exists require_freeze_authority_disabled boolean not null default true,
  add column if not exists require_verified boolean not null default false,
  add column if not exists min_holders integer,
  add column if not exists min_market_cap_usd numeric(24, 2),
  add column if not exists max_market_cap_usd numeric(24, 2),
  add column if not exists min_tvl_usd numeric(24, 2);

do $$
begin
  alter table public.copy_trading_strategies
    drop constraint if exists copy_trading_strategies_pool_age_check;
  alter table public.copy_trading_strategies
    add constraint copy_trading_strategies_pool_age_check
    check (
      min_pool_age_minutes is null
      or max_pool_age_minutes is null
      or min_pool_age_minutes <= max_pool_age_minutes
    );

  alter table public.copy_trading_strategies
    drop constraint if exists copy_trading_strategies_min_holders_check;
  alter table public.copy_trading_strategies
    add constraint copy_trading_strategies_min_holders_check
    check (min_holders is null or min_holders >= 0);

  alter table public.copy_trading_strategies
    drop constraint if exists copy_trading_strategies_market_cap_check;
  alter table public.copy_trading_strategies
    add constraint copy_trading_strategies_market_cap_check
    check (
      min_market_cap_usd is null
      or max_market_cap_usd is null
      or min_market_cap_usd <= max_market_cap_usd
    );

  alter table public.copy_trading_strategies
    drop constraint if exists copy_trading_strategies_min_tvl_check;
  alter table public.copy_trading_strategies
    add constraint copy_trading_strategies_min_tvl_check
    check (min_tvl_usd is null or min_tvl_usd >= 0);
exception when others then null;
end $$;

comment on column public.copy_trading_strategies.min_pool_age_minutes is
  'Skip opens if pool is younger than this many minutes (null = no min).';
comment on column public.copy_trading_strategies.max_pool_age_minutes is
  'Skip opens if pool is older than this many minutes (null = no max).';
comment on column public.copy_trading_strategies.skip_blacklisted is
  'When true, skip pools/tokens marked is_blacklisted.';
comment on column public.copy_trading_strategies.require_freeze_authority_disabled is
  'When true, only enter if freeze_authority_disabled is true on both sides.';
comment on column public.copy_trading_strategies.require_verified is
  'When true, require is_verified on the non-SOL token (default false).';
comment on column public.copy_trading_strategies.min_holders is
  'Minimum holders on the non-SOL token (null = no filter).';
comment on column public.copy_trading_strategies.min_market_cap_usd is
  'Minimum token market cap in USD (null = no filter).';
comment on column public.copy_trading_strategies.max_market_cap_usd is
  'Maximum token market cap in USD (null = no filter).';
comment on column public.copy_trading_strategies.min_tvl_usd is
  'Minimum pool TVL in USD (null = no filter).';
