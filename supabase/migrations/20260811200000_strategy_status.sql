-- Strategy lifecycle: draft | active | paused
-- Safe to re-run.

alter table public.copy_trading_strategies
  add column if not exists status text;

update public.copy_trading_strategies
set status = case
  when coalesce(enabled, false) then 'active'
  else 'paused'
end
where status is null or status = '';

alter table public.copy_trading_strategies
  alter column status set default 'draft';

update public.copy_trading_strategies
set status = 'draft'
where status is null;

alter table public.copy_trading_strategies
  alter column status set not null;

do $$
begin
  alter table public.copy_trading_strategies
    drop constraint if exists copy_trading_strategies_status_check;
  alter table public.copy_trading_strategies
    add constraint copy_trading_strategies_status_check
    check (status in ('draft', 'active', 'paused'));
exception when others then null;
end $$;

comment on column public.copy_trading_strategies.status is
  'draft = saved but not running; active = copying; paused = stopped by user.';
