# YourAssistant

Asistente personal en PWA: chat con un LLM local (Ollama), recordatorios con notificaciones push y panel de administración.

## Arquitectura

- **Frontend** (`frontend/`): React 19 + Vite + Tailwind + Service Worker (PWA). En desarrollo proxea `/api` a `http://localhost:3000`; para desplegar en Vercel conserva `frontend/vercel.json`.
- **Backend** (`backend/`): API Express (Node ES modules) en el puerto 3000. Autenticación con Supabase Auth, datos en Supabase (PostgreSQL) y generación vía Ollama.
- **Worker** (`backend/src/workers/push-dispatcher.js`): proceso independiente que encola y envía las notificaciones Web Push vencidas.
- **Supabase** (`supabase/migrations/`): esquema de la base de datos (settings del asistente, recordatorios, suscripciones push y entregas).
- **Ollama**: modelo LLM local (`qwen2.5:3b` por defecto, configurable por la tabla `assistant_settings`).

El backend, el worker y Ollama corren en tu máquina; la base de datos vive en Supabase (nube). No hay secretos en el repositorio: cada entorno copia su `.env` desde `.env.example`.

## Requisitos

- Node.js 24+ (probado con 24.21) y npm
- [Ollama](https://ollama.com) instalado y con el modelo descargado:

```bash
ollama pull qwen2.5:3b
```

- Un proyecto en [Supabase](https://supabase.com)

## Base de datos (Supabase)

1. Crea un proyecto en Supabase.
2. Aplica las migraciones de `supabase/migrations/` en orden (SQL Editor o CLI).
3. Copia la URL del proyecto y las claves (anon y service_role) desde *Project Settings → API*.

## Backend

```bash
cd backend
cp .env.example .env   # y completa los valores
npm install
npm run dev            # API en http://localhost:3000 (con --watch)
```

Variables de `backend/.env`:

| Variable | Descripción |
|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Clave pública (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service_role — solo servidor, nunca al frontend ni al repo |
| `OLLAMA_URL` | `http://localhost:11434` |
| `PORT` | `3000` |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Claves VAPID para Web Push (`node --input-type=module -e "import webPush from 'web-push'; console.log(webPush.generateVAPIDKeys())"`) |
| `PUSH_POLL_INTERVAL_MS` | Intervalo del worker (default `30000`) |

## Worker de notificaciones

```bash
cd backend
npm run worker         # o: pm2 start src/app.js --name api && pm2 start src/workers/push-dispatcher.js --name push-worker
```

## Frontend

```bash
cd frontend
cp .env.example .env   # opcional: en dev, /api se proxea a localhost:3000
npm install
npm run dev            # http://localhost:5173 (proxea /api → backend)
npm run build          # build de producción con PWA
```

Variables de `frontend/.env` (opcionales en local):

- `VITE_API_BASE_URL` (default `/api`)
- `VITE_API_PROXY_TARGET` (default `http://localhost:3000`)

## Pruebas

```bash
cd backend  && npm test   # node --test
cd frontend && npm test   # vitest
```

## Despliegue (opcional)

`frontend/vercel.json` proxea `/api/*` hacia el backend publicado (p. ej. con ngrok) y sirve el SPA. Si despliegas en Vercel, configura en el dashboard las variables de entorno que necesites y ajusta el destino del proxy a tu túnel/backend público.

## Seguridad

- `backend/.env` (service_role, VAPID) y `.env` de cualquier carpeta nunca se suben: ya están en `.gitignore`.
- La clave service_role solo se usa en el backend; el frontend trabaja con la clave anon y tokens de sesión.
