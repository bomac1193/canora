/**
 * Work Provenance API Routes
 * POST - Attach O8 provenance to a work
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  withApiKeyAuthParams,
  API_SCOPES,
  type ApiAuthContext,
} from "@/lib/apiAuth";
import { type CTADMetadata } from "@/lib/ctad";

/**
 * POST /api/v1/works/[id]/provenance
 * Attach O8 provenance to a work (placeholder for future extension)
 */
async function handlePost(
  request: NextRequest,
  _context: ApiAuthContext,
  { params }: { params: Promise<Record<string, string>> }
): Promise<NextResponse> {
  try {
    const { id: workId } = await params;
    const body = await request.json();
    const {
      platform,
      platformVersion,
      generatedAt,
      prompt,
      negativePrompt,
      parameters,
      originalAudioUrl,
      originalTitle,
      creatorPlatformId,
      creatorPlatformName,
      signature,
      publicKey,
      signedAt,
      signatureAlgorithm,
    } = body;

    // Validate required fields
    if (!platform) {
      return NextResponse.json(
        { error: "platform is required" },
        { status: 400 }
      );
    }
    if (!generatedAt) {
      return NextResponse.json(
        { error: "generatedAt is required" },
        { status: 400 }
      );
    }
    if (!prompt) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }
    if (!signature) {
      return NextResponse.json(
        { error: "signature is required" },
        { status: 400 }
      );
    }
    if (!publicKey) {
      return NextResponse.json(
        { error: "publicKey is required" },
        { status: 400 }
      );
    }
    if (!signedAt) {
      return NextResponse.json(
        { error: "signedAt is required" },
        { status: 400 }
      );
    }
    if (!creatorPlatformId) {
      return NextResponse.json(
        { error: "creatorPlatformId is required" },
        { status: 400 }
      );
    }

    // Verify work exists
    const work = await prisma.work.findUnique({
      where: { id: workId },
      select: { id: true, ctadMetadata: true },
    });

    if (!work) {
      return NextResponse.json({ error: "Work not found" }, { status: 404 });
    }

    // Check if provenance already exists
    const existingProvenance = await prisma.o8Provenance.findUnique({
      where: { workId },
    });

    if (existingProvenance) {
      return NextResponse.json(
        { error: "Provenance already exists for this work" },
        { status: 409 }
      );
    }

    // Create provenance record
    // Note: Actual verification will happen when O8 extension is built
    const provenance = await prisma.o8Provenance.create({
      data: {
        workId,
        platform,
        platformVersion: platformVersion || null,
        generatedAt: new Date(generatedAt),
        prompt,
        negativePrompt: negativePrompt || null,
        parameters: parameters || null,
        originalAudioUrl: originalAudioUrl || null,
        originalTitle: originalTitle || null,
        creatorPlatformId,
        creatorPlatformName: creatorPlatformName || null,
        signatureAlgorithm: signatureAlgorithm || "ed25519",
        publicKey,
        signature,
        signedAt: new Date(signedAt),
        verified: false, // Actual verification when O8 extension is built
      },
    });

    // Update CTAD with provenance reference
    if (work.ctadMetadata) {
      const ctad = work.ctadMetadata as unknown as CTADMetadata;
      const updatedAi = {
        ...ctad.ai,
        involved: true,
        o8ProvenanceId: provenance.id,
        platforms: [
          ...(ctad.ai?.platforms || []),
          {
            name: platform,
            version: platformVersion,
            role: "full_generation" as const,
          },
        ],
      };

      await prisma.work.update({
        where: { id: workId },
        data: {
          ctadMetadata: {
            ...ctad,
            ai: updatedAi,
            timestamps: {
              ...ctad.timestamps,
              generated: generatedAt,
              modified: new Date().toISOString(),
            },
          } as unknown as Prisma.InputJsonValue,
        },
      });
    }

    return NextResponse.json({
      success: true,
      provenanceId: provenance.id,
      verified: false,
    });
  } catch (error) {
    console.error("Error creating provenance:", error);
    return NextResponse.json(
      { error: "Failed to create provenance" },
      { status: 500 }
    );
  }
}

export const POST = withApiKeyAuthParams(handlePost, [API_SCOPES.WORKS_WRITE]);
