import crypto from 'crypto';
import { logger } from '../utils/logger.js';

export type WebhookProvider = 'stripe' | 'github' | 'shopify' | 'unknown';

export interface SignatureVerificationResult {
  provider: WebhookProvider;
  isValid: boolean;
  status: 'verified' | 'failed' | 'missing_signature' | 'missing_secret' | 'not_applicable';
  signatureHeader?: string;
  algorithm?: string;
  message?: string;
}

/**
 * Auto-detect webhook provider based on headers and verify signature
 */
export function verifyWebhookSignature(
  headers: Record<string, string>,
  rawBody: string,
  secret?: string
): SignatureVerificationResult {
  const provider = detectProvider(headers);

  if (provider === 'unknown') {
    return {
      provider: 'unknown',
      isValid: false,
      status: 'not_applicable',
      message: 'Provider not detected or signature verification not supported',
    };
  }

  if (!secret) {
    return {
      provider,
      isValid: false,
      status: 'missing_secret',
      message: `No secret configured for ${provider} verification`,
    };
  }

  switch (provider) {
    case 'stripe':
      return verifyStripeSignature(headers, rawBody, secret);
    case 'github':
      return verifyGitHubSignature(headers, rawBody, secret);
    case 'shopify':
      return verifyShopifySignature(headers, rawBody, secret);
    default:
      return {
        provider: 'unknown',
        isValid: false,
        status: 'not_applicable',
      };
  }
}

/**
 * Detect webhook provider from headers
 */
export function detectProvider(headers: Record<string, string>): WebhookProvider {
  const lowerHeaders = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
  );

  // Stripe: stripe-signature header
  if (lowerHeaders['stripe-signature']) {
    return 'stripe';
  }

  // GitHub: x-hub-signature-256 or x-hub-signature header
  if (lowerHeaders['x-hub-signature-256'] || lowerHeaders['x-hub-signature']) {
    return 'github';
  }

  // Shopify: x-shopify-hmac-sha256 header
  if (lowerHeaders['x-shopify-hmac-sha256']) {
    return 'shopify';
  }

  // Additional heuristics based on user-agent or other headers
  const userAgent = lowerHeaders['user-agent'] || '';
  if (userAgent.includes('Stripe')) return 'stripe';
  if (userAgent.includes('GitHub-Hookshot')) return 'github';
  if (userAgent.includes('Shopify')) return 'shopify';

  return 'unknown';
}

/**
 * Verify Stripe webhook signature
 * Header: stripe-signature
 * Format: t=timestamp,v1=signature
 * Algorithm: HMAC-SHA256
 */
function verifyStripeSignature(
  headers: Record<string, string>,
  rawBody: string,
  secret: string
): SignatureVerificationResult {
  const signatureHeader = headers['stripe-signature'] || headers['Stripe-Signature'];

  if (!signatureHeader) {
    return {
      provider: 'stripe',
      isValid: false,
      status: 'missing_signature',
      message: 'Missing stripe-signature header',
    };
  }

  try {
    // Parse the signature header
    const signatures = signatureHeader.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const timestamp = signatures.t;
    const expectedSignature = signatures.v1;

    if (!timestamp || !expectedSignature) {
      return {
        provider: 'stripe',
        isValid: false,
        status: 'failed',
        signatureHeader,
        message: 'Invalid signature format',
      };
    }

    // Check timestamp tolerance (5 minutes)
    const currentTime = Math.floor(Date.now() / 1000);
    const timestampAge = currentTime - parseInt(timestamp, 10);
    
    if (timestampAge > 300) {
      logger.warn('Stripe webhook timestamp too old', { timestampAge });
      return {
        provider: 'stripe',
        isValid: false,
        status: 'failed',
        signatureHeader,
        algorithm: 'HMAC-SHA256',
        message: `Timestamp too old: ${timestampAge}s (max 300s)`,
      };
    }

    // Construct the signed payload
    const signedPayload = `${timestamp}.${rawBody}`;

    // Compute the expected signature
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex');

    // Compare signatures using timing-safe comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(computedSignature)
    );

    return {
      provider: 'stripe',
      isValid,
      status: isValid ? 'verified' : 'failed',
      signatureHeader,
      algorithm: 'HMAC-SHA256',
      message: isValid ? 'Signature verified' : 'Signature mismatch',
    };
  } catch (error) {
    logger.error('Stripe signature verification error', { error });
    return {
      provider: 'stripe',
      isValid: false,
      status: 'failed',
      signatureHeader,
      message: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Verify GitHub webhook signature
 * Header: x-hub-signature-256 (preferred) or x-hub-signature (legacy)
 * Format: sha256=<signature> or sha1=<signature>
 * Algorithm: HMAC-SHA256 or HMAC-SHA1
 */
function verifyGitHubSignature(
  headers: Record<string, string>,
  rawBody: string,
  secret: string
): SignatureVerificationResult {
  // Prefer SHA256 over SHA1
  const signatureHeader = 
    headers['x-hub-signature-256'] || 
    headers['X-Hub-Signature-256'] ||
    headers['x-hub-signature'] ||
    headers['X-Hub-Signature'];

  if (!signatureHeader) {
    return {
      provider: 'github',
      isValid: false,
      status: 'missing_signature',
      message: 'Missing x-hub-signature-256 or x-hub-signature header',
    };
  }

  try {
    // Parse algorithm and signature
    const [algorithm, expectedSignature] = signatureHeader.split('=');

    if (!algorithm || !expectedSignature) {
      return {
        provider: 'github',
        isValid: false,
        status: 'failed',
        signatureHeader,
        message: 'Invalid signature format',
      };
    }

    // Determine hash algorithm
    const hashAlgorithm = algorithm === 'sha256' ? 'sha256' : 'sha1';

    // Compute the expected signature
    const computedSignature = crypto
      .createHmac(hashAlgorithm, secret)
      .update(rawBody, 'utf8')
      .digest('hex');

    // Compare signatures using timing-safe comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(computedSignature)
    );

    return {
      provider: 'github',
      isValid,
      status: isValid ? 'verified' : 'failed',
      signatureHeader,
      algorithm: `HMAC-${algorithm.toUpperCase()}`,
      message: isValid ? 'Signature verified' : 'Signature mismatch',
    };
  } catch (error) {
    logger.error('GitHub signature verification error', { error });
    return {
      provider: 'github',
      isValid: false,
      status: 'failed',
      signatureHeader,
      message: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Verify Shopify webhook signature
 * Header: x-shopify-hmac-sha256
 * Format: base64-encoded HMAC-SHA256
 * Algorithm: HMAC-SHA256
 */
function verifyShopifySignature(
  headers: Record<string, string>,
  rawBody: string,
  secret: string
): SignatureVerificationResult {
  const signatureHeader = 
    headers['x-shopify-hmac-sha256'] || 
    headers['X-Shopify-Hmac-Sha256'];

  if (!signatureHeader) {
    return {
      provider: 'shopify',
      isValid: false,
      status: 'missing_signature',
      message: 'Missing x-shopify-hmac-sha256 header',
    };
  }

  try {
    // Compute the expected signature
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('base64');

    // Compare signatures using timing-safe comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(computedSignature)
    );

    return {
      provider: 'shopify',
      isValid,
      status: isValid ? 'verified' : 'failed',
      signatureHeader,
      algorithm: 'HMAC-SHA256',
      message: isValid ? 'Signature verified' : 'Signature mismatch',
    };
  } catch (error) {
    logger.error('Shopify signature verification error', { error });
    return {
      provider: 'shopify',
      isValid: false,
      status: 'failed',
      signatureHeader,
      message: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Get provider-specific signature header name
 */
export function getSignatureHeaderName(provider: WebhookProvider): string | null {
  switch (provider) {
    case 'stripe':
      return 'stripe-signature';
    case 'github':
      return 'x-hub-signature-256';
    case 'shopify':
      return 'x-shopify-hmac-sha256';
    default:
      return null;
  }
}

/**
 * Get provider display name
 */
export function getProviderDisplayName(provider: WebhookProvider): string {
  switch (provider) {
    case 'stripe':
      return 'Stripe';
    case 'github':
      return 'GitHub';
    case 'shopify':
      return 'Shopify';
    default:
      return 'Unknown';
  }
}
