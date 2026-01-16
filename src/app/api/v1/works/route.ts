/**
 * V1 Works API Routes
 * GET - List works with filtering (requires API key, scope: works:read)
 * POST - Create new work as JAM (requires API key, scope: works:write)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withApiKeyAuth,
  API_SCOPES,
  type ApiAuthContext,
} from "@/lib/apiAuth";
import { generateSlug } from "@/lib/utils";
import {
  buildCTADFromInput,
  resolveCTADLineage,
  setCanoraId,
  type CTADMetadata,
  validateCTAD,
} from "@/lib/ctad";
import { dispatchWebhook, WEBHOOK_EVENTS } from "@/lib/webhooks";
import { WorkStatus, Prisma } from "@prisma/client";

/**
 * GET /api/v1/works
 * List works with filtering
 */
async function handleGet(
  request: NextRequest,
  _context: ApiAuthContext
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status") as WorkStatus | null;
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const orderBy = searchParams.get("orderBy") || "createdAt";
    const order = searchParams.get("order") || "desc";

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    // Cursor-based pagination
    const cursorObj = cursor ? { id: cursor } : undefined;

    const works = await prisma.work.findMany({
      where,
      orderBy: { [orderBy]: order },
      take: limit + 1, // Take one extra to check for next page
      ...(cursorObj && { cursor: cursorObj, skip: 1 }),
      include: {
        contributions: true,
        discoverySignal: true,
        promotionEvents: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const hasMore = works.length > limit;
    if (hasMore) {
      works.pop(); // Remove the extra item
    }

    const nextCursor = hasMore ? works[works.length - 1]?.id : null;

    // Get total count
    const total = await prisma.work.count({ where });

    return NextResponse.json({
      works: works.map((w) => ({
        ...w,
        ctad: w.ctadMetadata,
      })),
      nextCursor,
      total,
    });
  } catch (error) {
    console.error("Error listing works:", error);
    return NextResponse.json(
      { error: "Failed to list works" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/works
 * Create a new work with JAM status
 */
async function handlePost(
  request: NextRequest,
  context: ApiAuthContext
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const {
      title,
      audioUrl,
      description,
      contributions,
      parentWorkIds,
      edgeType,
      metadata,
      ctad: providedCTAD,
      ai,
    } = body;

    // Validate required fields
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!audioUrl || typeof audioUrl !== "string") {
      return NextResponse.json(
        { error: "Audio URL is required" },
        { status: 400 }
      );
    }

    // Build or use provided CTAD
    let ctad: CTADMetadata;
    if (providedCTAD) {
      // Validate provided CTAD
      const validation = validateCTAD(providedCTAD);
      if (!validation.valid) {
        return NextResponse.json(
          { error: "Invalid CTAD", details: validation.errors },
          { status: 400 }
        );
      }
      ctad = providedCTAD;
    } else {
      // Build CTAD from input
      ctad = buildCTADFromInput({
        title: title.trim(),
        contributions,
        ai,
        metadata,
        parentWorkIds,
      });
    }

    // Resolve lineage if parent work IDs provided
    if (parentWorkIds && parentWorkIds.length > 0) {
      ctad = await resolveCTADLineage(ctad);
    }

    const slug = generateSlug(title);

    // Create work
    const work = await prisma.work.create({
      data: {
        slug,
        title: title.trim(),
        description: description?.trim() || null,
        audioUrl,
        status: "JAM",
        ctadId: ctad.id.ctad,
        ctadMetadata: ctad as unknown as Prisma.InputJsonValue,
        createdByUserId: context.userId,
        // Create contributions
        contributions: contributions?.length > 0
          ? {
              create: contributions.map(
                (c: {
                  role: string;
                  displayName: string;
                  userId?: string;
                }) => ({
                  displayName: c.displayName,
                  role: c.role || "SOUND",
                  userId: c.userId || null,
                })
              ),
            }
          : {
              create: {
                displayName: "Creator",
                role: "SOUND",
                userId: context.userId,
              },
            },
        // Create parent edges if forking
        ...(parentWorkIds?.length > 0 && {
          parentEdges: {
            create: parentWorkIds.map((parentId: string) => ({
              fromWorkId: parentId,
              type: edgeType || "DERIVED",
            })),
          },
        }),
      },
      include: {
        contributions: true,
        parentEdges: {
          include: {
            fromWork: {
              select: { id: true, slug: true, title: true, status: true },
            },
          },
        },
      },
    });

    // Update CTAD with canora ID
    const finalCTAD = setCanoraId(ctad, work.id);
    await prisma.work.update({
      where: { id: work.id },
      data: { ctadMetadata: finalCTAD as unknown as Prisma.InputJsonValue },
    });

    // Create initial discovery signal
    await prisma.discoverySignal.create({
      data: {
        workId: work.id,
        shadowScore: 10, // High shadow = undiscovered
        noveltyScore: 5,
      },
    });

    // Dispatch webhook
    await dispatchWebhook(WEBHOOK_EVENTS.WORK_CREATED, {
      work: {
        ...work,
        ctad: finalCTAD,
      },
    });

    return NextResponse.json(
      {
        id: work.id,
        slug: work.slug,
        status: work.status,
        ctadId: finalCTAD.id.ctad,
        createdAt: work.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating work:", error);
    return NextResponse.json(
      { error: "Failed to create work" },
      { status: 500 }
    );
  }
}

export const GET = withApiKeyAuth(handleGet, [API_SCOPES.WORKS_READ]);
export const POST = withApiKeyAuth(handlePost, [API_SCOPES.WORKS_WRITE]);
