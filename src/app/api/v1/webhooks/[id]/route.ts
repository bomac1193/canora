/**
 * Individual Webhook Subscription API Routes
 * DELETE - Unsubscribe from webhooks
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withApiKeyAuthParams,
  API_SCOPES,
  type ApiAuthContext,
} from "@/lib/apiAuth";

/**
 * DELETE /api/v1/webhooks/[id]
 * Delete/unsubscribe a webhook subscription
 */
async function handleDelete(
  _request: NextRequest,
  context: ApiAuthContext,
  { params }: { params: Promise<Record<string, string>> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    // Find the subscription and verify ownership
    const subscription = await prisma.webhookSubscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Webhook subscription not found" },
        { status: 404 }
      );
    }

    if (subscription.userId !== context.userId) {
      return NextResponse.json(
        { error: "Not authorized to delete this subscription" },
        { status: 403 }
      );
    }

    // Delete the subscription
    await prisma.webhookSubscription.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting webhook subscription:", error);
    return NextResponse.json(
      { error: "Failed to delete webhook subscription" },
      { status: 500 }
    );
  }
}

export const DELETE = withApiKeyAuthParams(handleDelete, [
  API_SCOPES.WEBHOOKS_MANAGE,
]);
