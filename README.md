# WebhookLab

> The ngrok + Postman hybrid that actually understands webhooks

A real-time webhook inspector and replay engine with AI-powered payload analysis. Built with Next.js, Express, Redis, WebSocket, and Claude AI.

## Features

- **Real-time Dashboard**: Webhooks appear live via WebSocket in under 50ms
- **Unique Endpoints**: Generate unique URLs for each integration
- **Event Inspector**: Full headers, body, query params, and metadata
- **Replay Engine**: One-click replay of any captured webhook
- **Redis Event Store**: Last 500 events per endpoint with 72-hour TTL
- **AI Analysis** (Phase 2): Claude AI identifies webhook providers and suggests handlers

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | Express.js, Socket.IO, TypeScript |
| **Database** | PostgreSQL (via Prisma ORM) |
| **Cache** | Redis (event store, pub/sub, rate limiting) |
| **Real-time** | WebSocket (Socket.IO) |
| **AI** | Claude AI (Anthropic API) |
| **Monorepo** | pnpm workspaces + Turborepo |
| **Infrastructure** | Docker Compose (local), Vercel (frontend), Railway (backend) |

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

### 2. Set Up Environment Variables

**Backend** (`apps/server/.env`):
```bash
# Already created with default values
# You can leave it as-is for local development
```

**Frontend** (`apps/web/.env.local`):
```bash
# IMPORTANT: Replace these with your actual values!

# Generate a secret:
# Run: openssl rand -base64 32
NEXTAUTH_SECRET=your-generated-secret-here

# Paste your GitHub OAuth credentials:
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# API URLs (leave as-is for local dev)
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

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

---

## Phase 1 Learning Path

| Day | Focus | What You'll Build |
|---|---|---|
| **Day 1** | Docker, Redis basics | Start services, test Redis CLI |
| **Day 2** | Express + TypeScript | Webhook ingestion route |
| **Day 3** | Redis sorted sets | Event storage with TTL |
| **Day 4** | Socket.IO | Real-time push to dashboard |
| **Day 5** | Next.js App Router | Dashboard shell |
| **Day 6** | shadcn/ui components | Event list, inspector UI |
| **Day 7** | WebSocket client | Live event feed |
| **Day 8** | NextAuth.js | GitHub OAuth login |
| **Day 9** | Prisma ORM | Endpoint CRUD operations |
| **Day 10** | BullMQ | Replay engine with retry |
| **Day 11** | Webhook signatures | HMAC verification |
| **Day 12** | Polish | Filtering, search, pagination |

---

## Next Steps

1. **Fill in your environment variables** in `apps/web/.env.local`
2. **Run `pnpm install`** to install all dependencies
3. **Start Docker** with `pnpm docker:up`
4. **Push database schema** with `pnpm db:push`
5. **Start dev servers** with `pnpm dev`
6. **Test it** by creating an endpoint and sending a webhook

---

## Resources

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Redis Commands](https://redis.io/commands/)
- [Prisma Quickstart](https://www.prisma.io/docs/getting-started)
- [shadcn/ui Components](https://ui.shadcn.com/)

---

## License

MIT
