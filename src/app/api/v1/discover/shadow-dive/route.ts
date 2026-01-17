/**
 * Shadow Dive API Routes
 * GET - Deep dive into underground/rare tracks
 */

import { NextRequest, NextResponse } from "next/server";
import {
  withApiKeyAuth,
  API_SCOPES,
  type ApiAuthContext,
} from "@/lib/apiAuth";
import { shadowDive } from "@/lib/discovery";

/**
 * GET /api/v1/discover/shadow-dive
 * Find the most underground tracks
 */
async function handleGet(
  request: NextRequest,
  _context: ApiAuthContext
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const maxPlays = parseInt(searchParams.get("maxPlays") || "1000");

    const results = await shadowDive({ limit, maxPlays });

    return NextResponse.json({
      results: results.map(r => ({
        work: {
          id: r.work.id,
          slug: r.work.slug,
          title: r.work.title,
          status: r.work.status,
          audioUrl: r.work.audioUrl,
        },
        shadowScore: r.signal.shadowScore,
        noveltyScore: r.signal.noveltyScore,
        playCount: r.signal.playCount,
        explanation: r.explanation,
      })),
      filters: {
        maxPlays,
        limit,
      },
    });
  } catch (error) {
    console.error("Error in shadow dive:", error);
    return NextResponse.json(
      { error: "Shadow dive failed" },
      { status: 500 }
    );
  }
}

export const GET = withApiKeyAuth(handleGet, [API_SCOPES.WORKS_READ]);
