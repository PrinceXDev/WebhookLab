# 🔐 Signature Verification - Quick Reference

## 🚀 Quick Setup (30 seconds)

### Step 1: Get Your Secret
- **Stripe**: Dashboard → Developers → Webhooks → Signing secret
- **GitHub**: Repo → Settings → Webhooks → Secret
- **Shopify**: Admin → Settings → Notifications → Webhooks

### Step 2: Configure Endpoint
```
1. Create endpoint in WebhookLab
2. Paste secret in "Webhook Secret" field
3. Copy endpoint URL
4. Add URL to provider's webhook configuration
```

### Step 3: Test
```bash
node scripts/test-webhook-signature.js stripe <slug> <secret>
```

---

## 📊 Badge Reference

| Badge | Meaning | Action |
|-------|---------|--------|
| ✅ Verified | Signature valid | ✓ Safe to process |
| ❌ Failed | Signature invalid | ⚠️ Security issue! |
| ⚠️ No Signature | Provider detected, no sig | Configure provider |
| 🔒 No Secret | Need to add secret | Edit endpoint |

---

## 🔍 Provider Cheat Sheet

### Stripe
```typescript
Header: stripe-signature: t=1234567890,v1=abc123...
Algorithm: HMAC-SHA256
Encoding: Hex
Signed Payload: "timestamp.body"
Timestamp Check: Yes (5 min)
```

### GitHub
```typescript
Header: x-hub-signature-256: sha256=abc123...
Algorithm: HMAC-SHA256 (or SHA1)
Encoding: Hex
Signed Payload: body
Timestamp Check: No
```

### Shopify
```typescript
Header: x-shopify-hmac-sha256: ABC123def456+/=
Algorithm: HMAC-SHA256
Encoding: Base64
Signed Payload: body
Timestamp Check: No
```

---

## 🧪 Test Commands

### Stripe
```bash
node scripts/test-webhook-signature.js stripe abc123 whsec_test123
```

### GitHub
```bash
node scripts/test-webhook-signature.js github abc123 github_secret
```

### Shopify
```bash
node scripts/test-webhook-signature.js shopify abc123 shopify_secret
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Red "Failed" badge | Check secret matches provider |
| Gray "No Secret" badge | Add webhook secret to endpoint |
| Yellow "No Signature" badge | Enable signatures in provider settings |
| "Timestamp too old" | Sync system clock or check webhook delay |

---

## 💻 Code Snippets

### Verify Manually
```typescript
import { verifyWebhookSignature } from './services/signature-verifier';

const result = verifyWebhookSignature(headers, rawBody, secret);
console.log(result.isValid); // true or false
console.log(result.status);  // 'verified', 'failed', etc.
```

### Auto-Detect Provider
```typescript
import { detectProvider } from './services/signature-verifier';

const provider = detectProvider(headers);
console.log(provider); // 'stripe', 'github', 'shopify', or 'unknown'
```

### Get Signature Header Name
```typescript
import { getSignatureHeaderName } from './services/signature-verifier';

const headerName = getSignatureHeaderName('stripe');
console.log(headerName); // 'stripe-signature'
```

---

## 📖 Full Documentation

- **Setup Guide**: `SIGNATURE_VERIFICATION.md`
- **Implementation**: `PHASE2_SIGNATURE_IMPLEMENTATION.md`
- **Complete Guide**: `docs/signature-verification-guide.md`
- **Provider Comparison**: `docs/provider-comparison.md`

---

## 🎯 Key Takeaways

1. **Always verify signatures in production** - Prevents fake webhooks
2. **Use timing-safe comparison** - Prevents timing attacks
3. **Preserve raw body** - Required for accurate verification
4. **Check timestamps** (Stripe) - Prevents replay attacks
5. **Rotate secrets regularly** - Security best practice (every 90 days)

---

**Made with ❤️ for WebhookLab**
