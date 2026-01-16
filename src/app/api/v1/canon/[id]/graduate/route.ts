/**
 * Canon Graduate API Routes
 * POST - Graduate CANON work to ISSUANCE (placeholder)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withApiKeyAuthParams,
  API_SCOPES,
  type ApiAuthContext,
} from "@/lib/apiAuth";

const VALID_SETTLEMENT_RULES = [
  "IMMEDIATE",
  "ON_FIRST_PLAY",
  "ON_TRANSFER",
  "CUSTOM",
] as const;

/**
 * POST /api/v1/canon/[id]/graduate
 * Graduate CANON work to ISSUANCE for settlement
 * This is a placeholder - actual ISSUANCE integration to be added
 */
async function handlePost(
  request: NextRequest,
  _context: ApiAuthContext,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: workId } = await params;
    const body = await request.json();
    const { settlementRules } = body;

    // Validate settlement rules
    if (
      !settlementRules ||
      !VALID_SETTLEMENT_RULES.includes(settlementRules)
    ) {
      return NextResponse.json(
        {
          error: "Invalid settlement rules",
          validRules: VALID_SETTLEMENT_RULES,
        },
        { status: 400 }
      );
    }

    // Fetch the work
    const work = await prisma.work.findUnique({
      where: { id: workId },
      select: {
        id: true,
        status: true,
        ctadId: true,
        ctadMetadata: true,
        issuanceId: true,
      },
    });

    if (!work) {
      return NextResponse.json({ error: "Work not found" }, { status: 404 });
    }

    // Verify work is CANON
    if (work.status !== "CANON") {
      return NextResponse.json(
        { error: "Only CANON works can be graduated to ISSUANCE" },
        { status: 400 }
      );
    }

    // Check if already graduated
    if (work.issuanceId) {
      return NextResponse.json(
        {
          error: "Work has already been graduated to ISSUANCE",
          issuanceId: work.issuanceId,
        },
        { status: 409 }
      );
    }

    // Placeholder response - actual ISSUANCE integration to be added
    // In production, this would:
    // 1. Call ISSUANCE API to register the asset
    // 2. Generate SINC fingerprint
    // 3. Store issuanceId and fingerprint on the work

    return NextResponse.json({
      success: true,
      message: "ISSUANCE integration pending - work queued for graduation",
      workId: work.id,
      ctadId: work.ctadId,
      settlementRules,
      status: "PENDING_INTEGRATION",
    });
  } catch (error) {
    console.error("Error graduating work:", error);
    return NextResponse.json(
      { error: "Failed to graduate work" },
      { status: 500 }
    );
  }
}

export const POST = withApiKeyAuthParams(handlePost, [
  API_SCOPES.CANON_GRADUATE,
]);
