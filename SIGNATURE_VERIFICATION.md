# Webhook Signature Verification

## Overview

WebhookLab automatically detects and verifies webhook signatures from major providers (Stripe, GitHub, Shopify) to ensure webhook authenticity and prevent replay attacks.

## Supported Providers

### 1. Stripe
- **Header**: `stripe-signature`
- **Format**: `t=timestamp,v1=signature`
- **Algorithm**: HMAC-SHA256
- **Verification**: 
  - Constructs signed payload: `{timestamp}.{rawBody}`
  - Computes HMAC-SHA256 with webhook secret
  - Validates timestamp (max 5 minutes old)
  - Uses timing-safe comparison

### 2. GitHub
- **Header**: `x-hub-signature-256` (preferred) or `x-hub-signature` (legacy)
- **Format**: `sha256=signature` or `sha1=signature`
- **Algorithm**: HMAC-SHA256 or HMAC-SHA1
- **Verification**:
  - Computes HMAC with webhook secret
  - Uses timing-safe comparison

### 3. Shopify
- **Header**: `x-shopify-hmac-sha256`
- **Format**: Base64-encoded HMAC-SHA256
- **Algorithm**: HMAC-SHA256
- **Verification**:
  - Computes HMAC-SHA256 with webhook secret
  - Base64 encodes the result
  - Uses timing-safe comparison

## How It Works

### 1. Auto-Detection
The system automatically detects the webhook provider by:
- Checking for provider-specific signature headers
- Analyzing User-Agent headers
- Pattern matching on header combinations

### 2. Verification Process
```
Webhook Received
    ↓
Detect Provider (Stripe/GitHub/Shopify)
    ↓
Check for Signature Header
    ↓
Get Endpoint's Webhook Secret
    ↓
Compute Expected Signature
    ↓
Timing-Safe Comparison
    ↓
Return Verification Result
```

### 3. Verification Statuses

| Status | Description | Badge Color |
|--------|-------------|-------------|
| `verified` | Signature is valid | Green ✅ |
| `failed` | Signature mismatch | Red ❌ |
| `missing_signature` | No signature header found | Yellow ⚠️ |
| `missing_secret` | No webhook secret configured | Gray 🔒 |
| `not_applicable` | Provider not supported | None |

## Setup Instructions

### For Stripe Webhooks

1. **Get Your Webhook Secret**:
   - Go to Stripe Dashboard → Developers → Webhooks
   - Create or select a webhook endpoint
   - Copy the signing secret (starts with `whsec_...`)

2. **Configure in WebhookLab**:
   - Create a new endpoint
   - Paste the Stripe signing secret in "Webhook Secret" field
   - Copy your WebhookLab endpoint URL
   - Add it to Stripe webhook endpoints

3. **Test**:
   ```bash
   # Stripe will send webhooks with stripe-signature header
   # WebhookLab will automatically verify and show a green badge
   ```

### For GitHub Webhooks

1. **Get Your Webhook Secret**:
   - Go to GitHub → Repository → Settings → Webhooks
   - Create or edit a webhook
   - Set a secret (any random string)

2. **Configure in WebhookLab**:
   - Create a new endpoint
   - Use the same secret in "Webhook Secret" field
   - Copy your WebhookLab endpoint URL
   - Add it to GitHub webhook URL

3. **Test**:
   ```bash
   # GitHub will send webhooks with x-hub-signature-256 header
   # WebhookLab will automatically verify and show a green badge
   ```

### For Shopify Webhooks

1. **Get Your Webhook Secret**:
   - Go to Shopify Admin → Settings → Notifications
   - Scroll to Webhooks section
   - The secret is shown when you create a webhook

2. **Configure in WebhookLab**:
   - Create a new endpoint
   - Paste the Shopify secret in "Webhook Secret" field
   - Copy your WebhookLab endpoint URL
   - Add it to Shopify webhook URL

3. **Test**:
   ```bash
   # Shopify will send webhooks with x-shopify-hmac-sha256 header
   # WebhookLab will automatically verify and show a green badge
   ```

## Testing Signature Verification

### Test Stripe Webhook (PowerShell)

```powershell
$slug = "your-endpoint-slug"
$secret = "whsec_your_stripe_secret"
$timestamp = [int][double]::Parse((Get-Date -UFormat %s))

$payload = @{
  id = "evt_test_webhook"
  object = "event"
  type = "payment_intent.succeeded"
  data = @{
    object = @{
      id = "pi_test"
      amount = 5000
      currency = "usd"
      status = "succeeded"
    }
  }
  created = $timestamp
} | ConvertTo-Json -Depth 10

# Compute signature (requires OpenSSL or similar)
$signedPayload = "$timestamp.$payload"
$hmac = [System.Security.Cryptography.HMACSHA256]::new([System.Text.Encoding]::UTF8.GetBytes($secret))
$hash = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($signedPayload))
$signature = [System.BitConverter]::ToString($hash).Replace("-", "").ToLower()

Invoke-WebRequest -Uri "http://localhost:4000/hook/$slug" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{"stripe-signature" = "t=$timestamp,v1=$signature"} `
  -Body $payload
```

### Test GitHub Webhook (PowerShell)

```powershell
$slug = "your-endpoint-slug"
$secret = "your_github_secret"

$payload = @{
  action = "opened"
  number = 123
  pull_request = @{
    title = "Test PR"
    state = "open"
  }
} | ConvertTo-Json -Depth 10

# Compute signature
$hmac = [System.Security.Cryptography.HMACSHA256]::new([System.Text.Encoding]::UTF8.GetBytes($secret))
$hash = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($payload))
$signature = [System.BitConverter]::ToString($hash).Replace("-", "").ToLower()

Invoke-WebRequest -Uri "http://localhost:4000/hook/$slug" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{
    "x-hub-signature-256" = "sha256=$signature"
    "x-github-event" = "pull_request"
  } `
  -Body $payload
```

### Test Shopify Webhook (PowerShell)

```powershell
$slug = "your-endpoint-slug"
$secret = "your_shopify_secret"

$payload = @{
  id = 123456789
  email = "customer@example.com"
  total_price = "99.99"
} | ConvertTo-Json -Depth 10

# Compute signature
$hmac = [System.Security.Cryptography.HMACSHA256]::new([System.Text.Encoding]::UTF8.GetBytes($secret))
$hash = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($payload))
$signature = [Convert]::ToBase64String($hash)

Invoke-WebRequest -Uri "http://localhost:4000/hook/$slug" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{"x-shopify-hmac-sha256" = $signature} `
  -Body $payload
```

## Security Best Practices

### 1. Always Verify Signatures in Production
```typescript
// ❌ BAD: Processing webhook without verification
app.post('/webhook', (req, res) => {
  processPayment(req.body); // Vulnerable to attacks!
});

// ✅ GOOD: Verify before processing
app.post('/webhook', (req, res) => {
  const verification = verifyWebhookSignature(req.headers, req.body, secret);
  if (!verification.isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  processPayment(req.body);
});
```

### 2. Rotate Secrets Regularly
- Rotate webhook secrets every 90 days
- Use different secrets for different environments (dev/staging/prod)
- Store secrets in environment variables, never in code

### 3. Timestamp Validation
Stripe webhooks include timestamps to prevent replay attacks:
- Webhooks older than 5 minutes are rejected
- Protects against replay attacks
- Ensures webhook freshness

### 4. Use Raw Body
**CRITICAL**: Signature verification requires the raw request body:
```typescript
// ❌ BAD: Body parsing middleware corrupts the raw body
app.use(express.json()); // This parses the body!
app.post('/webhook', verifySignature); // Will fail!

// ✅ GOOD: Get raw body before parsing
app.post('/webhook', getRawBody, verifySignature);
```

### 5. Timing-Safe Comparison
Always use `crypto.timingSafeEqual()` to prevent timing attacks:
```typescript
// ❌ BAD: Vulnerable to timing attacks
if (expectedSignature === computedSignature) { ... }

// ✅ GOOD: Timing-safe comparison
if (crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(computedSignature))) { ... }
```

## UI Features

### Signature Badge
Each webhook event displays a signature verification badge:

- **Green Badge** (✅ Verified): Signature is valid
- **Red Badge** (❌ Failed): Signature mismatch
- **Yellow Badge** (⚠️ No Signature): Provider detected but no signature header
- **Gray Badge** (🔒 No Secret): Signature present but no secret configured

### Detailed View
Expand any event to see:
- Provider name (Stripe, GitHub, Shopify)
- Verification status
- Algorithm used (HMAC-SHA256, HMAC-SHA1)
- Detailed error message if verification failed

## API Response

When a webhook is received, the response includes verification details:

```json
{
  "success": true,
  "message": "Webhook received",
  "eventId": "abc123",
  "timestamp": 1234567890,
  "signatureVerification": {
    "provider": "stripe",
    "status": "verified",
    "isValid": true
  }
}
```

## Troubleshooting

### "Signature Failed" Badge

**Possible causes:**
1. **Wrong secret**: Double-check the secret matches your provider's configuration
2. **Body modification**: Ensure raw body is used (no parsing middleware)
3. **Encoding issues**: Body must be UTF-8 encoded
4. **Timestamp expired**: Stripe webhooks older than 5 minutes are rejected

### "Missing Secret" Badge

**Solution**: 
1. Edit the endpoint
2. Add the webhook secret from your provider
3. Save changes

### "No Signature" Badge

**Possible causes:**
1. Provider doesn't send signatures (not all webhooks support it)
2. Webhook is from a test tool (curl, Postman) without signature headers
3. Provider configuration is incomplete

## Provider-Specific Notes

### Stripe
- Signing secret format: `whsec_...`
- Get from: Dashboard → Developers → Webhooks → Signing secret
- Includes timestamp validation (5-minute tolerance)
- Test mode has different secrets than live mode

### GitHub
- Secret is any string you choose
- Set in: Repository → Settings → Webhooks → Secret
- Supports both SHA256 (recommended) and SHA1 (legacy)
- Same secret for all events from that webhook

### Shopify
- Secret is auto-generated by Shopify
- Get from: Admin → Settings → Notifications → Webhooks
- Base64-encoded signature
- Different secret per webhook endpoint

## Advanced: Custom Provider Support

To add support for additional providers, extend the signature verifier:

```typescript
// apps/server/src/services/signature-verifier.ts

function verifyCustomProviderSignature(
  headers: Record<string, string>,
  rawBody: string,
  secret: string
): SignatureVerificationResult {
  const signatureHeader = headers['x-custom-signature'];
  
  if (!signatureHeader) {
    return {
      provider: 'custom',
      isValid: false,
      status: 'missing_signature',
    };
  }

  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signatureHeader),
    Buffer.from(computedSignature)
  );

  return {
    provider: 'custom',
    isValid,
    status: isValid ? 'verified' : 'failed',
    algorithm: 'HMAC-SHA256',
  };
}
```

## Related Documentation

- [Stripe Webhook Signatures](https://stripe.com/docs/webhooks/signatures)
- [GitHub Webhook Security](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- [Shopify Webhook Verification](https://shopify.dev/docs/apps/build/webhooks/subscribe/https#step-5-verify-the-webhook)
