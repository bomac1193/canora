/**
 * Discovery API Routes
 * POST - Search works by emotion, filters, and discovery mode
 */

import { NextRequest, NextResponse } from "next/server";
import {
  withApiKeyAuth,
  API_SCOPES,
  type ApiAuthContext,
} from "@/lib/apiAuth";
import {
  discoverWorks,
  type DiscoveryQuery,
  type EmotionVector,
} from "@/lib/discovery";

/**
 * POST /api/v1/discover
 * Search for works using the discovery engine
 */
async function handlePost(
  request: NextRequest,
  _context: ApiAuthContext
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const {
      emotion,
      bpmRange,
      keys,
      shadowBias,
      noveltyBias,
      mode,
      limit,
      offset,
    } = body;

    // Validate emotion if provided
    let validatedEmotion: EmotionVector | undefined;
    if (emotion) {
      const emotionKeys = ["ecstatic", "yearning", "corrupted", "lucid", "divine", "feral"];
      validatedEmotion = {};
      for (const key of emotionKeys) {
        if (key in emotion && typeof emotion[key] === "number") {
          const value = emotion[key];
          if (value < 0 || value > 1) {
            return NextResponse.json(
              { error: `Emotion ${key} must be between 0 and 1` },
              { status: 400 }
            );
          }
          validatedEmotion[key as keyof EmotionVector] = value;
        }
      }
    }

    // Validate BPM range
    if (bpmRange) {
      if (!Array.isArray(bpmRange) || bpmRange.length !== 2) {
        return NextResponse.json(
          { error: "bpmRange must be [min, max] array" },
          { status: 400 }
        );
      }
      if (bpmRange[0] > bpmRange[1]) {
        return NextResponse.json(
          { error: "bpmRange min must be <= max" },
          { status: 400 }
        );
      }
    }

    // Validate mode
    const validModes = ["surface", "latent", "shadow"];
    if (mode && !validModes.includes(mode)) {
      return NextResponse.json(
        { error: `mode must be one of: ${validModes.join(", ")}` },
        { status: 400 }
      );
    }

    const query: DiscoveryQuery = {
      emotion: validatedEmotion,
      bpmRange: bpmRange as [number, number] | undefined,
      keys: keys as string[] | undefined,
      shadowBias: shadowBias === true,
      noveltyBias: noveltyBias === true,
      mode: mode as DiscoveryQuery["mode"],
      limit: Math.min(limit || 20, 100),
      offset: offset || 0,
    };

    const results = await discoverWorks(query);

    return NextResponse.json({
      results: results.map(r => ({
        work: {
          id: r.work.id,
          slug: r.work.slug,
          title: r.work.title,
          status: r.work.status,
          audioUrl: r.work.audioUrl,
        },
        score: r.score,
        components: r.components,
        explanation: r.explanation,
        signal: {
          shadowScore: r.signal.shadowScore,
          noveltyScore: r.signal.noveltyScore,
          bpm: r.signal.bpm,
          key: r.signal.key,
          energy: r.signal.energy,
          emotion: {
            ecstatic: r.signal.ecstatic,
            yearning: r.signal.yearning,
            corrupted: r.signal.corrupted,
            lucid: r.signal.lucid,
            divine: r.signal.divine,
            feral: r.signal.feral,
          },
        },
      })),
      query: {
        emotion: query.emotion,
        bpmRange: query.bpmRange,
        mode: query.mode,
        limit: query.limit,
        offset: query.offset,
      },
    });
  } catch (error) {
    console.error("Error in discovery search:", error);
    return NextResponse.json(
      { error: "Discovery search failed" },
      { status: 500 }
    );
  }
}

export const POST = withApiKeyAuth(handlePost, [API_SCOPES.WORKS_READ]);
