# Backend

## Web Push worker

Run the HTTP API and the delivery worker as separate persistent processes:

```sh
npm run dev
npm run worker
```

Generate one VAPID key pair from this directory and store the output in the backend
environment. Keep the same keys for the lifetime of existing subscriptions:

```sh
node --input-type=module -e "import webPush from 'web-push'; console.log(webPush.generateVAPIDKeys())"
```

Configure `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and
`VAPID_SUBJECT` in the backend environment only. Never put the service-role key or VAPID
private key in frontend variables. `PUSH_POLL_INTERVAL_MS` controls the worker poll
interval and defaults to 30 seconds.

Apply the new Web Push Supabase migration before starting the worker. It stores reminder
lead times as minutes (`0` means at the reminder time; maximum is 365 days). The worker
only notifies reminders still marked `pending`, retries transient delivery errors, and
accepts late delivery for up to 24 hours after the calculated notification time. Run one
worker process continuously beside the API; database leases prevent two worker
instances from claiming the same delivery concurrently.
