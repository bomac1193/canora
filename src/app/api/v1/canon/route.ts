/**
 * Canon API Routes
 * GET - List all CANON status works
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withApiKeyAuth,
  API_SCOPES,
  type ApiAuthContext,
} from "@/lib/apiAuth";

/**
 * GET /api/v1/canon
 * List all CANON status works
 */
async function handleGet(
  request: NextRequest,
  _context: ApiAuthContext
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);

    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const since = searchParams.get("since");

    const where: Record<string, unknown> = {
      status: "CANON",
    };

    // Filter by canonized date if provided
    if (since) {
      where.canonLockedAt = {
        gte: new Date(since),
      };
    }

    // Cursor-based pagination
    const cursorObj = cursor ? { id: cursor } : undefined;

    const works = await prisma.work.findMany({
      where,
      orderBy: { canonLockedAt: "desc" },
      take: limit + 1,
      ...(cursorObj && { cursor: cursorObj, skip: 1 }),
      include: {
        contributions: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        canonLockedBy: {
          select: { id: true, name: true },
        },
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

    const hasMore = works.length > limit;
    if (hasMore) {
      works.pop();
    }

    const nextCursor = hasMore ? works[works.length - 1]?.id : null;

    const formattedWorks = works.map((work) => ({
      id: work.id,
      slug: work.slug,
      title: work.title,
      description: work.description,
      audioUrl: work.audioUrl,
      ctadId: work.ctadId,
      ctadMetadata: work.ctadMetadata,
      canonLockedAt: work.canonLockedAt?.toISOString(),
      canonLockedBy: work.canonLockedBy,
      createdAt: work.createdAt.toISOString(),
      contributions: work.contributions,
      lineage: {
        parents: work.parentEdges.map((edge) => ({
          ...edge.fromWork,
          edgeType: edge.type,
        })),
        children: work.childEdges.map((edge) => ({
          ...edge.toWork,
          edgeType: edge.type,
        })),
      },
    }));

    return NextResponse.json({
      works: formattedWorks,
      nextCursor,
    });
  } catch (error) {
    console.error("Error listing canon works:", error);
    return NextResponse.json(
      { error: "Failed to list canon works" },
      { status: 500 }
    );
  }
}

export const GET = withApiKeyAuth(handleGet, [API_SCOPES.WORKS_READ]);
