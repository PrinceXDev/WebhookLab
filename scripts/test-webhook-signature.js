#!/usr/bin/env node

/**
 * Test Webhook Signature Verification
 *
 * Usage:
 *   node scripts/test-webhook-signature.js stripe abc123 whsec_test123
 *   node scripts/test-webhook-signature.js github abc123 github_secret
 *   node scripts/test-webhook-signature.js shopify abc123 shopify_secret
 */

import crypto from "crypto";
import https from "https";
import http from "http";

const [, , provider, slug, secret, url = "http://localhost:4000"] =
  process.argv;

if (!provider || !slug || !secret) {
  console.error(
    "❌ Usage: node test-webhook-signature.js <provider> <slug> <secret> [url]",
  );
  console.error("   Providers: stripe, github, shopify");
  console.error(
    "   Example: node test-webhook-signature.js stripe abc123 whsec_test123",
  );
  process.exit(1);
}

const providers = {
  stripe: testStripe,
  github: testGitHub,
  shopify: testShopify,
};

if (!providers[provider]) {
  console.error(`❌ Unknown provider: ${provider}`);
  console.error("   Supported: stripe, github, shopify");
  process.exit(1);
}

providers[provider](slug, secret, url);

function testStripe(slug, secret, baseUrl) {
  console.log("🧪 Testing Stripe webhook signature verification...\n");

  const timestamp = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify(
    {
      id: `evt_test_${Date.now()}`,
      object: "event",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: `pi_test_${Date.now()}`,
          amount: 5000,
          currency: "usd",
          status: "succeeded",
          customer: "cus_test",
          description: "Test payment from WebhookLab test script",
        },
      },
      created: timestamp,
    },
    null,
    2,
  );

  // Compute Stripe signature
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex");

  const headers = {
    "Content-Type": "application/json",
    "stripe-signature": `t=${timestamp},v1=${signature}`,
    "user-agent": "Stripe/1.0 (+https://stripe.com/docs/webhooks)",
  };

  console.log("📝 Payload:");
  console.log(payload);
  console.log("\n🔐 Signature:", `t=${timestamp},v1=${signature}`);
  console.log("");

  sendWebhook(`${baseUrl}/hook/${slug}`, payload, headers);
}

function testGitHub(slug, secret, baseUrl) {
  console.log("🧪 Testing GitHub webhook signature verification...\n");

  const payload = JSON.stringify(
    {
      action: "opened",
      number: Math.floor(Math.random() * 1000),
      pull_request: {
        id: Math.floor(Math.random() * 100000),
        title: "Test PR for signature verification",
        state: "open",
        user: {
          login: "testuser",
          id: 12345,
        },
        body: "This is a test PR to verify webhook signatures",
      },
      repository: {
        name: "test-repo",
        full_name: "testuser/test-repo",
      },
      sender: {
        login: "testuser",
      },
    },
    null,
    2,
  );

  // Compute GitHub signature (SHA256)
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("hex");

  const headers = {
    "Content-Type": "application/json",
    "x-hub-signature-256": `sha256=${signature}`,
    "x-github-event": "pull_request",
    "x-github-delivery": crypto.randomUUID(),
    "user-agent": "GitHub-Hookshot/test",
  };

  console.log("📝 Payload:");
  console.log(payload);
  console.log("\n🔐 Signature:", `sha256=${signature}`);
  console.log("");

  sendWebhook(`${baseUrl}/hook/${slug}`, payload, headers);
}

function testShopify(slug, secret, baseUrl) {
  console.log("🧪 Testing Shopify webhook signature verification...\n");

  const payload = JSON.stringify(
    {
      id: Math.floor(Math.random() * 1000000),
      email: "customer@example.com",
      total_price: "99.99",
      currency: "USD",
      financial_status: "paid",
      line_items: [
        {
          id: Math.floor(Math.random() * 1000000),
          title: "Test Product",
          quantity: 1,
          price: "99.99",
        },
      ],
      created_at: new Date().toISOString(),
    },
    null,
    2,
  );

  // Compute Shopify signature (Base64)
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("base64");

  const headers = {
    "Content-Type": "application/json",
    "x-shopify-hmac-sha256": signature,
    "x-shopify-topic": "orders/create",
    "x-shopify-shop-domain": "test-shop.myshopify.com",
    "user-agent": "Shopify/test",
  };

  console.log("📝 Payload:");
  console.log(payload);
  console.log("\n🔐 Signature:", signature);
  console.log("");

  sendWebhook(`${baseUrl}/hook/${slug}`, payload, headers);
}

function sendWebhook(url, payload, headers) {
  const urlObj = new URL(url);
  const client = urlObj.protocol === "https:" ? https : http;

  const options = {
    method: "POST",
    headers: {
      ...headers,
      "Content-Length": Buffer.byteLength(payload),
    },
  };

  console.log("📤 Sending webhook to:", url);
  console.log("");

  const req = client.request(url, options, (res) => {
    let data = "";

    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      console.log(`📥 Response (${res.statusCode}):`);
      try {
        const json = JSON.parse(data);
        console.log(JSON.stringify(json, null, 2));

        if (json.signatureVerification) {
          console.log("\n🔍 Signature Verification Result:");
          console.log(`   Provider: ${json.signatureVerification.provider}`);
          console.log(`   Status: ${json.signatureVerification.status}`);
          console.log(
            `   Valid: ${json.signatureVerification.isValid ? "✅" : "❌"}`,
          );
        }
      } catch {
        console.log(data);
      }

      console.log(
        "\n💡 Check your WebhookLab dashboard to see the signature badge!",
      );
    });
  });

  req.on("error", (error) => {
    console.error("❌ Error:", error.message);
  });

  req.write(payload);
  req.end();
}
