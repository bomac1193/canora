/**
 * Webhook Subscription API Routes
 * POST - Subscribe to events
 * GET - List subscriptions
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withApiKeyAuth,
  API_SCOPES,
  type ApiAuthContext,
} from "@/lib/apiAuth";
import {
  validateWebhookEvents,
  generateWebhookSecret,
} from "@/lib/webhooks";

/**
 * POST /api/v1/webhooks
 * Subscribe to webhook events
 */
async function handlePost(
  request: NextRequest,
  context: ApiAuthContext
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { url, events } = body;

    // Validate URL
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // URL must be HTTPS
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== "https:") {
        return NextResponse.json(
          { error: "Webhook URL must use HTTPS" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Validate events
    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "At least one event is required" },
        { status: 400 }
      );
    }

    const eventValidation = validateWebhookEvents(events);
    if (!eventValidation.valid) {
      return NextResponse.json(
        {
          error: "Invalid events",
          invalidEvents: eventValidation.invalidEvents,
        },
        { status: 400 }
      );
    }

    // Check for duplicate subscription
    const existing = await prisma.webhookSubscription.findFirst({
      where: {
        userId: context.userId,
        url,
        active: true,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Active subscription already exists for this URL" },
        { status: 409 }
      );
    }

    // Generate secret for signing
    const secret = generateWebhookSecret();

    // Create subscription
    const subscription = await prisma.webhookSubscription.create({
      data: {
        url,
        events,
        secret,
        userId: context.userId,
      },
    });

    return NextResponse.json(
      {
        id: subscription.id,
        url: subscription.url,
        events: subscription.events,
        secret, // Show secret only once
        createdAt: subscription.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating webhook subscription:", error);
    return NextResponse.json(
      { error: "Failed to create webhook subscription" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/webhooks
 * List user's webhook subscriptions
 */
async function handleGet(
  _request: NextRequest,
  context: ApiAuthContext
): Promise<NextResponse> {
  try {
    const subscriptions = await prisma.webhookSubscription.findMany({
      where: { userId: context.userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        url: s.url,
        events: s.events,
        active: s.active,
        failures: s.failures,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error listing webhook subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to list webhook subscriptions" },
      { status: 500 }
    );
  }
}

export const POST = withApiKeyAuth(handlePost, [API_SCOPES.WEBHOOKS_MANAGE]);
export const GET = withApiKeyAuth(handleGet, [API_SCOPES.WEBHOOKS_MANAGE]);
