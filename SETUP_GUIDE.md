# Phase 1 Setup Guide — Day by Day

This guide walks you through setting up and running WebhookLab for the first time.

---

## TODAY: Initial Setup (30 minutes)

### Step 1: Configure Your Credentials

Open `apps/web/.env.local` and replace these values:

```bash
# 1. Generate a NextAuth secret
# Run this command in your terminal:
openssl rand -base64 32

# Paste the output here:
NEXTAUTH_SECRET=paste-the-generated-secret-here

# 2. Paste your GitHub OAuth credentials from the screenshot you showed me:
GITHUB_CLIENT_ID=your-client-id-from-github
GITHUB_CLIENT_SECRET=your-client-secret-from-github
```

### Step 2: Install All Dependencies

```bash
pnpm install
```

This will take 2-3 minutes. It installs:
- Next.js, React, TypeScript
- Express, Socket.IO
- Redis client, Prisma
- All UI components (shadcn/ui)

### Step 3: Start Docker Services

```bash
pnpm docker:up
```

This starts PostgreSQL and Redis in containers. Verify:

```bash
docker ps
```

You should see:
- `webhooklab-postgres` on port 5432
- `webhooklab-redis` on port 6379

### Step 4: Create Database Tables

```bash
pnpm db:push
```

This creates all tables from the Prisma schema. You'll see:
```
✔ Generated Prisma Client
✔ Database synchronized
```

### Step 5: Start Development Servers

```bash
pnpm dev
```

This starts:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:4000

You should see:
```
✅ Redis connected
🚀 Server running on http://localhost:4000
🔌 WebSocket server ready
```

### Step 6: Test It!

1. Open http://localhost:3000 in your browser
2. Click "Get Started" → go to Dashboard
3. Click "New Endpoint" → create one named "Test"
4. Copy the webhook URL

5. Open a new terminal and send a test webhook:

```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:4000/hook/YOUR_SLUG_HERE" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"message": "Hello WebhookLab!", "timestamp": "2026-03-18T10:00:00Z"}'
```

6. **Watch it appear LIVE on your dashboard** in under 50ms!

---

## What You Just Built

| Component | What It Does |
|---|---|
| **Express Server** | Captures webhooks at `/hook/:slug`, stores in Redis, publishes to Socket.IO |
| **Redis Event Store** | Sorted set storing last 500 events per endpoint with 72-hour TTL |
| **WebSocket Server** | Pushes events to connected browsers in real-time via Socket.IO rooms |
| **Next.js Dashboard** | React UI showing endpoints and live event feed |
| **PostgreSQL** | Stores users, endpoints, and persistent event metadata |

---

## Understanding the Code

### Key Files to Study

1. **`apps/server/src/routes/webhook.ts`** — Webhook ingestion
   - Captures raw body (needed for signature verification later)
   - Stores in Redis sorted set
   - Publishes to Redis pub/sub channel

2. **`apps/server/src/redis/event-store.ts`** — Redis storage logic
   - `ZADD` with timestamp as score
   - `ZREMRANGEBYRANK` to trim to 500 events
   - `ZRANGE` to fetch recent events

3. **`apps/server/src/websocket/index.ts`** — WebSocket setup
   - Client subscribes to endpoint slug
   - Server joins Socket.IO room
   - Redis pub/sub → Socket.IO room broadcast

4. **`apps/web/src/hooks/use-websocket.ts`** — Client WebSocket hook
   - Connects to Socket.IO server
   - Subscribes to endpoint
   - Receives live events

5. **`apps/web/src/components/events/event-feed.tsx`** — Live event feed
   - Fetches historical events from API
   - Merges with live events from WebSocket
   - Shows connection status indicator

---

## Common Issues & Fixes

### "Cannot find module" errors

```bash
# Regenerate Prisma client
cd apps/server
pnpm prisma generate
cd ../..

# Reinstall dependencies
pnpm install
```

### Docker containers not starting

```bash
# Check if ports are already in use
netstat -ano | findstr :5432
netstat -ano | findstr :6379

# If something is using those ports, stop it or change ports in docker-compose.yml
```

### WebSocket not connecting

1. Check backend logs — should say "WebSocket server ready"
2. Check browser console — should say "✅ WebSocket connected"
3. Verify `NEXT_PUBLIC_WS_URL=http://localhost:4000` in `.env.local`

### TypeScript errors

```bash
# Run type check to see all errors
pnpm type-check

# Most errors are from missing dependencies
pnpm install
```

---

## Next: Day 1 Learning Tasks

Once everything is running, spend today understanding:

### 1. Docker Compose (30 minutes)

```bash
# View running containers
docker ps

# View logs
pnpm docker:logs

# Connect to Redis CLI
docker exec -it webhooklab-redis redis-cli

# Inside Redis CLI, try:
PING                    # Should return PONG
KEYS *                  # See all keys
ZRANGE webhook:test:events 0 -1  # See stored events
```

### 2. Redis Basics (1 hour)

Open Redis Insight (if you installed it) and connect to `localhost:6379`.

Try these commands in the CLI:

```bash
# Sorted Sets (how we store events)
ZADD test:events 1710756000 '{"id":"1","data":"event1"}'
ZADD test:events 1710756001 '{"id":"2","data":"event2"}'
ZRANGE test:events 0 -1          # Get all events
ZRANGE test:events 0 -1 REV      # Get all events (newest first)
ZCARD test:events                # Count events

# Pub/Sub (how we push to WebSocket)
SUBSCRIBE webhook:test           # In one terminal
PUBLISH webhook:test "hello"     # In another terminal
```

### 3. Express Middleware Chain (30 minutes)

Read `apps/server/src/routes/webhook.ts` line by line.

Key concepts:
- `Router()` creates a sub-router
- `router.use('/:slug', ...)` catches ALL HTTP methods
- `getRawBody()` reads the request stream before parsing
- `nanoid()` generates unique IDs

### 4. Socket.IO Rooms (30 minutes)

Read `apps/server/src/websocket/index.ts`.

Key concepts:
- `socket.join(room)` — client joins a room
- `io.to(room).emit(event, data)` — broadcast to all clients in room
- Redis pub/sub bridges webhook ingestion → Socket.IO

---

## Tomorrow: Day 2 Tasks

1. **Add request validation** — use Zod to validate webhook payloads
2. **Add error handling** — wrap routes in try/catch, return proper error codes
3. **Add logging** — use `console.log` with timestamps for debugging
4. **Test edge cases** — send malformed JSON, huge payloads, empty bodies

---

## Resources for Today

- [Docker Compose CLI Reference](https://docs.docker.com/compose/reference/)
- [Redis Sorted Sets Tutorial](https://redis.io/docs/data-types/sorted-sets/)
- [Express Routing Guide](https://expressjs.com/en/guide/routing.html)
- [Socket.IO Rooms Documentation](https://socket.io/docs/v4/rooms/)

---

## Questions to Explore

1. Why do we use a sorted set instead of a list in Redis?
2. What happens if 1000 webhooks arrive at the same time?
3. How does Redis pub/sub differ from Socket.IO rooms?
4. Why do we need to preserve the raw body for signature verification?

Explore the code, experiment, break things, and fix them. That's how you learn!
