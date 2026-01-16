/**
 * Work Signal API Routes
 * POST - Receive engagement signals from SELECTR
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withApiKeyAuthParams,
  API_SCOPES,
  type ApiAuthContext,
} from "@/lib/apiAuth";
import { dispatchWebhook, WEBHOOK_EVENTS } from "@/lib/webhooks";

/**
 * Calculate shadow score based on engagement
 * Lower engagement = higher shadow (more underground)
 * Scale: 0-10, higher = rarer
 */
function calculateShadowScore(
  playCount: number,
  voteCount: number,
  battleCount: number,
  dropCount: number
): number {
  const totalEngagement =
    playCount + voteCount * 2 + battleCount * 3 + dropCount * 5;
  const rawScore = 1 / Math.log(totalEngagement + 2);

  // Normalize to 0-10 scale
  let normalized = Math.min(rawScore * 15, 10);

  // Bonus for very low engagement (true underground)
  if (totalEngagement < 10) normalized = Math.min(normalized + 2, 10);
  else if (totalEngagement < 50) normalized = Math.min(normalized + 1, 10);

  return Math.round(normalized * 100) / 100;
}

const VALID_SIGNAL_TYPES = [
  "vote",
  "drop",
  "battle_win",
  "battle_loss",
  "mission_complete",
] as const;

type SignalType = (typeof VALID_SIGNAL_TYPES)[number];

/**
 * POST /api/v1/works/[id]/signal
 * Receive engagement signals from SELECTR
 */
async function handlePost(
  request: NextRequest,
  _context: ApiAuthContext,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: workId } = await params;
    const body = await request.json();
    const { signalType, userId, metadata } = body;

    // Validate signal type
    if (!signalType || !VALID_SIGNAL_TYPES.includes(signalType)) {
      return NextResponse.json(
        {
          error: "Invalid signal type",
          validTypes: VALID_SIGNAL_TYPES,
        },
        { status: 400 }
      );
    }

    // Verify work exists
    const work = await prisma.work.findUnique({
      where: { id: workId },
      select: { id: true },
    });

    if (!work) {
      return NextResponse.json({ error: "Work not found" }, { status: 404 });
    }

    // Create signal record
    const signal = await prisma.selectrSignal.create({
      data: {
        workId,
        signalType,
        userId: userId || null,
        metadata: metadata || null,
      },
    });

    // Update discovery signal
    let discoverySignal = await prisma.discoverySignal.findUnique({
      where: { workId },
    });

    if (!discoverySignal) {
      // Create if doesn't exist
      discoverySignal = await prisma.discoverySignal.create({
        data: {
          workId,
          shadowScore: 10,
          noveltyScore: 5,
        },
      });
    }

    // Update counters based on signal type
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    const typedSignalType = signalType as SignalType;

    switch (typedSignalType) {
      case "vote":
        updateData.voteCount = { increment: 1 };
        break;
      case "drop":
        updateData.dropCount = { increment: 1 };
        break;
      case "battle_win":
        updateData.battleCount = { increment: 1 };
        updateData.winCount = { increment: 1 };
        break;
      case "battle_loss":
        updateData.battleCount = { increment: 1 };
        break;
      case "mission_complete":
        // No specific counter, just track the signal
        break;
    }

    // Update discovery signal
    const updatedSignal = await prisma.discoverySignal.update({
      where: { workId },
      data: updateData,
    });

    // Recalculate shadow score
    const newShadowScore = calculateShadowScore(
      updatedSignal.playCount,
      updatedSignal.voteCount,
      updatedSignal.battleCount,
      updatedSignal.dropCount
    );

    await prisma.discoverySignal.update({
      where: { workId },
      data: { shadowScore: newShadowScore },
    });

    // Dispatch webhook
    await dispatchWebhook(WEBHOOK_EVENTS.SIGNAL_RECEIVED, {
      workId,
      signal: {
        id: signal.id,
        signalType,
        userId,
        metadata,
        createdAt: signal.createdAt.toISOString(),
      },
    });

    return NextResponse.json({
      received: true,
      workId,
      newVoteCount: updatedSignal.voteCount,
      newShadowScore,
    });
  } catch (error) {
    console.error("Error processing signal:", error);
    return NextResponse.json(
      { error: "Failed to process signal" },
      { status: 500 }
    );
  }
}

export const POST = withApiKeyAuthParams(handlePost, [API_SCOPES.SIGNALS_WRITE]);
