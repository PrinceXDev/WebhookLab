# Webhook Signature Verification - Complete Guide

## 🎯 What Problem Does This Solve?

### The Security Risk
Without signature verification, anyone can send fake webhooks to your endpoint:

```
❌ Attacker sends fake webhook:
POST /hook/abc123
{
  "type": "payment_intent.succeeded",
  "amount": 1000000,
  "customer": "cus_attacker"
}

Your server processes it → Money credited to attacker! 💸
```

### The Solution
Signature verification ensures webhooks are authentic:

```
✅ Legitimate webhook from Stripe:
POST /hook/abc123
Headers: stripe-signature: t=1234567890,v1=abc123def...
Body: { "type": "payment_intent.succeeded", ... }

WebhookLab verifies signature → ✅ Verified badge
You process it with confidence! 🔒
```

## 🔐 How Signature Verification Works

### High-Level Flow

```
┌──────────────┐
│   Provider   │  (Stripe/GitHub/Shopify)
│  (e.g. Stripe)│
└──────┬───────┘
       │ 1. Event happens (payment succeeded)
       │
       ▼
┌──────────────────────────────────────┐
│  Provider computes signature:        │
│  HMAC-SHA256(secret, payload)        │
└──────┬───────────────────────────────┘
       │ 2. Sends webhook with signature header
       │
       ▼
┌──────────────────────────────────────┐
│      WebhookLab receives webhook     │
│      POST /hook/abc123               │
│      Header: stripe-signature        │
│      Body: {...}                     │
└──────┬───────────────────────────────┘
       │ 3. Auto-detect provider
       │
       ▼
┌──────────────────────────────────────┐
│  WebhookLab computes signature:      │
│  HMAC-SHA256(secret, payload)        │
└──────┬───────────────────────────────┘
       │ 4. Compare signatures
       │
       ▼
┌──────────────────────────────────────┐
│  Match? → ✅ Verified                │
│  No match? → ❌ Failed               │
│  No signature? → ⚠️ Warning          │
│  No secret? → 🔒 Configure           │
└──────┬───────────────────────────────┘
       │ 5. Store result & show badge
       │
       ▼
┌──────────────────────────────────────┐
│      Display in Dashboard            │
│  [POST] [✅ Verified 💳] abc123      │
└──────────────────────────────────────┘
```

## 🛠️ Provider-Specific Implementation

### Stripe Signature Verification

**Header Format**:
```
stripe-signature: t=1234567890,v1=abc123def456...
```

**Algorithm**:
```typescript
// 1. Extract timestamp and signature
const timestamp = "1234567890";
const expectedSignature = "abc123def456...";

// 2. Construct signed payload
const signedPayload = `${timestamp}.${rawBody}`;

// 3. Compute HMAC-SHA256
const computedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(signedPayload, 'utf8')
  .digest('hex');

// 4. Compare (timing-safe)
const isValid = crypto.timingSafeEqual(
  Buffer.from(expectedSignature),
  Buffer.from(computedSignature)
);

// 5. Check timestamp (prevent replay attacks)
const age = currentTime - timestamp;
if (age > 300) { // 5 minutes
  return { isValid: false, message: 'Timestamp too old' };
}
```

**Why Timestamp Matters**:
- Prevents replay attacks (attacker can't reuse old webhooks)
- 5-minute tolerance handles clock skew
- Stripe best practice

### GitHub Signature Verification

**Header Format**:
```
x-hub-signature-256: sha256=abc123def456...
```

**Algorithm**:
```typescript
// 1. Extract algorithm and signature
const [algorithm, expectedSignature] = signatureHeader.split('=');
// algorithm = "sha256"
// expectedSignature = "abc123def456..."

// 2. Compute HMAC (SHA256 or SHA1)
const computedSignature = crypto
  .createHmac(algorithm, webhookSecret)
  .update(rawBody, 'utf8')
  .digest('hex');

// 3. Compare (timing-safe)
const isValid = crypto.timingSafeEqual(
  Buffer.from(expectedSignature),
  Buffer.from(computedSignature)
);
```

**Legacy Support**:
- `x-hub-signature` uses SHA1 (deprecated but still supported)
- `x-hub-signature-256` uses SHA256 (recommended)
- WebhookLab supports both

### Shopify Signature Verification

**Header Format**:
```
x-shopify-hmac-sha256: ABC123def456+/=
```

**Algorithm**:
```typescript
// 1. Compute HMAC-SHA256
const computedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(rawBody, 'utf8')
  .digest('base64'); // Note: Base64, not hex!

// 2. Compare (timing-safe)
const isValid = crypto.timingSafeEqual(
  Buffer.from(signatureHeader),
  Buffer.from(computedSignature)
);
```

**Key Difference**: Shopify uses Base64 encoding instead of hex

## 🎨 UI Components

### Signature Badge

The badge shows verification status at a glance:

```tsx
<SignatureBadge verification={event.signatureVerification} />
```

**Badge States**:

1. **Verified** (Green with ShieldCheck icon)
   ```
   [✓ 💳 Verified (HMAC-SHA256)]
   ```

2. **Failed** (Red with ShieldX icon)
   ```
   [✗ 💳 Failed (HMAC-SHA256)]
   ```

3. **No Signature** (Yellow with ShieldAlert icon)
   ```
   [⚠ 💳 No Signature]
   ```

4. **No Secret** (Gray with ShieldQuestion icon)
   ```
   [? 💳 No Secret]
   ```

### Detailed Verification Info

When you expand an event, you see:

```
┌─ Signature Verification ──────────────┐
│ Provider:  STRIPE                      │
│ Status:    VERIFIED                    │
│ Algorithm: HMAC-SHA256                 │
│ Message:   Signature verified          │
└────────────────────────────────────────┘
```

## 🧪 Testing Examples

### Example 1: Valid Stripe Webhook

```powershell
.\scripts\test-signatures.ps1 `
  -Provider stripe `
  -Slug abc123 `
  -Secret whsec_test123
```

**Expected Result**:
- ✅ Green "Verified" badge
- Status: VERIFIED
- Algorithm: HMAC-SHA256

### Example 2: Invalid Secret (Wrong Secret)

```powershell
# Create endpoint with secret: "correct_secret"
# Send webhook with different secret: "wrong_secret"

.\scripts\test-signatures.ps1 `
  -Provider stripe `
  -Slug abc123 `
  -Secret wrong_secret
```

**Expected Result**:
- ❌ Red "Failed" badge
- Status: FAILED
- Message: "Signature mismatch"

### Example 3: No Secret Configured

```powershell
# Create endpoint WITHOUT webhook secret
# Send webhook with signature

.\scripts\test-signatures.ps1 `
  -Provider stripe `
  -Slug abc123 `
  -Secret any_secret
```

**Expected Result**:
- 🔒 Gray "No Secret" badge
- Status: MISSING_SECRET
- Message: "No secret configured for stripe verification"

### Example 4: No Signature Header

```powershell
# Send webhook without signature header
$payload = '{"test": "data"}' | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:4000/hook/abc123" `
  -Method POST `
  -ContentType "application/json" `
  -Body $payload
```

**Expected Result**:
- ⚠️ Yellow "No Signature" badge (if provider detected)
- OR no badge (if provider unknown)

## 🔍 Debugging Signature Verification

### Common Issues

#### 1. "Signature mismatch" Error

**Checklist**:
- [ ] Secret matches exactly (no extra spaces, correct case)
- [ ] Using raw body (not parsed/modified)
- [ ] Correct encoding (UTF-8)
- [ ] For Stripe: timestamp not expired (< 5 minutes)

**Debug Steps**:
```typescript
// Add logging to see what's being compared
logger.debug('Signature verification debug', {
  expectedSignature,
  computedSignature,
  bodyLength: rawBody.length,
  secret: secret.substring(0, 10) + '...' // Log prefix only!
});
```

#### 2. "Timestamp too old" (Stripe)

**Cause**: System clock skew or webhook delayed

**Solutions**:
- Check server time: `date`
- Sync system clock: `ntpdate` or Windows Time Service
- For testing, temporarily increase tolerance in code

#### 3. Body Encoding Issues

**Problem**: Body parsed before verification

**Solution**: Always get raw body first:
```typescript
// ❌ Wrong order
app.use(express.json()); // Parses body
app.post('/hook/:slug', verifySignature); // Raw body lost!

// ✅ Correct order
app.post('/hook/:slug', getRawBody, verifySignature);
```

## 📊 Monitoring & Alerts

### Log Examples

**Successful Verification**:
```
2026-03-31 10:30:45 [info] 📥 Webhook received
{
  "eventId": "abc123",
  "slug": "myendpoint",
  "provider": "stripe",
  "signatureStatus": "verified",
  "signatureValid": true
}
```

**Failed Verification**:
```
2026-03-31 10:30:45 [info] 📥 Webhook received
{
  "eventId": "xyz789",
  "slug": "myendpoint",
  "provider": "stripe",
  "signatureStatus": "failed",
  "signatureValid": false
}
```

### Metrics to Track

1. **Verification Success Rate**: `verified / total webhooks`
2. **Failed Verifications**: Alert if > 5% fail rate
3. **Missing Secrets**: Track endpoints without secrets configured
4. **Provider Distribution**: Which providers are most used

### Setting Up Alerts

```typescript
// Example: Alert on failed verification
if (signatureVerification.status === 'failed') {
  logger.error('⚠️ SECURITY ALERT: Webhook signature verification failed', {
    eventId: event.id,
    slug,
    provider: signatureVerification.provider,
    sourceIp: event.sourceIp,
  });
  
  // Send to monitoring service (Datadog, Sentry, etc.)
  // monitoringService.alert('webhook_signature_failed', { ... });
}
```

## 🚀 Production Deployment

### Environment Variables

```bash
# .env
NEXTAUTH_SECRET=your-nextauth-secret
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Webhook secrets are stored per-endpoint in the database
# Not as environment variables (more flexible)
```

### Security Checklist

- [ ] All endpoints have webhook secrets configured
- [ ] Secrets are rotated regularly (90 days)
- [ ] Failed verifications trigger alerts
- [ ] Logs are monitored for suspicious patterns
- [ ] Rate limiting enabled (prevent brute force)
- [ ] HTTPS enforced in production
- [ ] Secrets stored encrypted at rest (if using database)

### Performance Considerations

**Signature verification is fast**:
- HMAC-SHA256: ~0.1ms per webhook
- No external API calls
- Minimal CPU overhead

**Optimization**:
- Verification happens in-memory
- No database queries for verification
- Results cached with event data

## 📚 References

### Official Documentation
- [Stripe: Verify webhook signatures](https://stripe.com/docs/webhooks/signatures)
- [GitHub: Validating webhook deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- [Shopify: Verify webhooks](https://shopify.dev/docs/apps/build/webhooks/subscribe/https#step-5-verify-the-webhook)

### Security Standards
- [OWASP Webhook Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Webhook_Security_Cheat_Sheet.html)
- [RFC 2104: HMAC](https://www.ietf.org/rfc/rfc2104.txt)

### Related Concepts
- HMAC (Hash-based Message Authentication Code)
- Timing attacks and constant-time comparison
- Replay attack prevention
- Webhook security best practices
