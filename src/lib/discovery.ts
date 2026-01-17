/**
 * Discovery Engine
 * Scoring algorithms for underground music discovery
 *
 * Ported from Etherfeed's Python implementation
 */

import { prisma } from "./prisma";
import type { DiscoverySignal, Work } from "@prisma/client";

// ============================================
// TYPES
// ============================================

export interface EmotionVector {
  ecstatic?: number;
  yearning?: number;
  corrupted?: number;
  lucid?: number;
  divine?: number;
  feral?: number;
}

export interface DiscoveryQuery {
  // Emotion-based search
  emotion?: EmotionVector;

  // Filters
  bpmRange?: [number, number];
  keys?: string[];

  // Bias controls
  shadowBias?: boolean;    // Prefer underground tracks
  noveltyBias?: boolean;   // Prefer experimental tracks

  // Search mode
  mode?: "surface" | "latent" | "shadow";

  // Pagination
  limit?: number;
  offset?: number;
}

export interface ScoredWork {
  work: Work;
  signal: DiscoverySignal;
  score: number;
  components: {
    similarity?: number;
    emotionFit?: number;
    shadowBoost?: number;
    noveltyBoost?: number;
    recency?: number;
  };
  explanation: string[];
}

// ============================================
// SCORING WEIGHTS (configurable)
// ============================================

const DEFAULT_WEIGHTS = {
  similarity: 0.45,
  emotionFit: 0.25,
  shadow: 0.12,
  novelty: 0.10,
  recency: 0.08,
};

const SIGMOID_A = 3.0;  // Shadow boost curve
const SIGMOID_B = 3.0;  // Novelty boost curve
const RECENCY_HALF_LIFE_YEARS = 5.0;

// ============================================
// MATH HELPERS
// ============================================

function sigmoid(x: number, a: number = 1.0): number {
  return 1.0 / (1.0 + Math.exp(-a * x));
}

function expDecay(year: number | null, currentYear: number = new Date().getFullYear(), halfLife: number = 5.0): number {
  if (year === null || year === undefined) return 0.5;
  const yearsAgo = currentYear - year;
  return Math.exp(-yearsAgo * Math.log(2) / halfLife);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}

function emotionDistance(a: EmotionVector, b: EmotionVector): number {
  const keys: (keyof EmotionVector)[] = ["ecstatic", "yearning", "corrupted", "lucid", "divine", "feral"];

  const vecA = keys.map(k => a[k] ?? 0);
  const vecB = keys.map(k => b[k] ?? 0);

  const similarity = cosineSimilarity(vecA, vecB);
  return 1 - similarity; // Convert to distance
}

function clamp(value: number, min: number = 0, max: number = 1): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================
// SHADOW SCORE COMPUTATION
// ============================================

export function computeShadowScore(meta: {
  playCount?: number;
  tags?: string[];
  sources?: string[];
}): number {
  let score = 0;

  // Factor 1: Play count (inverse log scale)
  const plays = meta.playCount ?? 1000;
  if (plays > 0) {
    const logPlays = Math.log10(plays + 1);
    // Map [0, 7] (log scale) to [1, 0]
    const playShadow = Math.max(0, 1 - logPlays / 7);
    score += playShadow * 0.6;
  } else {
    score += 0.6;
  }

  // Factor 2: Tag/genre rarity
  const tags = meta.tags ?? [];
  if (tags.length > 0) {
    const tagRarity = Math.min(1.0, tags.length * 0.15);
    score += tagRarity * 0.3;
  } else {
    score += 0.15;
  }

  // Factor 3: Source obscurity
  const sources = meta.sources ?? [];
  const obscureSources = ["bandcamp", "soundcloud", "local", "rekordbox"];
  const mainstreamSources = ["spotify", "apple_music", "youtube"];

  if (sources.some(s => obscureSources.includes(s))) {
    score += 0.1;
  } else if (sources.some(s => mainstreamSources.includes(s))) {
    score -= 0.1;
  }

  return clamp(score);
}

// ============================================
// NOVELTY SCORE (requires cluster centroids from Etherfeed)
// ============================================

export function computeNoveltyFromDistance(distanceFromCentroid: number): number {
  // Normalize: distances typically in [0, 2] for unit vectors
  // Higher distance = more novel
  return clamp(distanceFromCentroid / 2);
}

// ============================================
// COMPOSITE SCORING
// ============================================

export function computeDiscoveryScore(
  signal: DiscoverySignal,
  query: DiscoveryQuery,
  queryEmbedding?: number[],
  weights = DEFAULT_WEIGHTS
): { score: number; components: ScoredWork["components"]; explanation: string[] } {
  const components: ScoredWork["components"] = {};
  const explanation: string[] = [];

  // 1. Embedding similarity (if query embedding provided)
  if (queryEmbedding && signal.embedding && signal.embedding.length > 0) {
    const similarity = cosineSimilarity(signal.embedding, queryEmbedding);
    components.similarity = similarity;
    if (similarity > 0.5) {
      explanation.push(`Similarity: ${(similarity * 100).toFixed(0)}%`);
    }
  } else {
    components.similarity = 0;
  }

  // 2. Emotion fit
  if (query.emotion) {
    const signalEmotion: EmotionVector = {
      ecstatic: signal.ecstatic ?? undefined,
      yearning: signal.yearning ?? undefined,
      corrupted: signal.corrupted ?? undefined,
      lucid: signal.lucid ?? undefined,
      divine: signal.divine ?? undefined,
      feral: signal.feral ?? undefined,
    };

    const distance = emotionDistance(query.emotion, signalEmotion);
    const emotionFit = Math.max(0, 1 - distance);
    components.emotionFit = emotionFit;

    if (emotionFit > 0.5) {
      // Find dominant emotion match
      const emotions = Object.entries(query.emotion)
        .filter(([, v]) => v && v > 0.5)
        .map(([k]) => k);
      if (emotions.length > 0) {
        explanation.push(`Mood: ${emotions.join(", ")}`);
      }
    }
  } else {
    components.emotionFit = 0;
  }

  // 3. Shadow/rarity boost
  let shadowBoost = sigmoid(signal.shadowScore, SIGMOID_A);
  if (query.shadowBias) {
    shadowBoost *= 1.5;
  }
  components.shadowBoost = clamp(shadowBoost);

  if (signal.shadowScore > 0.6) {
    explanation.push(`Underground: ${(signal.shadowScore * 100).toFixed(0)}%`);
  }

  // 4. Novelty boost
  let noveltyBoost = sigmoid(signal.noveltyScore, SIGMOID_B);
  if (query.noveltyBias) {
    noveltyBoost *= 1.5;
  }
  components.noveltyBoost = clamp(noveltyBoost);

  if (signal.noveltyScore > 0.6) {
    explanation.push(`Experimental: ${(signal.noveltyScore * 100).toFixed(0)}%`);
  }

  // 5. Recency (use computedAt as proxy for track age)
  const year = signal.computedAt?.getFullYear() ?? new Date().getFullYear();
  components.recency = expDecay(year, new Date().getFullYear(), RECENCY_HALF_LIFE_YEARS);

  // Mode-based weight adjustment
  let w = { ...weights };
  if (query.mode === "shadow") {
    w.shadow = 0.35;
    w.similarity = 0.25;
  } else if (query.mode === "surface") {
    w.similarity = 0.55;
    w.shadow = 0.05;
  }

  // Compute weighted score
  const score =
    w.similarity * (components.similarity ?? 0) +
    w.emotionFit * (components.emotionFit ?? 0) +
    w.shadow * (components.shadowBoost ?? 0) +
    w.novelty * (components.noveltyBoost ?? 0) +
    w.recency * (components.recency ?? 0);

  return { score: clamp(score), components, explanation };
}

// ============================================
// DISCOVERY QUERIES
// ============================================

/**
 * Search for works by emotion and other criteria
 */
export async function discoverWorks(query: DiscoveryQuery): Promise<ScoredWork[]> {
  const limit = query.limit ?? 20;
  const offset = query.offset ?? 0;

  // Build Prisma where clause
  const where: Record<string, unknown> = {};

  if (query.bpmRange) {
    where.bpm = {
      gte: query.bpmRange[0],
      lte: query.bpmRange[1],
    };
  }

  if (query.keys && query.keys.length > 0) {
    where.key = { in: query.keys };
  }

  // Fetch signals with their works
  const signals = await prisma.discoverySignal.findMany({
    where,
    include: {
      work: true,
    },
    // Get more than we need for scoring, then sort and slice
    take: Math.min(limit * 3, 100),
  });

  // Score each signal
  const scored: ScoredWork[] = signals.map(signal => {
    const { score, components, explanation } = computeDiscoveryScore(signal, query);
    return {
      work: signal.work,
      signal,
      score,
      components,
      explanation,
    };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Apply pagination
  return scored.slice(offset, offset + limit);
}

/**
 * Shadow dive - find the most underground tracks
 */
export async function shadowDive(options: {
  maxPlays?: number;
  limit?: number;
}): Promise<ScoredWork[]> {
  const limit = options.limit ?? 20;
  const maxPlays = options.maxPlays ?? 1000;

  const signals = await prisma.discoverySignal.findMany({
    where: {
      playCount: { lte: maxPlays },
      shadowScore: { gte: 0.5 },
    },
    include: {
      work: true,
    },
    orderBy: {
      shadowScore: "desc",
    },
    take: limit,
  });

  return signals.map(signal => {
    const { score, components, explanation } = computeDiscoveryScore(
      signal,
      { mode: "shadow", shadowBias: true }
    );
    return {
      work: signal.work,
      signal,
      score,
      components,
      explanation,
    };
  });
}

/**
 * Find similar works by embedding
 * Uses cosine similarity on Float[] (for pgvector, use raw SQL)
 */
export async function findSimilar(workId: string, limit: number = 10): Promise<ScoredWork[]> {
  // Get the source work's signal
  const sourceSignal = await prisma.discoverySignal.findUnique({
    where: { workId },
    include: { work: true },
  });

  if (!sourceSignal || !sourceSignal.embedding || sourceSignal.embedding.length === 0) {
    return [];
  }

  // Get all other signals with embeddings
  const signals = await prisma.discoverySignal.findMany({
    where: {
      workId: { not: workId },
      embedding: { isEmpty: false },
    },
    include: {
      work: true,
    },
    take: 100, // Get more for in-memory filtering
  });

  // Compute similarities
  const scored: ScoredWork[] = signals
    .map(signal => {
      const similarity = cosineSimilarity(sourceSignal.embedding, signal.embedding);
      const { score, components, explanation } = computeDiscoveryScore(
        signal,
        {},
        sourceSignal.embedding
      );
      return {
        work: signal.work,
        signal,
        score,
        components: { ...components, similarity },
        explanation,
      };
    })
    .filter(s => s.components.similarity && s.components.similarity > 0.3);

  // Sort by similarity
  scored.sort((a, b) => (b.components.similarity ?? 0) - (a.components.similarity ?? 0));

  return scored.slice(0, limit);
}

/**
 * Get UMAP coordinates for visualization
 */
export async function getVibeMap(): Promise<Array<{
  workId: string;
  title: string;
  x: number;
  y: number;
  shadowScore: number;
  noveltyScore: number;
}>> {
  const signals = await prisma.discoverySignal.findMany({
    where: {
      umapX: { not: null },
      umapY: { not: null },
    },
    include: {
      work: {
        select: { id: true, title: true },
      },
    },
  });

  return signals.map(s => ({
    workId: s.workId,
    title: s.work.title,
    x: s.umapX!,
    y: s.umapY!,
    shadowScore: s.shadowScore,
    noveltyScore: s.noveltyScore,
  }));
}

/**
 * Update discovery signal with new analysis from Etherfeed
 */
export async function updateDiscoverySignal(
  workId: string,
  analysis: {
    embedding?: number[];
    emotion?: EmotionVector;
    bpm?: number;
    key?: string;
    energy?: number;
    valence?: number;
    danceability?: number;
    umapX?: number;
    umapY?: number;
    shadowScore?: number;
    noveltyScore?: number;
  }
): Promise<DiscoverySignal> {
  return prisma.discoverySignal.upsert({
    where: { workId },
    create: {
      workId,
      embedding: analysis.embedding ?? [],
      ecstatic: analysis.emotion?.ecstatic,
      yearning: analysis.emotion?.yearning,
      corrupted: analysis.emotion?.corrupted,
      lucid: analysis.emotion?.lucid,
      divine: analysis.emotion?.divine,
      feral: analysis.emotion?.feral,
      bpm: analysis.bpm,
      key: analysis.key,
      energy: analysis.energy,
      valence: analysis.valence,
      danceability: analysis.danceability,
      umapX: analysis.umapX,
      umapY: analysis.umapY,
      shadowScore: analysis.shadowScore ?? 0.5,
      noveltyScore: analysis.noveltyScore ?? 0.5,
      analysisSource: "etherfeed",
    },
    update: {
      embedding: analysis.embedding ?? undefined,
      ecstatic: analysis.emotion?.ecstatic,
      yearning: analysis.emotion?.yearning,
      corrupted: analysis.emotion?.corrupted,
      lucid: analysis.emotion?.lucid,
      divine: analysis.emotion?.divine,
      feral: analysis.emotion?.feral,
      bpm: analysis.bpm,
      key: analysis.key,
      energy: analysis.energy,
      valence: analysis.valence,
      danceability: analysis.danceability,
      umapX: analysis.umapX,
      umapY: analysis.umapY,
      shadowScore: analysis.shadowScore,
      noveltyScore: analysis.noveltyScore,
      analysisSource: "etherfeed",
      updatedAt: new Date(),
    },
  });
}
