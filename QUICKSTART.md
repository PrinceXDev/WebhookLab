# 5-Minute Quickstart

## Prerequisites Checklist

- [ ] Docker Desktop installed and running
- [ ] GitHub OAuth credentials ready
- [ ] Terminal open in the project root

---

## Step 1: Configure Credentials (2 minutes)

### Generate NextAuth Secret

```bash
# Run this command:
openssl rand -base64 32
```

Copy the output.

### Edit Environment File

Open `apps/web/.env.local` and replace:

```bash
NEXTAUTH_SECRET=paste-your-generated-secret-here
GITHUB_CLIENT_ID=paste-your-github-client-id
GITHUB_CLIENT_SECRET=paste-your-github-client-secret
```

---

## Step 2: Install & Start (3 minutes)

```bash
# Install dependencies (2-3 minutes)
pnpm install

# Start Docker (PostgreSQL + Redis)
pnpm docker:up

# Wait 10 seconds for PostgreSQL to fully start
# Then create database tables
pnpm db:init

# Start dev servers
pnpm dev
```

---

## Step 3: Test It!

### Open the Dashboard

Go to http://localhost:3000/dashboard

### Create an Endpoint

1. Click "New Endpoint"
2. Name: "My First Webhook"
3. Click "Create"
4. Copy the webhook URL

### Send a Test Webhook

```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:4000/hook/YOUR_SLUG" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"event": "test", "data": {"message": "Hello WebhookLab!"}}'
```

### Watch It Appear Live

The webhook should appear on your dashboard **instantly** with a green "Live" indicator.

---

## Verify Everything Works

- [ ] Frontend loads at http://localhost:3000
- [ ] Backend running at http://localhost:4000
- [ ] Docker containers running (`docker ps`)
- [ ] Can create endpoints
- [ ] Webhooks appear live (< 50ms)
- [ ] Can expand event details
- [ ] WebSocket shows "Live" status

---

## If Something Breaks

### Docker not starting

```bash
# Check if Docker Desktop is running
docker --version

# If containers fail to start
pnpm docker:down
pnpm docker:up
```

### Dependencies fail to install

```bash
# Clear cache and reinstall
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

### Database connection errors

```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Reset database
pnpm docker:down
pnpm docker:up
pnpm db:push
```

### WebSocket not connecting

1. Check backend logs — should say "WebSocket server ready"
2. Check browser console (F12) — should say "✅ WebSocket connected"
3. Refresh the page

---

## Next Steps

Once everything works:

1. Read `SETUP_GUIDE.md` for Day 1 learning tasks
2. Explore the codebase — start with `apps/server/src/index.ts`
3. Try sending different webhook payloads
4. Open Redis Insight and inspect the data structure

---

## Useful Commands

```bash
# View Docker logs
pnpm docker:logs

# Connect to Redis CLI
docker exec -it webhooklab-redis redis-cli

# Open Prisma Studio (database GUI)
pnpm db:studio

# Type check everything
pnpm type-check

# Stop everything
pnpm docker:down
# Press Ctrl+C in the terminal running pnpm dev
```

---

You're ready to build! 🚀
