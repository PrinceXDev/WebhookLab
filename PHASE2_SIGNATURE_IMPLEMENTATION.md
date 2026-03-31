# Phase 2: Signature Verification - Implementation Guide

## ✅ What Was Implemented

### Backend Components

#### 1. Signature Verification Service
**File**: `apps/server/src/services/signature-verifier.ts`

**Features**:
- Auto-detects webhook provider (Stripe, GitHub, Shopify)
- Verifies signatures using provider-specific algorithms
- Returns structured verification results
- Uses timing-safe comparison to prevent timing attacks
- Includes timestamp validation for Stripe webhooks

**Key Functions**:
```typescript
verifyWebhookSignature(headers, rawBody, secret)
detectProvider(headers)
getSignatureHeaderName(provider)
getProviderDisplayName(provider)
```

#### 2. Updated Data Models
**Files**: 
- `apps/server/src/redis/event-store.ts`
- `apps/server/src/redis/endpoint-store.ts`

**Changes**:
- Added `signatureVerification` field to `StoredWebhookEvent`
- Added `webhookSecret` field to `StoredEndpoint`

#### 3. Enhanced Webhook Route
**File**: `apps/server/src/routes/webhook.ts`

**Features**:
- Fetches endpoint configuration to get webhook secret
- Performs signature verification on every incoming webhook
- Stores verification results with event data
- Logs verification status for monitoring

#### 4. API Endpoints
**File**: `apps/server/src/routes/api.ts`

**New/Updated Endpoints**:
- `POST /api/endpoints` - Create endpoint with webhook secret
- `PATCH /api/endpoints/:id` - Update endpoint webhook secret
- All endpoints return signature verification data

### Frontend Components

#### 1. Signature Badge Component
**File**: `apps/web/src/components/events/signature-badge.tsx`

**Features**:
- Visual badge showing verification status
- Color-coded: Green (verified), Red (failed), Yellow (no signature), Gray (no secret)
- Provider icons (💳 Stripe, 🐙 GitHub, 🛍️ Shopify)
- Algorithm display (HMAC-SHA256, HMAC-SHA1)
- Tooltip with detailed message

#### 2. Enhanced Event Card
**File**: `apps/web/src/components/events/event-card.tsx`

**Features**:
- Displays signature badge inline with method badge
- Expandable section showing detailed verification info
- Provider, status, algorithm, and error messages

#### 3. Updated Create Endpoint Form
**File**: `apps/web/src/components/endpoints/create-endpoint-button.tsx`

**Features**:
- New "Webhook Secret" field (password input)
- Helper text explaining its purpose
- Optional field with validation

### Documentation

1. **SIGNATURE_VERIFICATION.md** - Complete user guide
2. **PHASE2_SIGNATURE_IMPLEMENTATION.md** - This file (implementation details)
3. **scripts/test-signatures.ps1** - PowerShell test script for all providers

## 🔐 Security Implementation Details

### 1. Timing-Safe Comparison
```typescript
// Prevents timing attacks by comparing in constant time
const isValid = crypto.timingSafeEqual(
  Buffer.from(expectedSignature),
  Buffer.from(computedSignature)
);
```

### 2. Raw Body Preservation
The webhook route uses a custom `getRawBody()` function to preserve the original request body:
```typescript
async function getRawBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => {
      data += chunk.toString();
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}
```

**Why this matters**: 
- Signature verification requires the EXACT raw body
- Express body parsers modify the body (whitespace, encoding)
- Any modification breaks signature verification

### 3. Timestamp Validation (Stripe)
```typescript
const currentTime = Math.floor(Date.now() / 1000);
const timestampAge = currentTime - parseInt(timestamp, 10);

if (timestampAge > 300) { // 5 minutes
  return { isValid: false, message: 'Timestamp too old' };
}
```

**Why this matters**:
- Prevents replay attacks
- Ensures webhook freshness
- Industry standard: 5-minute tolerance

### 4. Case-Insensitive Header Matching
```typescript
const lowerHeaders = Object.fromEntries(
  Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
);
```

**Why this matters**:
- HTTP headers are case-insensitive per RFC 7230
- Different HTTP clients may send different casing
- Ensures compatibility

## 📊 Verification Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Webhook Received                          │
│                  POST /hook/:slug                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              1. Get Raw Request Body                         │
│         (Preserve exact bytes for verification)              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           2. Fetch Endpoint Configuration                    │
│          (Get webhookSecret from Redis)                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              3. Auto-Detect Provider                         │
│    Check headers: stripe-signature, x-hub-signature-256,    │
│              x-shopify-hmac-sha256, user-agent               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│            4. Verify Signature (if applicable)               │
│                                                               │
│  Stripe:   HMAC-SHA256(secret, "timestamp.body")            │
│  GitHub:   HMAC-SHA256(secret, body)                        │
│  Shopify:  HMAC-SHA256(secret, body) → Base64               │
│                                                               │
│  Compare using crypto.timingSafeEqual()                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              5. Store Event with Verification                │
│    {                                                          │
│      id, method, headers, body, ...                          │
│      signatureVerification: {                                │
│        provider: 'stripe',                                   │
│        isValid: true,                                        │
│        status: 'verified',                                   │
│        algorithm: 'HMAC-SHA256'                              │
│      }                                                        │
│    }                                                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│          6. Publish to WebSocket (Real-time UI)              │
│              7. Return Response with Status                  │
└─────────────────────────────────────────────────────────────┘
```

## 🎨 UI Implementation

### Badge Variants

1. **Verified (Green)**
   - Status: `verified`
   - Icon: ShieldCheck ✓
   - Meaning: Signature is valid, webhook is authentic

2. **Failed (Red)**
   - Status: `failed`
   - Icon: ShieldX ✗
   - Meaning: Signature mismatch, possible security issue

3. **No Signature (Yellow)**
   - Status: `missing_signature`
   - Icon: ShieldAlert ⚠
   - Meaning: Provider detected but no signature header sent

4. **No Secret (Gray)**
   - Status: `missing_secret`
   - Icon: ShieldQuestion ?
   - Meaning: Signature present but no secret configured in endpoint

### Event Card Layout

```
┌────────────────────────────────────────────────────────────┐
│ [POST] [✅ Verified 💳] abc123xyz    2 minutes ago    [▼]  │
├────────────────────────────────────────────────────────────┤
│ [Expanded View]                                             │
│                                                              │
│ ┌─ Signature Verification ─────────────────────────────┐   │
│ │ Provider:  STRIPE                                     │   │
│ │ Status:    VERIFIED                                   │   │
│ │ Algorithm: HMAC-SHA256                                │   │
│ │ Message:   Signature verified                         │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ Headers: { ... }                                             │
│ Body: { ... }                                                │
│ IP: 127.0.0.1 • Type: application/json                      │
└────────────────────────────────────────────────────────────┘
```

## 🧪 Testing Guide

### Quick Test (All Providers)

```powershell
# Test Stripe
.\scripts\test-signatures.ps1 -Provider stripe -Slug abc123 -Secret whsec_test123

# Test GitHub
.\scripts\test-signatures.ps1 -Provider github -Slug abc123 -Secret github_secret_123

# Test Shopify
.\scripts\test-signatures.ps1 -Provider shopify -Slug abc123 -Secret shopify_secret_123
```

### Manual Testing Steps

1. **Start the server**:
   ```bash
   pnpm docker:up  # Start Redis & PostgreSQL
   pnpm dev        # Start development servers
   ```

2. **Create an endpoint**:
   - Go to http://localhost:3000
   - Click "New Endpoint"
   - Enter name: "Test Stripe Webhooks"
   - Enter webhook secret: `whsec_test123`
   - Copy the generated URL

3. **Send a test webhook**:
   ```powershell
   .\scripts\test-signatures.ps1 -Provider stripe -Slug <your-slug> -Secret whsec_test123
   ```

4. **Verify in UI**:
   - Check the event feed
   - Should see green "Verified" badge
   - Expand event to see full verification details

### Test Without Secret (Should Show Gray Badge)

```powershell
# Create endpoint WITHOUT webhook secret
# Then send webhook - should show "No Secret" badge
```

### Test Invalid Signature (Should Show Red Badge)

```powershell
# Send webhook with wrong secret
.\scripts\test-signatures.ps1 -Provider stripe -Slug abc123 -Secret wrong_secret
```

## 📈 What This Demonstrates

### Technical Skills

1. **Cryptography**:
   - HMAC signature generation and verification
   - Multiple hash algorithms (SHA256, SHA1)
   - Timing-safe comparison
   - Base64 encoding

2. **Security**:
   - Webhook authentication
   - Replay attack prevention (timestamp validation)
   - Timing attack prevention (constant-time comparison)
   - Secret management

3. **Protocol Knowledge**:
   - Understanding of Stripe, GitHub, Shopify webhook formats
   - HTTP header handling
   - Raw body preservation
   - Case-insensitive header matching

4. **Real-time Systems**:
   - Verification results pushed via WebSocket
   - Immediate UI feedback
   - Structured logging for monitoring

### Production Readiness

1. **Error Handling**: Graceful degradation when verification fails
2. **Logging**: Structured logs with context for debugging
3. **Type Safety**: Full TypeScript types for verification results
4. **User Experience**: Clear visual indicators of security status
5. **Documentation**: Comprehensive guides for setup and testing

## 🚀 Next Steps (Phase 2 Continuation)

### 1. AI Payload Parser
- Integrate Claude API to analyze webhook bodies
- Detect event types and providers
- Generate handler code snippets
- Show insights in UI

### 2. Smart Filtering
- Filter by provider (Stripe, GitHub, Shopify)
- Filter by signature status (verified, failed)
- AI-powered search: "show me all failed payment webhooks"
- Date range filtering

### 3. Schema Diff
- Compare two webhook payloads side-by-side
- Highlight structural differences
- Useful for debugging version changes

## 🎯 Interview Talking Points

When discussing this feature in interviews:

1. **Security Focus**: 
   - "I implemented webhook signature verification using HMAC-SHA256 with timing-safe comparison to prevent both replay and timing attacks."

2. **Multi-Provider Support**:
   - "The system auto-detects the webhook provider and applies the correct verification algorithm - Stripe uses timestamped payloads, GitHub uses direct HMAC, and Shopify uses base64-encoded signatures."

3. **Real-time Feedback**:
   - "Verification results are stored with the event and pushed to the frontend via WebSocket, giving users immediate visual feedback with color-coded badges."

4. **Production Considerations**:
   - "I preserved the raw request body for signature verification, implemented proper error handling, and added structured logging for security monitoring."

5. **User Experience**:
   - "The UI shows clear pass/fail badges with detailed verification info, making it easy for developers to debug signature issues."

## 📚 Additional Resources

- [OWASP Webhook Security](https://cheatsheetseries.owasp.org/cheatsheets/Webhook_Security_Cheat_Sheet.html)
- [Stripe Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [GitHub Webhook Security](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks)
