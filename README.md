# WebhookLab

> The ngrok + Postman hybrid that actually understands webhooks

A real-time webhook inspector and replay engine with AI-powered payload analysis. Built with Next.js, Express, Redis, WebSocket, and Claude AI.

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
| **Database**       | PostgreSQL (via Prisma ORM)                                            |
| **Cache**          | Redis (event store, pub/sub, rate limiting)                            |
| **Real-time**      | WebSocket (Socket.IO)                                                  |
| **AI**             | Claude AI (Anthropic API)                                              |
| **Monorepo**       | pnpm workspaces + Turborepo                                            |
| **Infrastructure** | Docker Compose (local), Vercel (frontend), Railway (backend)           |

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
│       │   └── lib/            # Prisma client
│       ├── prisma/
│       │   └── schema.prisma   # Database schema
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

### Prisma errors

```bash
# Regenerate Prisma client
cd apps/server
pnpm prisma generate

# Reset database
pnpm prisma db push --force-reset
```

## Next Steps

1. **Fill in your environment variables** in `apps/web/.env.local`
2. **Run `pnpm install`** to install all dependencies
3. **Start Docker** with `pnpm docker:up`
4. **Push database schema** with `pnpm db:push`
5. **Start dev servers** with `pnpm dev`
6. **Test it** by creating an endpoint and sending a webhook
