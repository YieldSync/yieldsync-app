-- Remove wallet list model — tracking wallets are flat per user.

drop function if exists public.ensure_wallet_bootstrap();

drop table if exists public.wallet_list_memberships cascade;
drop table if exists public.wallet_lists cascade;

-- Profile-only bootstrap (no lists).
create or replace function public.ensure_wallet_bootstrap()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  free_plan uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select id into free_plan from public.plans where name = 'free' limit 1;

  insert into public.user_profiles (id, plan_id)
  values (uid, free_plan)
  on conflict (id) do nothing;

  return uid;
end;
$$;

grant execute on function public.ensure_wallet_bootstrap() to authenticated;

-- Keep wallets RLS (idempotent)
alter table public.wallets enable row level security;

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
