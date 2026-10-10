begin;

do $$
declare
  status_attnum smallint;
  status_constraint record;
  unsupported_statuses text;
begin
  if to_regclass('public.reminders') is null then
    raise exception 'Expected public.reminders to exist before applying this migration';
  end if;

  select attnum
  into status_attnum
  from pg_attribute
  where attrelid = 'public.reminders'::regclass
    and attname = 'status'
    and not attisdropped;

  if status_attnum is null then
    raise exception 'Expected public.reminders.status to exist before applying this migration';
  end if;

  for status_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.reminders'::regclass
      and contype = 'c'
      and conkey = array[status_attnum]::smallint[]
  loop
    execute format('alter table public.reminders drop constraint %I', status_constraint.conname);
  end loop;

  alter table public.reminders alter column status drop default;
  alter table public.reminders alter column status type text using status::text;

  update public.reminders
  set status = case lower(btrim(status))
    when 'cancelado' then 'cancelled'
    when 'cancelled' then 'cancelled'
    when 'canceled' then 'cancelled'
    when 'completado' then 'completed'
    when 'complete' then 'completed'
    when 'done' then 'completed'
    when 'pending' then 'pending'
    else status
  end;

  update public.reminders set status = 'pending' where status is null;

  select string_agg(distinct status, ', ')
  into unsupported_statuses
  from public.reminders
  where status not in ('pending', 'completed', 'cancelled');

  if unsupported_statuses is not null then
    raise exception 'Unsupported existing reminder statuses: %', unsupported_statuses;
  end if;

  alter table public.reminders alter column status set default 'pending';
  alter table public.reminders alter column status set not null;
  alter table public.reminders
    add constraint reminders_status_allowed_check
    check (status in ('pending', 'completed', 'cancelled'));
end;
$$;

create table if not exists public.administrators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.assistant_settings (
  id smallint primary key default 1 check (id = 1),
  active_model text not null default 'qwen2.5:3b',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.assistant_settings (id, active_model)
values (1, 'qwen2.5:3b')
on conflict (id) do nothing;

alter table public.administrators enable row level security;
alter table public.assistant_settings enable row level security;
alter table public.reminders enable row level security;

revoke all on public.administrators from anon;
revoke all on public.assistant_settings from anon;
revoke all on public.reminders from anon;
grant select on public.administrators to authenticated;
grant select on public.assistant_settings to authenticated;
grant update (active_model, updated_at, updated_by) on public.assistant_settings to authenticated;
grant select, insert, update, delete on public.reminders to authenticated;

drop policy if exists administrators_read_self on public.administrators;
create policy administrators_read_self
  on public.administrators
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists assistant_settings_read_authenticated on public.assistant_settings;
create policy assistant_settings_read_authenticated
  on public.assistant_settings
  for select
  to authenticated
  using (true);

drop policy if exists assistant_settings_update_admin on public.assistant_settings;
create policy assistant_settings_update_admin
  on public.assistant_settings
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.administrators
      where user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.administrators
      where user_id = (select auth.uid())
    )
    and updated_by = (select auth.uid())
  );

drop policy if exists reminders_owner_access on public.reminders;
create policy reminders_owner_access
  on public.reminders
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists reminders_owner_enforcement on public.reminders;
create policy reminders_owner_enforcement
  on public.reminders
  as restrictive
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

commit;
