/**
 * Individual Work API Routes
 * GET - Get full work details with lineage and contributions
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withApiKeyAuthParams,
  API_SCOPES,
  type ApiAuthContext,
} from "@/lib/apiAuth";

/**
 * GET /api/v1/works/[id]
 * Get full work details including relations
 */
async function handleGet(
  _request: NextRequest,
  _context: ApiAuthContext,
  { params }: { params: Promise<Record<string, string>> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    const work = await prisma.work.findUnique({
      where: { id },
      include: {
        contributions: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        promotionEvents: {
          orderBy: { createdAt: "desc" },
          include: {
            signedBy: {
              select: { id: true, name: true },
            },
          },
        },
        discoverySignal: true,
        o8Provenance: true,
        canonLockedBy: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
        // Lineage: parent works (works this was derived from)
        parentEdges: {
          include: {
            fromWork: {
              select: {
                id: true,
                slug: true,
                title: true,
                status: true,
                ctadId: true,
              },
            },
          },
        },
        // Lineage: child works (works derived from this)
        childEdges: {
          include: {
            toWork: {
              select: {
                id: true,
                slug: true,
                title: true,
                status: true,
                ctadId: true,
              },
            },
          },
        },
      },
    });

    if (!work) {
      return NextResponse.json({ error: "Work not found" }, { status: 404 });
    }

    // Build lineage structure
    const lineage = {
      parents: work.parentEdges.map((edge) => ({
        ...edge.fromWork,
        edgeType: edge.type,
      })),
      children: work.childEdges.map((edge) => ({
        ...edge.toWork,
        edgeType: edge.type,
      })),
      edges: [
        ...work.parentEdges.map((e) => ({
          id: e.id,
          type: e.type,
          fromWorkId: e.fromWorkId,
          toWorkId: work.id,
        })),
        ...work.childEdges.map((e) => ({
          id: e.id,
          type: e.type,
          fromWorkId: work.id,
          toWorkId: e.toWorkId,
        })),
      ],
    };

    // Format response
    const response = {
      work: {
        id: work.id,
        slug: work.slug,
        title: work.title,
        description: work.description,
        status: work.status,
        audioUrl: work.audioUrl,
        ctadId: work.ctadId,
        ctadMetadata: work.ctadMetadata,
        issuanceId: work.issuanceId,
        issuanceFingerprint: work.issuanceFingerprint,
        canonLockedAt: work.canonLockedAt?.toISOString() || null,
        canonLockedBy: work.canonLockedBy,
        createdBy: work.createdBy,
        createdAt: work.createdAt.toISOString(),
        updatedAt: work.updatedAt.toISOString(),
        contributions: work.contributions,
        lineage,
        discoverySignal: work.discoverySignal,
        promotionHistory: work.promotionEvents.map((e) => ({
          id: e.id,
          fromStatus: e.fromStatus,
          toStatus: e.toStatus,
          justification: e.justification,
          signedBy: e.signedBy,
          signedByDisplayName: e.signedByDisplayName,
          createdAt: e.createdAt.toISOString(),
        })),
        o8Provenance: work.o8Provenance,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching work:", error);
    return NextResponse.json(
      { error: "Failed to fetch work" },
      { status: 500 }
    );
  }
}

export const GET = withApiKeyAuthParams(handleGet, [API_SCOPES.WORKS_READ]);
