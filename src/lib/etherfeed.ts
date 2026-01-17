/**
 * Etherfeed Client
 * HTTP client for calling Etherfeed Python service
 *
 * Etherfeed provides:
 * - Audio analysis via Essentia (100+ features)
 * - Embedding generation
 * - FAISS similarity search
 * - UMAP dimensionality reduction
 * - Rekordbox/Serato library import
 */

import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";
import { updateDiscoverySignal, type EmotionVector } from "./discovery";

// ============================================
// CONFIGURATION
// ============================================

const ETHERFEED_URL = process.env.ETHERFEED_URL || "http://localhost:8000";
const ETHERFEED_TIMEOUT = 30000; // 30s for audio analysis

// ============================================
// TYPES
// ============================================

export interface EtherfeedAnalysisRequest {
  audioUrl: string;
  workId: string;
  priority?: number;
}

export interface EtherfeedAnalysisResponse {
  workId: string;
  embedding: number[];
  emotion: EmotionVector;
  audioFeatures: {
    bpm: number;
    key: string;
    energy: number;
    valence: number;
    danceability: number;
    duration: number;
  };
  essentia: Record<string, unknown>;  // Full Essentia analysis
  shadowScore: number;
  noveltyScore: number;
  umapCoordinates?: {
    x: number;
    y: number;
  };
}

export interface EtherfeedSimilarityRequest {
  embedding: number[];
  k?: number;
  threshold?: number;
}

export interface EtherfeedSimilarityResponse {
  results: Array<{
    trackId: string;
    similarity: number;
  }>;
}

export interface EtherfeedUMAPResponse {
  coordinates: Array<{
    trackId: string;
    x: number;
    y: number;
  }>;
}

export interface EtherfeedHealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  faissIndexSize: number;
  umapTrained: boolean;
}

// ============================================
// CLIENT CLASS
// ============================================

class EtherfeedClient {
  private baseUrl: string;

  constructor(baseUrl: string = ETHERFEED_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Check Etherfeed service health
   */
  async health(): Promise<EtherfeedHealthResponse> {
    const response = await fetch(`${this.baseUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Etherfeed health check failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Request audio analysis for a work
   * This is async - returns a job ID that can be polled
   */
  async analyzeAudio(request: EtherfeedAnalysisRequest): Promise<{ jobId: string }> {
    const response = await fetch(`${this.baseUrl}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audio_url: request.audioUrl,
        work_id: request.workId,
        priority: request.priority ?? 0,
      }),
      signal: AbortSignal.timeout(ETHERFEED_TIMEOUT),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Etherfeed analysis failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Get analysis result by job ID
   */
  async getAnalysisResult(jobId: string): Promise<EtherfeedAnalysisResponse | null> {
    const response = await fetch(`${this.baseUrl}/analyze/${jobId}`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (response.status === 404) {
      return null;
    }

    if (response.status === 202) {
      // Still processing
      return null;
    }

    if (!response.ok) {
      throw new Error(`Etherfeed get result failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Synchronous analysis - waits for result
   * Use for small files or when you need immediate results
   */
  async analyzeAudioSync(request: EtherfeedAnalysisRequest): Promise<EtherfeedAnalysisResponse> {
    const response = await fetch(`${this.baseUrl}/analyze/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audio_url: request.audioUrl,
        work_id: request.workId,
      }),
      signal: AbortSignal.timeout(60000), // 60s for sync analysis
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Etherfeed sync analysis failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Find similar tracks using FAISS
   */
  async findSimilar(request: EtherfeedSimilarityRequest): Promise<EtherfeedSimilarityResponse> {
    const response = await fetch(`${this.baseUrl}/similarity/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embedding: request.embedding,
        k: request.k ?? 20,
        threshold: request.threshold ?? 0.3,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Etherfeed similarity search failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Add embedding to FAISS index
   */
  async addToIndex(trackId: string, embedding: number[]): Promise<void> {
    const response = await fetch(`${this.baseUrl}/similarity/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        track_id: trackId,
        embedding,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Etherfeed add to index failed: ${response.status}`);
    }
  }

  /**
   * Get UMAP coordinates for all indexed tracks
   */
  async getUMAP(): Promise<EtherfeedUMAPResponse> {
    const response = await fetch(`${this.baseUrl}/map/umap`, {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Etherfeed UMAP failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Rebuild FAISS index and UMAP from all embeddings
   */
  async rebuildIndex(): Promise<{ trackCount: number }> {
    const response = await fetch(`${this.baseUrl}/index/rebuild`, {
      method: "POST",
      signal: AbortSignal.timeout(120000), // 2 min for large rebuilds
    });

    if (!response.ok) {
      throw new Error(`Etherfeed rebuild failed: ${response.status}`);
    }

    return response.json();
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const etherfeed = new EtherfeedClient();

// ============================================
// HIGH-LEVEL FUNCTIONS
// ============================================

/**
 * Analyze a work and store results in CANORA
 */
export async function analyzeWork(workId: string): Promise<void> {
  // Get work
  const work = await prisma.work.findUnique({
    where: { id: workId },
    select: { id: true, audioUrl: true },
  });

  if (!work || !work.audioUrl) {
    throw new Error(`Work ${workId} not found or has no audio`);
  }

  // Create job record
  const job = await prisma.analysisJob.create({
    data: {
      workId,
      audioUrl: work.audioUrl,
      status: "queued",
    },
  });

  try {
    // Request analysis from Etherfeed
    const { jobId } = await etherfeed.analyzeAudio({
      workId,
      audioUrl: work.audioUrl,
    });

    // Update job with Etherfeed job ID
    await prisma.analysisJob.update({
      where: { id: job.id },
      data: {
        etherfeedJobId: jobId,
        status: "processing",
        startedAt: new Date(),
      },
    });
  } catch (error) {
    // Mark job as failed
    await prisma.analysisJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

/**
 * Process completed analysis from Etherfeed
 */
export async function processAnalysisResult(result: EtherfeedAnalysisResponse): Promise<void> {
  const { workId, embedding, emotion, audioFeatures, essentia, shadowScore, noveltyScore, umapCoordinates } = result;

  // Update discovery signal
  await updateDiscoverySignal(workId, {
    embedding,
    emotion,
    bpm: audioFeatures.bpm,
    key: audioFeatures.key,
    energy: audioFeatures.energy,
    valence: audioFeatures.valence,
    danceability: audioFeatures.danceability,
    shadowScore,
    noveltyScore,
    umapX: umapCoordinates?.x,
    umapY: umapCoordinates?.y,
  });

  // Store full analysis
  await prisma.audioAnalysis.upsert({
    where: { workId },
    create: {
      workId,
      audioUrl: "", // Will be filled from work
      duration: audioFeatures.duration,
      essentia: essentia as unknown as Prisma.InputJsonValue,
      fullEmbedding: embedding,
      status: "completed",
      etherfeedVersion: "1.0",
    },
    update: {
      duration: audioFeatures.duration,
      essentia: essentia as unknown as Prisma.InputJsonValue,
      fullEmbedding: embedding,
      status: "completed",
      updatedAt: new Date(),
    },
  });

  // Add to FAISS index
  await etherfeed.addToIndex(workId, embedding);
}

/**
 * Poll for pending analysis jobs and process results
 */
export async function pollAnalysisJobs(): Promise<number> {
  const pendingJobs = await prisma.analysisJob.findMany({
    where: {
      status: "processing",
      etherfeedJobId: { not: null },
    },
    take: 10,
  });

  let processed = 0;

  for (const job of pendingJobs) {
    try {
      const result = await etherfeed.getAnalysisResult(job.etherfeedJobId!);

      if (result) {
        await processAnalysisResult(result);

        await prisma.analysisJob.update({
          where: { id: job.id },
          data: {
            status: "completed",
            result: result as unknown as Prisma.InputJsonValue,
            completedAt: new Date(),
          },
        });

        processed++;
      }
    } catch (error) {
      const attempts = job.attempts + 1;

      await prisma.analysisJob.update({
        where: { id: job.id },
        data: {
          attempts,
          status: attempts >= job.maxAttempts ? "failed" : "processing",
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  return processed;
}

/**
 * Sync UMAP coordinates from Etherfeed
 */
export async function syncUMAPCoordinates(): Promise<number> {
  const { coordinates } = await etherfeed.getUMAP();

  let updated = 0;

  for (const coord of coordinates) {
    await prisma.discoverySignal.updateMany({
      where: { workId: coord.trackId },
      data: {
        umapX: coord.x,
        umapY: coord.y,
      },
    });
    updated++;
  }

  return updated;
}

/**
 * Check if Etherfeed is available
 */
export async function isEtherfeedAvailable(): Promise<boolean> {
  try {
    const health = await etherfeed.health();
    return health.status === "healthy";
  } catch {
    return false;
  }
}
