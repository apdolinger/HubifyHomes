import crypto from "crypto";
import dns from "dns/promises";
import { storage } from "./storage";
import { log } from "./vite";
import type { WebhookEventType } from "@shared/schema";

const MAX_ATTEMPTS = 3;

// Exponential backoff delays (in minutes): 1, 5, 15
const RETRY_DELAYS_MINUTES = [1, 5, 15];

function computeHmacSignature(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

/** Returns true if the given IPv4 address string is in a private/reserved range. */
function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  const a = parts[0];
  const b = parts[1];
  return (
    a === 127 || // 127.0.0.0/8 loopback
    a === 10 || // 10.0.0.0/8 private
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 private
    (a === 192 && b === 168) || // 192.168.0.0/16 private
    (a === 169 && b === 254) || // 169.254.0.0/16 link-local (metadata)
    a === 0 // 0.0.0.0
  );
}

/** Returns true if the given IPv6 address string is in a private/reserved range. */
function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    lower === "::1" || // loopback
    lower.startsWith("fc") || lower.startsWith("fd") || // fc00::/7 unique local
    lower.startsWith("fe80") || // fe80::/10 link-local
    lower.startsWith("::ffff:") // IPv4-mapped
  );
}

/**
 * Validates that a webhook URL is safe to deliver to:
 * - Must use HTTPS (no redirects to non-HTTPS or internal services)
 * - Must not be localhost/loopback
 * - Must not resolve to a private/link-local IPv4 or IPv6 address (SSRF guard)
 *
 * Exported for use in route-level validation; also called at send-time in the dispatcher.
 */
export async function validateWebhookUrlSafe(rawUrl: string): Promise<{ valid: boolean; reason?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, reason: "Invalid URL" };
  }
  if (parsed.protocol !== "https:") {
    return { valid: false, reason: "Webhook URL must use HTTPS" };
  }
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (hostname === "localhost") {
    return { valid: false, reason: "Webhook URL must not target internal addresses" };
  }
  // Check if the literal hostname is already an IP (IPv4 or IPv6)
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    if (isPrivateIpv4(hostname)) {
      return { valid: false, reason: "Webhook URL must not target private network addresses" };
    }
    return { valid: true };
  }
  if (hostname.includes(":")) {
    if (isPrivateIpv6(hostname)) {
      return { valid: false, reason: "Webhook URL must not target private network addresses" };
    }
    return { valid: true };
  }
  // Resolve hostname via DNS and validate every returned address
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const { address, family } of addresses) {
      if (family === 4 && isPrivateIpv4(address)) {
        return { valid: false, reason: `Webhook URL resolves to a private address (${address})` };
      }
      if (family === 6 && isPrivateIpv6(address)) {
        return { valid: false, reason: `Webhook URL resolves to a private address (${address})` };
      }
    }
  } catch {
    // DNS resolution failure: block as precaution
    return { valid: false, reason: "Webhook URL hostname could not be resolved" };
  }
  return { valid: true };
}

async function deliverToEndpoint(
  endpointId: string,
  orgId: string,
  deliveryId: string,
  url: string,
  secret: string,
  eventType: WebhookEventType,
  payload: Record<string, any>,
  attemptNumber: number
): Promise<void> {
  const body = JSON.stringify(payload);
  const signature = computeHmacSignature(secret, body);
  const timestamp = Math.floor(Date.now() / 1000);

  let responseStatus: number | undefined;
  let responseBody: string | undefined;
  let errorMessage: string | undefined;
  let success = false;

  // Re-validate URL at send time including DNS resolution (catches SSRF bypass attempts)
  const urlCheck = await validateWebhookUrlSafe(url);
  if (!urlCheck.valid) {
    // URL blocked — treat as terminal (will not retry this delivery)
    await storage.updateWebhookDelivery(deliveryId, {
      status: "failed",
      attempts: MAX_ATTEMPTS + 1, // exhausted — above retry ceiling
      nextRetryAt: null,
      lastAttemptAt: new Date(),
      errorMessage: urlCheck.reason ?? "Blocked: invalid endpoint URL",
    });
    log(`[WEBHOOK] Blocked delivery to ${url}: ${urlCheck.reason}`);
    return;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hubify-Event": eventType,
        "X-Hubify-Signature": `sha256=${signature}`,
        "X-Hubify-Timestamp": String(timestamp),
        "User-Agent": "Hubify-Webhooks/1.0",
      },
      body,
      signal: controller.signal,
      redirect: "manual", // Never follow redirects — prevents redirect-based SSRF
    });

    clearTimeout(timeoutId);
    responseStatus = response.status;
    // Treat redirects (3xx) as failures to prevent open-redirect SSRF
    if (responseStatus >= 300 && responseStatus < 400) {
      errorMessage = `HTTP ${responseStatus}: Redirects are not followed for security reasons`;
    } else {
      responseBody = await response.text().catch(() => "");
      success = response.ok;
      if (!success) {
        errorMessage = `HTTP ${responseStatus}: ${responseBody.slice(0, 500)}`;
      }
    }
  } catch (err: any) {
    errorMessage = err.message || "Unknown error";
  }

  const now = new Date();
  const nextAttempt = attemptNumber + 1;
  let nextRetryAt: Date | undefined;

  // Schedule up to MAX_ATTEMPTS retries with 1m/5m/15m exponential backoff.
  // attemptNumber is 0-indexed, so delay index = attemptNumber.
  // Retries 1/2/3 happen at 1m/5m/15m after each failure.
  if (!success && nextAttempt <= MAX_ATTEMPTS) {
    const delayMinutes = RETRY_DELAYS_MINUTES[attemptNumber] ?? 15;
    nextRetryAt = new Date(now.getTime() + delayMinutes * 60 * 1000);
  }

  await storage.updateWebhookDelivery(deliveryId, {
    status: success ? "success" : "failed",
    attempts: nextAttempt,
    lastAttemptAt: now,
    nextRetryAt: success ? undefined : nextRetryAt,
    responseStatus,
    responseBody: responseBody?.slice(0, 2000),
    errorMessage,
  });

  if (success) {
    log(`[WEBHOOK] Delivered ${eventType} to ${url} — HTTP ${responseStatus}`);
  } else {
    const willRetry = nextAttempt <= MAX_ATTEMPTS && nextRetryAt;
    const totalAttempts = MAX_ATTEMPTS + 1;
    log(`[WEBHOOK] Failed delivery to ${url} (attempt ${nextAttempt}/${totalAttempts}): ${errorMessage}${willRetry ? ` — retry at ${nextRetryAt?.toISOString()}` : " — no more retries"}`);
  }
}

/**
 * Fire an outbound webhook event for an org.
 * Creates delivery records and immediately attempts dispatch.
 */
export async function dispatchWebhookEvent(
  orgId: string,
  eventType: WebhookEventType,
  payload: Record<string, any>
): Promise<void> {
  try {
    const endpoints = await storage.getEnabledWebhookEndpointsForEvent(orgId, eventType);

    if (endpoints.length === 0) return;

    const enrichedPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      orgId,
      data: payload,
    };

    await Promise.allSettled(
      endpoints.map(async (endpoint) => {
        const delivery = await storage.createWebhookDelivery({
          endpointId: endpoint.id,
          orgId,
          eventType,
          payload: enrichedPayload,
          status: "pending",
          attempts: 0,
        });

        await deliverToEndpoint(
          endpoint.id,
          orgId,
          delivery.id,
          endpoint.url,
          endpoint.secret,
          eventType,
          enrichedPayload,
          0
        );
      })
    );
  } catch (err) {
    log(`[WEBHOOK] Error dispatching event ${eventType} for org ${orgId}: ${err}`);
  }
}

/**
 * Retry failed webhook deliveries. Called by scheduled tasks.
 */
export async function retryFailedWebhookDeliveries(): Promise<void> {
  try {
    const failedDeliveries = await storage.getFailedWebhookDeliveriesForRetry();

    if (failedDeliveries.length === 0) return;

    log(`[WEBHOOK] Retrying ${failedDeliveries.length} failed webhook deliveries`);

    await Promise.allSettled(
      failedDeliveries.map(async (delivery) => {
        const endpoint = await storage.getWebhookEndpoint(delivery.endpointId, delivery.orgId);
        if (!endpoint || !endpoint.enabled) {
          // Mark terminal so the retry scanner never picks this delivery up again
          await storage.updateWebhookDelivery(delivery.id, {
            status: "failed",
            attempts: MAX_ATTEMPTS + 1, // exhausted — above the retry ceiling
            nextRetryAt: null,
            lastAttemptAt: new Date(),
            errorMessage: endpoint ? "Endpoint disabled" : "Endpoint deleted",
          });
          return;
        }

        await deliverToEndpoint(
          endpoint.id,
          delivery.orgId,
          delivery.id,
          endpoint.url,
          endpoint.secret,
          delivery.eventType as WebhookEventType,
          delivery.payload as Record<string, any>,
          delivery.attempts
        );
      })
    );
  } catch (err) {
    log(`[WEBHOOK] Error retrying failed deliveries: ${err}`);
  }
}

/**
 * Send a test event to a specific endpoint and record the delivery attempt in the log.
 */
export async function sendTestWebhookEvent(
  endpointId: string,
  orgId: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  const endpoint = await storage.getWebhookEndpoint(endpointId, orgId);
  if (!endpoint) throw new Error("Endpoint not found");

  // Enforce SSRF guard at test-send time, including DNS resolution
  const urlCheck = await validateWebhookUrlSafe(endpoint.url);
  if (!urlCheck.valid) {
    throw new Error(urlCheck.reason ?? "Blocked: invalid endpoint URL");
  }

  const testPayload = {
    event: "test",
    timestamp: new Date().toISOString(),
    orgId,
    data: {
      message: "This is a test event from Hubify webhooks",
    },
  };

  const body = JSON.stringify(testPayload);
  const signature = computeHmacSignature(endpoint.secret, body);
  const timestamp = Math.floor(Date.now() / 1000);

  // Create a delivery record for the test event
  const delivery = await storage.createWebhookDelivery({
    endpointId,
    orgId,
    eventType: "test",
    payload: testPayload,
    status: "pending",
    attempts: 0,
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hubify-Event": "test",
        "X-Hubify-Signature": `sha256=${signature}`,
        "X-Hubify-Timestamp": String(timestamp),
        "User-Agent": "Hubify-Webhooks/1.0",
      },
      body,
      signal: controller.signal,
      redirect: "manual", // Never follow redirects — prevents redirect-based SSRF
    });

    clearTimeout(timeoutId);
    const status = response.status;
    // Treat 3xx as failure to prevent open-redirect SSRF
    const isRedirect = status >= 300 && status < 400;
    const responseOk = response.ok && !isRedirect;
    let responseBody: string | undefined;
    if (!isRedirect) {
      try { responseBody = await response.text(); } catch {}
    }

    await storage.updateWebhookDelivery(delivery.id, {
      status: responseOk ? "success" : "failed",
      attempts: 1,
      lastAttemptAt: new Date(),
      responseStatus: status,
      responseBody: isRedirect
        ? "Redirect blocked for security reasons"
        : responseBody?.slice(0, 1000),
    });

    return { success: responseOk, status: response.status };
  } catch (err: any) {
    const errorMessage = err.message || "Request failed";
    await storage.updateWebhookDelivery(delivery.id, {
      status: "failed",
      attempts: 1,
      lastAttemptAt: new Date(),
      errorMessage,
    });
    return { success: false, error: errorMessage };
  }
}
