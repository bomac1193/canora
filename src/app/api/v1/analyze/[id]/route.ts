/**
 * Audio Analysis API Routes
 * POST - Trigger Etherfeed analysis for a work
 * GET - Get analysis status/results
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withApiKeyAuthParams,
  API_SCOPES,
  type ApiAuthContext,
} from "@/lib/apiAuth";
import { analyzeWork, isEtherfeedAvailable } from "@/lib/etherfeed";

/**
 * POST /api/v1/analyze/[id]
 * Trigger audio analysis for a work
 */
async function handlePost(
  _request: NextRequest,
  _context: ApiAuthContext,
  { params }: { params: Promise<Record<string, string>> }
): Promise<NextResponse> {
  try {
    const { id: workId } = await params;

    // Check if work exists
    const work = await prisma.work.findUnique({
      where: { id: workId },
      select: { id: true, audioUrl: true },
    });

    if (!work) {
      return NextResponse.json({ error: "Work not found" }, { status: 404 });
    }

    if (!work.audioUrl) {
      return NextResponse.json(
        { error: "Work has no audio URL" },
        { status: 400 }
      );
    }

    // Check if Etherfeed is available
    const available = await isEtherfeedAvailable();
    if (!available) {
      return NextResponse.json(
        { error: "Etherfeed service unavailable" },
        { status: 503 }
      );
    }

    // Check if already queued/processing
    const existingJob = await prisma.analysisJob.findFirst({
      where: {
        workId,
        status: { in: ["queued", "processing"] },
      },
    });

    if (existingJob) {
      return NextResponse.json({
        status: "already_queued",
        jobId: existingJob.id,
        message: "Analysis already in progress",
      });
    }

    // Trigger analysis
    await analyzeWork(workId);

    return NextResponse.json({
      status: "queued",
      workId,
      message: "Analysis queued successfully",
    });
  } catch (error) {
    console.error("Error triggering analysis:", error);
    return NextResponse.json(
      { error: "Failed to trigger analysis" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/analyze/[id]
 * Get analysis status and results for a work
 */
async function handleGet(
  _request: NextRequest,
  _context: ApiAuthContext,
  { params }: { params: Promise<Record<string, string>> }
): Promise<NextResponse> {
  try {
    const { id: workId } = await params;

    // Get discovery signal (contains analysis results)
    const signal = await prisma.discoverySignal.findUnique({
      where: { workId },
    });

    // Get latest job status
    const job = await prisma.analysisJob.findFirst({
      where: { workId },
      orderBy: { queuedAt: "desc" },
    });

    // Get full audio analysis if available
    const analysis = await prisma.audioAnalysis.findUnique({
      where: { workId },
    });

    if (!signal && !job) {
      return NextResponse.json({
        status: "not_analyzed",
        message: "Work has not been analyzed. POST to this endpoint to trigger analysis.",
      });
    }

    return NextResponse.json({
      workId,
      status: job?.status || (signal ? "completed" : "unknown"),
      job: job
        ? {
            id: job.id,
            status: job.status,
            attempts: job.attempts,
            error: job.error,
            queuedAt: job.queuedAt,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
          }
        : null,
      signal: signal
        ? {
            shadowScore: signal.shadowScore,
            noveltyScore: signal.noveltyScore,
            bpm: signal.bpm,
            key: signal.key,
            energy: signal.energy,
            valence: signal.valence,
            danceability: signal.danceability,
            emotion: {
              ecstatic: signal.ecstatic,
              yearning: signal.yearning,
              corrupted: signal.corrupted,
              lucid: signal.lucid,
              divine: signal.divine,
              feral: signal.feral,
            },
            umapX: signal.umapX,
            umapY: signal.umapY,
            hasEmbedding: signal.embedding.length > 0,
            analysisSource: signal.analysisSource,
            computedAt: signal.computedAt,
          }
        : null,
      hasFullAnalysis: !!analysis,
    });
  } catch (error) {
    console.error("Error getting analysis status:", error);
    return NextResponse.json(
      { error: "Failed to get analysis status" },
      { status: 500 }
    );
  }
}

export const POST = withApiKeyAuthParams(handlePost, [API_SCOPES.WORKS_WRITE]);
export const GET = withApiKeyAuthParams(handleGet, [API_SCOPES.WORKS_READ]);
