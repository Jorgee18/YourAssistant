# Supabase setup

Apply the SQL files in `migrations/` to the Supabase project before starting the API.
The migration expects the existing `public.reminders` table to contain a `status`
column. It standardizes that column to `pending`, `completed`, or `cancelled`, seeds
`assistant_settings` with the current model, creates the administrator registry, and
enforces owner-only RLS for reminders (including restrictive policies to constrain any
older permissive policies).

Apply `202610080002_web_push_notifications.sql` after the first migration. It adds a
per-reminder notification lead time (0 to 525600 minutes), private push subscriptions,
and an idempotent delivery queue. The queue tracks one delivery per reminder date and
device. A lead time of `0` sends at the scheduled time; the UI also offers presets and
custom minute/hour/day/week values. Push subscription data and queue functions are only
available to the backend service role; clients cannot query subscription endpoints or
encryption keys. The migration requires `public.reminders.reminder_date` to be
`timestamptz` and aborts if the existing column has a different type. The offset column
is added with a `0` default, and its range check is installed `NOT VALID` to avoid a
full-table validation scan; it still enforces the range on new or updated rows. The
migration is transactional and idempotent. It needs a brief metadata lock on
`public.reminders`, so run it once and do not start another copy while it is running.

If the SQL Editor appears stuck, run this read-only query in another tab to check for
active sessions or lock waits:

```sql
select
  pid,
  state,
  wait_event_type,
  wait_event,
  now() - query_start as duration,
  left(query, 500) as query
from pg_stat_activity
where datname = current_database()
  and pid <> pg_backend_pid()
  and state <> 'idle'
order by query_start;
```

If `wait_event_type` is `Lock`, another transaction is blocking the migration. Resolve
that session before retrying rather than launching concurrent copies.

After creating an account through the application, add its Auth user UUID as the first
administrator from the Supabase SQL Editor:

```sql
insert into public.administrators (user_id)
values ('REPLACE_WITH_AUTH_USER_UUID');
```

Only project owners/database operators should run this bootstrap statement. The API
does not expose insert, update, or delete operations for the administrator registry.

## Web Push setup

Generate one VAPID key pair for the deployment and keep it stable. Configure the backend
environment with `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, and
`SUPABASE_SERVICE_ROLE_KEY`. The service-role key and VAPID private key must never be
added to frontend variables or returned by the API. Run the API and the persistent
worker process together; start the worker with `npm run worker` from `backend/`.

On iOS/iPadOS 16.4 or newer, users must add YourAssistant to the Home Screen and open
that installed app before enabling push. Configure the Supabase Auth Site URL/redirects
and host the PWA over HTTPS in production.
