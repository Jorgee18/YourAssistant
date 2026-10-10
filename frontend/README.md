# YourAssistant PWA

## Local development

1. Apply all Supabase migrations in `../supabase/migrations/` in filename order before starting the backend.
2. Install and start the API in `../backend` with `npm install` and `npm run dev`.
3. In this directory, run `npm install` and `npm run dev`.
4. Open `http://localhost:5173`. Vite proxies `/api` requests to `http://localhost:3000` by default.
The development server disables the service worker; test Push with `npm run build` and
`npm run preview` over localhost, setting `VITE_API_BASE_URL=http://localhost:3000/api`
at build time if the API is on a separate port.

The Vite development server disables service workers. To test installation and Push,
build and preview the production PWA; set `VITE_API_BASE_URL=http://localhost:3000/api`
at build time or serve frontend and API from the same origin.

Set `VITE_API_BASE_URL` to the deployed API prefix when the PWA is hosted separately.
`VITE_API_PROXY_TARGET` only configures the local Vite development proxy.
For email changes, configure the Supabase Auth Site URL and allowed redirect URLs to
include the deployed PWA origin so confirmation links return to the application.

## Web Push

Push settings are in the profile page and subscriptions are per browser/device. Desktop
and Android require a supported browser and HTTPS (localhost is secure for development).
On iPhone/iPad, install the PWA with Safari's Share → Add to Home Screen and open the
installed app before enabling notifications; iOS 16.4+ does not provide Web Push to a
normal Safari tab. Reminder lead times can be set per reminder, including custom values
up to one year. Delivery is best-effort and can be delayed by the operating system. The
worker catches up missed notification times for up to 24 hours while the reminder stays
pending.

## Authentication and offline behavior

The current API returns an access token without a refresh endpoint. The PWA keeps the
token in `sessionStorage`; an expired token clears the session and returns the user to
login. The custom service worker precaches the application shell and handles Web Push.
Authenticated API requests and personal reminder/chat data are never cached offline.

## Supabase administrator bootstrap

Apply the SQL migration and follow `../supabase/README.md` to register the first
administrator. The administration page is unavailable until an administrator row is
added. Model options come from models installed on the Ollama server configured by the
backend.
