-- Optional slot columns for leader vs copy comparison (filled by backend later).
-- Safe to re-run.

alter table public.copy_trade_executions
  add column if not exists source_slot bigint,
  add column if not exists user_slot bigint;

comment on column public.copy_trade_executions.source_slot is
  'Solana slot of the leader (source) transaction.';
comment on column public.copy_trade_executions.user_slot is
  'Solana slot of the follower (copy) transaction.';
