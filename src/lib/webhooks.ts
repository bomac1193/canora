/**
 * Webhook Dispatch System
 * Handles dispatching events to registered webhook subscribers
 */

import { createHmac, randomUUID } from "crypto";
import { prisma } from "./prisma";

/**
 * Valid webhook events
 */
export const WEBHOOK_EVENTS = {
  WORK_CREATED: "work.created",
  WORK_PROMOTED: "work.promoted",
  WORK_CANONIZED: "work.canonized",
  SIGNAL_RECEIVED: "signal.received",
} as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS];

/**
 * Validate that provided events are valid webhook events
 */
export function validateWebhookEvents(events: string[]): {
  valid: boolean;
  invalidEvents: string[];
} {
  const validEvents = Object.values(WEBHOOK_EVENTS);
  const invalidEvents = events.filter(
    (e) => !validEvents.includes(e as WebhookEvent)
  );
  return {
    valid: invalidEvents.length === 0,
    invalidEvents,
  };
}

/**
 * Generate HMAC signature for webhook payload
 */
export function signWebhookPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Verify HMAC signature of webhook payload
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = signWebhookPayload(payload, secret);
  return signature === expectedSignature;
}

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

interface DeliveryResult {
  subscriptionId: string;
  url: string;
  success: boolean;
  statusCode?: number;
  error?: string;
}

/**
 * Dispatch a webhook event to all subscribers
 */
export async function dispatchWebhook(
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<DeliveryResult[]> {
  // Find all active subscriptions for this event
  const subscriptions = await prisma.webhookSubscription.findMany({
    where: {
      active: true,
      events: { has: event },
    },
  });

  if (subscriptions.length === 0) {
    return [];
  }

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const payloadString = JSON.stringify(payload);
  const results: DeliveryResult[] = [];

  // Dispatch to each subscriber in parallel
  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      const deliveryId = randomUUID();
      const signature = signWebhookPayload(payloadString, subscription.secret);

      const result = await deliverWebhook(
        subscription.url,
        payloadString,
        {
          "Content-Type": "application/json",
          "X-Canora-Signature": signature,
          "X-Canora-Event": event,
          "X-Canora-Delivery": deliveryId,
        },
        subscription.id
      );

      results.push({
        subscriptionId: subscription.id,
        url: subscription.url,
        ...result,
      });
    })
  );

  return results;
}

/**
 * Deliver webhook with retry logic
 */
async function deliverWebhook(
  url: string,
  payload: string,
  headers: Record<string, string>,
  subscriptionId: string,
  maxRetries: number = 3
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const delays = [1000, 4000, 16000]; // Exponential backoff: 1s, 4s, 16s

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: payload,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (response.ok) {
        // Reset failure count on success
        await prisma.webhookSubscription
          .update({
            where: { id: subscriptionId },
            data: { failures: 0 },
          })
          .catch(() => {});

        return { success: true, statusCode: response.status };
      }

      // Non-retryable status codes
      if (response.status >= 400 && response.status < 500) {
        await recordFailure(subscriptionId);
        return {
          success: false,
          statusCode: response.status,
          error: `Client error: ${response.status}`,
        };
      }

      // Server error - retry
      if (attempt < maxRetries - 1) {
        await sleep(delays[attempt]);
      }
    } catch (error) {
      if (attempt < maxRetries - 1) {
        await sleep(delays[attempt]);
      } else {
        await recordFailure(subscriptionId);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }
  }

  await recordFailure(subscriptionId);
  return { success: false, error: "Max retries exceeded" };
}

/**
 * Record a delivery failure and potentially deactivate subscription
 */
async function recordFailure(subscriptionId: string): Promise<void> {
  try {
    const subscription = await prisma.webhookSubscription.update({
      where: { id: subscriptionId },
      data: { failures: { increment: 1 } },
    });

    // Deactivate after 10 consecutive failures
    if (subscription.failures >= 10) {
      await prisma.webhookSubscription.update({
        where: { id: subscriptionId },
        data: { active: false },
      });
      console.log(
        `Webhook subscription ${subscriptionId} deactivated after 10 failures`
      );
    }
  } catch (error) {
    console.error(`Failed to record webhook failure for ${subscriptionId}:`, error);
  }
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a webhook secret
 */
export function generateWebhookSecret(): string {
  return `whsec_${randomUUID().replace(/-/g, "")}`;
}
