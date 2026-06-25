# WebhookLab

> The ngrok + Postman hybrid that actually understands webhooks

A real-time webhook inspector and replay engine with AI-powered payload analysis. Built with Next.js, Express, Redis, WebSocket, and Claude AI.

**🚀 Live demo:** [webhook-lab-web.vercel.app](https://webhook-lab-web.vercel.app)

| Service       | Hosted on                          | URL                                       |
| ------------- | ---------------------------------- | ----------------------------------------- |
| **Frontend**  | Vercel                             | `https://webhook-lab-web.vercel.app`      |
| **Backend**   | Render (Docker web service)        | `https://webhooklab.onrender.com`         |
| **Database**  | Supabase (managed PostgreSQL)      | —                                         |
| **Redis**     | Render Key Value store             | —                                         |

## Features

- **GitHub OAuth Authentication**: Secure sign-in with NextAuth.js
- **User-Scoped Endpoints**: Each user manages their own webhook endpoints
- **Real-time Dashboard**: Webhooks appear live via WebSocket in under 50ms
- **Unique Endpoints**: Generate unique URLs for each integration
- **Event Inspector**: Full headers, body, query params, and metadata
- **Replay Engine**: One-click replay of any captured webhook
- **Redis Event Store**: Last 500 events per endpoint with 72-hour TTL
- **AI Analysis** (Phase 2): Claude AI identifies webhook providers and suggests handlers

---

## Tech Stack

| Layer              | Technology                                                             |
| ------------------ | ---------------------------------------------------------------------- |
| **Frontend**       | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend**        | Express.js, Socket.IO, TypeScript                                      |
| **Auth**           | NextAuth.js with GitHub OAuth                                          |
| **Database**       | PostgreSQL via Prisma ORM (Supabase in production)                     |
| **Cache**          | Redis (event store, pub/sub, rate limiting)                            |
| **Real-time**      | WebSocket (Socket.IO)                                                  |
| **AI**             | Claude AI (Anthropic API)                                              |
| **Monorepo**       | pnpm workspaces + Turborepo                                            |
| **Infrastructure** | Docker Compose (local) · Vercel (frontend) · Render (backend + Redis) · Supabase (Postgres) |

---

## Prerequisites

Before you start, make sure you have these installed:

- **Node.js** v18+ (you have v22.16.0 ✅)
- **pnpm** v8+ (you have v10.28.2 ✅)
- **Docker Desktop** (for PostgreSQL + Redis)
- **Git** (you have v2.42.0 ✅)

---

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up GitHub OAuth

Follow the detailed guide in [AUTH_SETUP.md](./AUTH_SETUP.md) to:

1. Create a GitHub OAuth application
2. Generate NEXTAUTH_SECRET
3. Configure environment variables

**Quick version:**

- Create OAuth app at https://github.com/settings/developers
- Set callback URL: `http://localhost:3000/api/auth/callback/github`
- Copy Client ID and Secret
- Generate secret: `openssl rand -base64 32`
- Update `apps/web/.env.local` and `apps/server/.env`

### 3. Start Docker Services

```bash
pnpm docker:up
```

This starts PostgreSQL and Redis in containers. Verify they're running:

```bash
docker ps
```

You should see `webhooklab-postgres` and `webhooklab-redis` containers.

### 4. Set Up Database

```bash
# Wait 10 seconds after starting Docker, then run:
pnpm db:init
```

This creates all database tables from the Prisma schema.

**Windows Note**: Due to Docker networking on Windows, we use a direct SQL script instead of `prisma db push`.

### 5. Start Development Servers

```bash
pnpm dev
```

This starts:

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:4000

---

## Project Structure

```
WebhookLab/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/            # App Router pages
│   │   │   ├── components/     # React components
│   │   │   └── hooks/          # Custom React hooks
│   │   └── package.json
│   │
│   └── server/                 # Express backend
│       ├── src/
│       │   ├── routes/         # API routes
│       │   ├── redis/          # Redis client & event store
│       │   ├── websocket/      # Socket.IO setup
│       │   └── lib/
│       └── package.json
│
├── packages/
│   └── shared/                 # Shared types & Zod schemas
│       └── src/
│           ├── schemas/        # Validation schemas
│           └── types/          # TypeScript types
│
├── docker-compose.yml          # PostgreSQL + Redis
├── pnpm-workspace.yaml         # Monorepo config
└── turbo.json                  # Turborepo pipeline
```

---

## How It Works

### 1. Webhook Ingestion Flow

```
Webhook Provider (Stripe, GitHub, etc.)
        │
        ▼
  POST /hook/:slug  (Express catches it)
        │
        ├──► Redis ZADD (store event in sorted set)      ~2ms
        │
        ├──► Redis PUBLISH (notify subscribers)          ~1ms
        │
        ▼
  Socket.IO Server (subscribed to Redis channel)
        │
        ▼
  socket.to(endpointRoom).emit('new-event')             ~5ms
        │
        ▼
  Browser Dashboard (live update via WebSocket)

  Total latency: < 50ms end-to-end
```

### 2. Redis Event Storage

- Events stored in **sorted sets** with timestamp as score
- Key format: `webhook:{endpointSlug}:events`
- Automatically trims to last 500 events per endpoint
- 72-hour TTL on the entire sorted set

### 3. WebSocket Real-time Push

- Client subscribes to endpoint: `socket.emit('subscribe', endpointSlug)`
- Server joins Socket.IO room: `endpoint:{endpointSlug}`
- Redis pub/sub bridges webhook ingestion → Socket.IO rooms
- Multiple clients can watch the same endpoint simultaneously

---

## API Endpoints

### Webhook Ingestion

```bash
# Any HTTP method works
POST http://localhost:4000/hook/{slug}
PUT http://localhost:4000/hook/{slug}
PATCH http://localhost:4000/hook/{slug}
DELETE http://localhost:4000/hook/{slug}
```

### REST API

```bash
# List all endpoints
GET /api/endpoints

# Create new endpoint
POST /api/endpoints
Body: { "name": "My Endpoint", "description": "..." }

# Get events for an endpoint
GET /api/endpoints/:slug/events?limit=50

# Get specific event
GET /api/endpoints/:slug/events/:eventId

# Delete endpoint
DELETE /api/endpoints/:id
```

---

## Testing Your Setup

### 1. Create an Endpoint

1. Go to http://localhost:3000/dashboard
2. Click "New Endpoint"
3. Name it "Test Endpoint"
4. Copy the generated URL

### 2. Send a Test Webhook

```bash
# Using curl
curl -X POST http://localhost:4000/hook/YOUR_SLUG_HERE \
  -H "Content-Type: application/json" \
  -d '{"test": "hello from webhook"}'

# Using PowerShell
Invoke-WebRequest -Uri "http://localhost:4000/hook/YOUR_SLUG_HERE" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"test": "hello from webhook"}'
```

### 3. Watch It Appear Live

The webhook should appear on your dashboard **instantly** (< 50ms).

---

## Development Commands

```bash
# Start everything
pnpm dev

# Start Docker services
pnpm docker:up

# Stop Docker services
pnpm docker:down

# View Docker logs
pnpm docker:logs

# Database commands
pnpm db:push          # Push schema changes
pnpm db:migrate       # Create migration
pnpm db:studio        # Open Prisma Studio (DB GUI)

# Type checking
pnpm type-check

# Linting
pnpm lint

# Build for production
pnpm build
```

---

## Deployment

The app is deployed across three platforms. The frontend and backend are on
different domains, which drives a few of the config choices below.

### Frontend → Vercel

Vercel builds the Next.js app from inside the monorepo.

- **Root Directory**: `apps/web` (so Next.js detection finds `next` in
  `apps/web/package.json`)
- **Include files outside root directory**: **ON** (needed to reach the
  workspace root and `packages/shared`)
- **Build config** lives in [`apps/web/vercel.json`](./apps/web/vercel.json):
  it `cd ../..` to the workspace root, builds `@webhooklab/shared`, runs
  `prisma generate`, then `next build`.
- **Env vars** (Production):

  | Variable               | Value / notes                                  |
  | ---------------------- | ---------------------------------------------- |
  | `GITHUB_CLIENT_ID`     | from the GitHub OAuth app                       |
  | `GITHUB_CLIENT_SECRET` | from the GitHub OAuth app                       |
  | `NEXTAUTH_URL`         | `https://webhook-lab-web.vercel.app`            |
  | `NEXTAUTH_SECRET`      | **must match the backend's value**              |
  | `NEXT_PUBLIC_API_URL`  | `https://webhooklab.onrender.com`               |
  | `NEXT_PUBLIC_WS_URL`   | `https://webhooklab.onrender.com`               |

- **GitHub OAuth callback URL** must be set to
  `https://webhook-lab-web.vercel.app/api/auth/callback/github`.

### Backend → Render

Deployed from [`render.yaml`](./render.yaml) as a Docker web service plus a
Render Key Value (Redis) store, both on the free plan. Set the `sync: false`
secrets in the Render dashboard:

| Variable          | Notes                                                          |
| ----------------- | ------------------------------------------------------------- |
| `DATABASE_URL`    | Supabase **pooled** URL (`:6543`, `?pgbouncer=true`)          |
| `DIRECT_URL`      | Supabase **direct** URL (`:5432`) — required by `migrate deploy` |
| `NEXTAUTH_SECRET` | **must match the frontend's value**                           |
| `CORS_ORIGIN`     | `https://webhook-lab-web.vercel.app` (exact, no trailing `/`) |
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL` | AI payload analysis |

`PORT` is injected by Render automatically — do not set it.

### Database → Supabase

Managed PostgreSQL. Prisma migrations are applied on each Render deploy via the
`preDeployCommand` (`prisma migrate deploy`).

### Cross-domain authentication

Because the frontend (`vercel.app`) and backend (`onrender.com`) are on
different registrable domains, the NextAuth session **cookie** is not sent to
the backend. Instead:

1. The frontend exposes [`/api/token`](./apps/web/src/app/api/token/route.ts),
   which returns the raw NextAuth JWT.
2. The API client ([`api-client.ts`](./apps/web/src/lib/api-client.ts)) attaches
   it as an `Authorization: Bearer <token>` header.
3. The backend decodes it with the **shared `NEXTAUTH_SECRET`**.

> ⚠️ `NEXTAUTH_SECRET` **must be identical on Vercel and Render**, or the backend
> cannot decode the token (you'll get `403 Invalid or expired token`).

---

## Troubleshooting

### Docker containers won't start

```bash
# Check if ports are in use
netstat -ano | findstr :5432
netstat -ano | findstr :6379

# Stop containers and remove volumes
pnpm docker:down
docker volume rm webhooklab_pgdata webhooklab_redisdata

# Start fresh
pnpm docker:up
```

### WebSocket not connecting

1. Check backend is running on port 4000
2. Check `NEXT_PUBLIC_WS_URL` in `apps/web/.env.local`
3. Check browser console for connection errors

### Production deployment issues

| Symptom                                                | Cause / fix                                                                                     |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Vercel: `No Next.js version detected`                  | Root Directory must be `apps/web` (where `next` lives)                                          |
| Vercel: build runs `cd apps/web && next build`         | A dashboard **Build Command override** is on; turn it off so `vercel.json` is used              |
| Vercel: `next build` exits 1, Prisma client missing    | `prisma generate` must run before `next build` (handled in `apps/web/vercel.json`)              |
| API preflight `OPTIONS → 500`                          | Backend `CORS_ORIGIN` missing/mismatched; set it to the exact frontend origin (no trailing `/`) |
| API `401 Unauthorized` while logged in                 | Cross-domain cookie isn't sent — the Bearer-token flow handles this; ensure you're logged in    |
| API `403 Invalid or expired token`                     | `NEXTAUTH_SECRET` differs between Vercel and Render — make them identical                        |

## Next Steps

1. **Fill in your environment variables** in `apps/web/.env.local`
2. **Run `pnpm install`** to install all dependencies
3. **Start Docker** with `pnpm docker:up`
4. **Initialize the database** with `pnpm db:init`
5. **Start dev servers** with `pnpm dev`
6. **Test it** by creating an endpoint and sending a webhook
