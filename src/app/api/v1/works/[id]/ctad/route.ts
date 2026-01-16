/**
 * Work CTAD API Routes
 * POST - Update CTAD metadata for a work
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withApiKeyAuthParams,
  API_SCOPES,
  type ApiAuthContext,
} from "@/lib/apiAuth";
import {
  mergeCTAD,
  validateCTAD,
  type CTADMetadata,
} from "@/lib/ctad";

/**
 * POST /api/v1/works/[id]/ctad
 * Update CTAD metadata for a work
 * Can only update JAM or PLATE works (not CANON - immutable)
 */
async function handlePost(
  request: NextRequest,
  _context: ApiAuthContext,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: workId } = await params;
    const body = await request.json();
    const { ctad: ctadUpdates } = body;

    if (!ctadUpdates) {
      return NextResponse.json(
        { error: "CTAD updates required" },
        { status: 400 }
      );
    }

    // Fetch the work
    const work = await prisma.work.findUnique({
      where: { id: workId },
      select: {
        id: true,
        status: true,
        ctadMetadata: true,
      },
    });

    if (!work) {
      return NextResponse.json({ error: "Work not found" }, { status: 404 });
    }

    // Check if work is CANON (immutable)
    if (work.status === "CANON") {
      return NextResponse.json(
        { error: "Cannot update CTAD for CANON works - they are immutable" },
        { status: 403 }
      );
    }

    // Get existing CTAD or create minimal one
    const existingCTAD = work.ctadMetadata as CTADMetadata | null;
    if (!existingCTAD) {
      return NextResponse.json(
        { error: "Work has no CTAD metadata to update" },
        { status: 400 }
      );
    }

    // Merge updates
    const mergedCTAD = mergeCTAD(existingCTAD, ctadUpdates);

    // Validate the merged CTAD
    const validation = validateCTAD(mergedCTAD);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Invalid CTAD after merge", details: validation.errors },
        { status: 400 }
      );
    }

    // Update the work
    await prisma.work.update({
      where: { id: workId },
      data: {
        ctadMetadata: mergedCTAD as unknown as Record<string, unknown>,
      },
    });

    return NextResponse.json({
      success: true,
      ctad: mergedCTAD,
    });
  } catch (error) {
    console.error("Error updating CTAD:", error);
    return NextResponse.json(
      { error: "Failed to update CTAD" },
      { status: 500 }
    );
  }
}

export const POST = withApiKeyAuthParams(handlePost, [API_SCOPES.WORKS_WRITE]);
