/**
 * Vibe Map API Routes
 * GET - Get UMAP coordinates for visualization
 */

import { NextRequest, NextResponse } from "next/server";
import {
  withApiKeyAuth,
  API_SCOPES,
  type ApiAuthContext,
} from "@/lib/apiAuth";
import { getVibeMap } from "@/lib/discovery";

/**
 * GET /api/v1/discover/vibe-map
 * Get UMAP 2D coordinates for all analyzed works
 */
async function handleGet(
  _request: NextRequest,
  _context: ApiAuthContext
): Promise<NextResponse> {
  try {
    const coordinates = await getVibeMap();

    return NextResponse.json({
      coordinates,
      count: coordinates.length,
    });
  } catch (error) {
    console.error("Error getting vibe map:", error);
    return NextResponse.json(
      { error: "Failed to get vibe map" },
      { status: 500 }
    );
  }
}

export const GET = withApiKeyAuth(handleGet, [API_SCOPES.WORKS_READ]);
