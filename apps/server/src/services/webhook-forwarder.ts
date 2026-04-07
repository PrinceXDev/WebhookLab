import { logger } from "../utils/logger.js";
import type { ForwardingResult } from "../redis/event-store.js";

const SKIP_HEADER_KEYS = new Set(["host", "connection", "content-length"]);

export const forwardWebhook = async (
  targetUrl: string,
  method: string,
  headers: Record<string, string>,
  body: string,
): Promise<ForwardingResult> => {
  const startTime = Date.now();
  const result: ForwardingResult = {
    targetUrl,
    attemptedAt: startTime,
  };

  try {
    const filteredHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (!SKIP_HEADER_KEYS.has(key.toLowerCase())) {
        filteredHeaders[key] = value;
      }
    }

    const response = await fetch(targetUrl, {
      method,
      headers: {
        ...filteredHeaders,
        "X-Forwarded-By": "WebhookLab",
      },
      body: method !== "GET" && method !== "HEAD" ? body : undefined,
      signal: AbortSignal.timeout(30000),
    });

    const endTime = Date.now();
    result.latencyMs = endTime - startTime;
    result.statusCode = response.status;

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    result.responseHeaders = responseHeaders;

    const responseText = await response.text();
    result.responseBody = responseText.substring(0, 10000);

    logger.info("Webhook forwarded successfully", {
      targetUrl,
      statusCode: result.statusCode,
      latencyMs: result.latencyMs,
    });

    return result;
  } catch (error) {
    const endTime = Date.now();
    result.latencyMs = endTime - startTime;
    result.error =
      error instanceof Error ? error.message : "Unknown forwarding error";

    logger.error("Webhook forwarding failed", {
      targetUrl,
      error: result.error,
      latencyMs: result.latencyMs,
    });

    return result;
  }
};
