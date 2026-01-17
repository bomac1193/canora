/**
 * Similar Works API Routes
 * GET - Find works similar to a given work
 */

import { NextRequest, NextResponse } from "next/server";
import {
  withApiKeyAuthParams,
  API_SCOPES,
  type ApiAuthContext,
} from "@/lib/apiAuth";
import { findSimilar } from "@/lib/discovery";

/**
 * GET /api/v1/discover/similar/[id]
 * Find works similar to the given work ID
 */
async function handleGet(
  request: NextRequest,
  _context: ApiAuthContext,
  { params }: { params: Promise<Record<string, string>> }
): Promise<NextResponse> {
  try {
    const { id: workId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

    const results = await findSimilar(workId, limit);

    if (results.length === 0) {
      return NextResponse.json({
        results: [],
        message: "No similar works found. Work may not have been analyzed yet.",
      });
    }

    return NextResponse.json({
      sourceWorkId: workId,
      results: results.map(r => ({
        work: {
          id: r.work.id,
          slug: r.work.slug,
          title: r.work.title,
          status: r.work.status,
          audioUrl: r.work.audioUrl,
        },
        similarity: r.components.similarity,
        score: r.score,
        explanation: r.explanation,
      })),
    });
  } catch (error) {
    console.error("Error finding similar works:", error);
    return NextResponse.json(
      { error: "Failed to find similar works" },
      { status: 500 }
    );
  }
}

export const GET = withApiKeyAuthParams(handleGet, [API_SCOPES.WORKS_READ]);
