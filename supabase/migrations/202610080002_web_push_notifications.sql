begin;

alter table public.reminders
  add column if not exists notification_offset_minutes integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.reminders'::regclass
      and conname = 'reminders_notification_offset_check'
  ) then
    alter table public.reminders
      add constraint reminders_notification_offset_check
      check (notification_offset_minutes between 0 and 525600) not valid;
  end if;
end;
$$;

do $$
declare
  reminder_date_type text;
begin
  select format_type(atttypid, atttypmod)
  into reminder_date_type
  from pg_attribute
  where attrelid = 'public.reminders'::regclass
    and attname = 'reminder_date'
    and not attisdropped;

  if reminder_date_type is distinct from 'timestamp with time zone' then
    raise exception 'Expected public.reminders.reminder_date to be timestamptz, found %', reminder_date_type;
  end if;
end;
$$;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  expiration_time timestamptz,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

create table if not exists public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  reminder_date timestamptz not null,
  notification_offset_minutes integer not null,
  delivery_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'retry', 'sent', 'cancelled', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  lease_until timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (reminder_id, reminder_date, subscription_id)
);

create index if not exists push_deliveries_ready_idx
  on public.push_deliveries (status, delivery_at, next_attempt_at);

alter table public.push_subscriptions enable row level security;
alter table public.push_deliveries enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
revoke all on public.push_deliveries from anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions to service_role;
grant select, insert, update, delete on public.push_deliveries to service_role;

create or replace function public.enqueue_due_push_deliveries(
  p_now timestamptz,
  p_grace_minutes integer,
  p_max_offset_minutes integer
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  affected_rows integer;
begin
  insert into public.push_deliveries (
    reminder_id,
    user_id,
    subscription_id,
    reminder_date,
    notification_offset_minutes,
    delivery_at
  )
  select
    reminders.id,
    reminders.user_id,
    subscriptions.id,
    reminders.reminder_date,
    reminders.notification_offset_minutes,
    reminders.reminder_date - make_interval(mins => reminders.notification_offset_minutes)
  from public.reminders as reminders
  join public.push_subscriptions as subscriptions
    on subscriptions.user_id = reminders.user_id
  where reminders.status = 'pending'
    and reminders.reminder_date >= p_now - make_interval(mins => p_grace_minutes)
    and reminders.reminder_date <= p_now + make_interval(mins => p_max_offset_minutes)
    and reminders.reminder_date - make_interval(mins => reminders.notification_offset_minutes)
      between p_now - make_interval(mins => p_grace_minutes) and p_now
  on conflict (reminder_id, reminder_date, subscription_id)
  do update set
    notification_offset_minutes = excluded.notification_offset_minutes,
    delivery_at = excluded.delivery_at,
    next_attempt_at = case
      when push_deliveries.notification_offset_minutes <> excluded.notification_offset_minutes
        then excluded.delivery_at
      else push_deliveries.next_attempt_at
    end,
    status = case
      when push_deliveries.status = 'cancelled' then 'pending'
      else push_deliveries.status
    end,
    last_error = case
      when push_deliveries.notification_offset_minutes <> excluded.notification_offset_minutes then null
      else push_deliveries.last_error
    end
  where push_deliveries.status in ('pending', 'retry', 'cancelled');

  get diagnostics affected_rows = row_count;
  return affected_rows;
end;
$$;

create or replace function public.claim_due_push_deliveries(
  p_now timestamptz,
  p_limit integer default 10,
  p_lease_seconds integer default 180
)
returns setof public.push_deliveries
language sql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  with candidates as (
    select id
    from public.push_deliveries
    where status in ('pending', 'retry')
      and delivery_at <= p_now
      and next_attempt_at <= p_now
    order by delivery_at
    for update skip locked
    limit greatest(1, least(p_limit, 250))
  )
  update public.push_deliveries as deliveries
  set status = 'sending',
      attempt_count = deliveries.attempt_count + 1,
      lease_until = p_now + make_interval(secs => p_lease_seconds)
  from candidates
  where deliveries.id = candidates.id
  returning deliveries.*;
$$;

create or replace function public.requeue_expired_push_deliveries(
  p_now timestamptz,
  p_max_attempts integer default 5
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  affected_rows integer;
begin
  update public.push_deliveries
  set status = case when attempt_count >= p_max_attempts then 'failed' else 'retry' end,
      next_attempt_at = p_now,
      lease_until = null,
      last_error = coalesce(last_error, 'Worker lease expired')
  where status = 'sending'
    and lease_until <= p_now;

  get diagnostics affected_rows = row_count;
  return affected_rows;
end;
$$;

revoke all on function public.enqueue_due_push_deliveries(timestamptz, integer, integer) from public, anon, authenticated;
revoke all on function public.claim_due_push_deliveries(timestamptz, integer, integer) from public, anon, authenticated;
revoke all on function public.requeue_expired_push_deliveries(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.enqueue_due_push_deliveries(timestamptz, integer, integer) to service_role;
grant execute on function public.claim_due_push_deliveries(timestamptz, integer, integer) to service_role;
grant execute on function public.requeue_expired_push_deliveries(timestamptz, integer) to service_role;

commit;
