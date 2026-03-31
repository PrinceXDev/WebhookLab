# 🧪 Signature Verification Testing Guide

## Quick Start (3 Steps)

### Step 1: Start Your Services

```bash
# Terminal 1: Start Docker services (Redis + PostgreSQL)
pnpm docker:up

# Terminal 2: Start development servers
pnpm dev
```

Wait for servers to start:
- Backend: http://localhost:4000
- Frontend: http://localhost:3000

---

### Step 2: Create a Test Endpoint

1. Open browser: http://localhost:3000
2. Click **"New Endpoint"** button
3. Fill in the form:
   - **Name**: `Test Stripe Webhooks`
   - **Description**: `Testing signature verification`
   - **Webhook Secret**: `whsec_test123`
4. Click **"Create Endpoint"**
5. **Copy the slug** from the URL (e.g., `abc123xyz`)

---

### Step 3: Run Test Script

```bash
# Test Stripe webhook
node scripts/test-webhook-signature.js stripe abc123xyz whsec_test123

# You should see:
# 🧪 Testing Stripe webhook signature verification...
# 📝 Payload: {...}
# 🔐 Signature: t=1234567890,v1=abc123...
# 📤 Sending webhook to: http://localhost:4000/hook/abc123xyz
# ✅ Response (200): {...}
# 🔍 Signature Verification Result:
#    Provider: stripe
#    Status: verified
#    Valid: ✅
```

---

## 📋 Complete Testing Scenarios

### Test 1: Valid Stripe Signature ✅

```bash
# Create endpoint with secret: whsec_test123
node scripts/test-webhook-signature.js stripe abc123xyz whsec_test123
```

**Expected Result**:
- ✅ Green "Verified" badge in dashboard
- Status: `verified`
- Message: "Signature verified"

---

### Test 2: Valid GitHub Signature ✅

```bash
# Create endpoint with secret: github_secret_123
node scripts/test-webhook-signature.js github abc123xyz github_secret_123
```

**Expected Result**:
- ✅ Green "Verified" badge with 🐙 icon
- Algorithm: HMAC-SHA256
- Status: `verified`

---

### Test 3: Valid Shopify Signature ✅

```bash
# Create endpoint with secret: shopify_secret_123
node scripts/test-webhook-signature.js shopify abc123xyz shopify_secret_123
```

**Expected Result**:
- ✅ Green "Verified" badge with 🛍️ icon
- Algorithm: HMAC-SHA256
- Status: `verified`

---

### Test 4: Invalid Signature (Wrong Secret) ❌

```bash
# Create endpoint with secret: correct_secret
# Send webhook with different secret
node scripts/test-webhook-signature.js stripe abc123xyz wrong_secret
```

**Expected Result**:
- ❌ Red "Failed" badge
- Status: `failed`
- Message: "Signature mismatch"

---

### Test 5: Missing Secret 🔒

```bash
# Create endpoint WITHOUT webhook secret
# Then send webhook with any secret
node scripts/test-webhook-signature.js stripe abc123xyz any_secret
```

**Expected Result**:
- 🔒 Gray "No Secret" badge
- Status: `missing_secret`
- Message: "No secret configured for stripe verification"

---

### Test 6: No Signature Header ⚠️

```bash
# Send webhook without signature header using curl
curl -X POST http://localhost:4000/hook/abc123xyz \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

**Expected Result**:
- No badge (provider unknown) OR
- ⚠️ Yellow "No Signature" badge (if provider detected from other headers)

---

## 🎯 Advanced Testing

### Test with Custom URL

```bash
# Test against different server
node scripts/test-webhook-signature.js stripe abc123xyz whsec_test123 http://localhost:5000
```

### Test All Providers Sequentially

```bash
# Create one endpoint with secret: test_secret_123

# Test Stripe
node scripts/test-webhook-signature.js stripe abc123xyz test_secret_123

# Test GitHub
node scripts/test-webhook-signature.js github abc123xyz test_secret_123

# Test Shopify
node scripts/test-webhook-signature.js shopify abc123xyz test_secret_123
```

### Test Expired Timestamp (Stripe Only)

This is harder to test with the script since it generates current timestamps.
You'd need to modify the script or wait 5+ minutes and replay an old webhook.

---

## 🔍 Verifying Results

### In the Dashboard (Frontend)

1. Go to http://localhost:3000
2. Click on your endpoint
3. You should see events with badges:

```
┌────────────────────────────────────────────────────┐
│ Events (3)                            🟢 Live      │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ [POST] [✅ Verified 💳] abc123    now   [▼]│   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ [POST] [❌ Failed 💳] def456      1m    [▼]│   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ [POST] [🔒 No Secret 💳] ghi789   2m    [▼]│   │
│ └─────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
```

### In the Logs (Backend)

```bash
# View real-time logs
tail -f apps/server/logs/combined.log

# Search for verification results
grep "signatureStatus" apps/server/logs/combined.log

# Filter for failed verifications
grep "failed" apps/server/logs/combined.log
```

**Example Log Output**:
```json
{
  "timestamp": "2026-03-31 10:30:45",
  "level": "info",
  "message": "📥 Webhook received",
  "eventId": "abc123",
  "slug": "abc123xyz",
  "provider": "stripe",
  "signatureStatus": "verified",
  "signatureValid": true
}
```

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'crypto'"

**Solution**: The script uses ES modules. Make sure you're using Node.js 14+ and the script has the `.js` extension.

```bash
# Check Node version
node --version  # Should be v14 or higher

# Run with explicit module support
node --input-type=module scripts/test-webhook-signature.js stripe abc123 secret
```

---

### Issue: "Connection refused" or "ECONNREFUSED"

**Problem**: Backend server is not running.

**Solution**:
```bash
# Make sure Docker is running
pnpm docker:up

# Start the backend
pnpm dev

# Or start backend only
cd apps/server
pnpm dev
```

---

### Issue: "404 Not Found"

**Problem**: Wrong slug or endpoint doesn't exist.

**Solution**:
1. Check the slug is correct (copy from dashboard)
2. Verify endpoint exists in dashboard
3. Check the URL: `http://localhost:4000/hook/{slug}`

---

### Issue: Red "Failed" badge but secret is correct

**Possible Causes**:
1. **Typo in secret**: Double-check for extra spaces
2. **Wrong provider**: Make sure you're testing the right provider
3. **Body encoding**: Should be automatic, but check logs

**Debug**:
```bash
# Check logs for detailed error
tail -f apps/server/logs/combined.log | grep "signature"
```

---

### Issue: Gray "No Secret" badge

**Problem**: Webhook secret not configured in endpoint.

**Solution**:
1. Go to dashboard
2. Edit the endpoint
3. Add webhook secret
4. Save changes
5. Re-run test

---

## 📊 Test Results Checklist

Use this checklist to verify all scenarios work:

- [ ] ✅ Stripe valid signature → Green badge
- [ ] ✅ GitHub valid signature → Green badge
- [ ] ✅ Shopify valid signature → Green badge
- [ ] ❌ Invalid signature → Red badge
- [ ] 🔒 No secret configured → Gray badge
- [ ] ⚠️ No signature header → Yellow badge (or no badge)
- [ ] 📝 Logs show verification status
- [ ] 🔍 Expandable details show provider/algorithm/message
- [ ] ⚡ Real-time update via WebSocket (badge appears immediately)

---

## 🎬 Video Walkthrough (Text Version)

### Complete Test Flow

```bash
# 1. Start services
Terminal 1: pnpm docker:up
Terminal 2: pnpm dev

# 2. Create endpoint
Browser: http://localhost:3000
Click: "New Endpoint"
Enter: Name = "Test", Secret = "whsec_test123"
Copy: Slug = "abc123xyz"

# 3. Test valid signature
Terminal 3: node scripts/test-webhook-signature.js stripe abc123xyz whsec_test123
Result: ✅ Green badge appears in dashboard

# 4. Test invalid signature
Terminal 3: node scripts/test-webhook-signature.js stripe abc123xyz wrong_secret
Result: ❌ Red badge appears in dashboard

# 5. Test no secret
Browser: Create new endpoint WITHOUT secret, slug = "def456"
Terminal 3: node scripts/test-webhook-signature.js stripe def456 any_secret
Result: 🔒 Gray badge appears in dashboard

# 6. View details
Browser: Click on any event → Expand
See: Provider, Status, Algorithm, Message
```

---

## 🚀 Testing with Real Providers

### Stripe (Recommended for Testing)

1. **Get Test Secret**:
   - Go to https://dashboard.stripe.com/test/webhooks
   - Create webhook endpoint
   - Copy signing secret (starts with `whsec_test_`)

2. **Use Stripe CLI** (Alternative):
   ```bash
   # Install Stripe CLI
   stripe listen --forward-to http://localhost:4000/hook/abc123xyz
   
   # Trigger test event
   stripe trigger payment_intent.succeeded
   ```

3. **Expected**: Green badge with real Stripe webhook

---

### GitHub (Requires Repository)

1. **Setup**:
   - Go to your GitHub repo → Settings → Webhooks
   - Add webhook URL: `http://your-ngrok-url/hook/abc123xyz`
   - Set secret: `github_secret_123`
   - Select events: Pull requests

2. **Test**:
   - Open a PR in your repo
   - GitHub sends webhook
   - Check dashboard for green badge

---

### Shopify (Requires Store)

1. **Setup**:
   - Go to Shopify Admin → Settings → Notifications
   - Create webhook
   - Copy secret
   - Add URL: `http://your-ngrok-url/hook/abc123xyz`

2. **Test**:
   - Create test order
   - Shopify sends webhook
   - Check dashboard for green badge

---

## 💡 Pro Tips

### Tip 1: Use ngrok for Real Testing

```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 4000

# Use ngrok URL in provider settings
https://abc123.ngrok.io/hook/your-slug
```

### Tip 2: Monitor Logs in Real-Time

```bash
# Watch logs as webhooks arrive
tail -f apps/server/logs/combined.log | grep --color=always "Webhook received"
```

### Tip 3: Test Multiple Endpoints

```bash
# Create multiple endpoints with different secrets
# Test them all in sequence

for slug in abc123 def456 ghi789; do
  node scripts/test-webhook-signature.js stripe $slug whsec_test123
  sleep 2
done
```

### Tip 4: Verify in Database (Optional)

```bash
# Connect to PostgreSQL
docker exec -it webhooklab-postgres psql -U webhooklab -d webhooklab

# Check webhook events
SELECT id, signature_status FROM webhook_events ORDER BY received_at DESC LIMIT 5;
```

---

## 📚 Additional Resources

- **Quick Reference**: `SIGNATURE_QUICK_REF.md`
- **Setup Guide**: `SIGNATURE_VERIFICATION.md`
- **How It Works**: `docs/how-signature-verification-works.md`
- **Provider Comparison**: `docs/provider-comparison.md`

---

## ✅ Success Criteria

Your signature verification is working correctly when:

1. ✅ Test script runs without errors
2. ✅ Green badge appears for valid signatures
3. ❌ Red badge appears for invalid signatures
4. 🔒 Gray badge appears when secret is missing
5. 📝 Logs show verification status
6. 🔍 Expandable details show correct information
7. ⚡ Badges appear in real-time (< 1 second)

---

## 🎉 You're Ready!

Now you can:
- Test signature verification locally
- Debug signature issues
- Verify all providers work correctly
- Test with real webhooks from providers

**Happy Testing!** 🚀
