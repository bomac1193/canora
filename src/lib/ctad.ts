/**
 * CTAD Utility Library
 * Provides database helpers for working with CTAD metadata
 */

export * from "@/types/ctad";

import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";
import {
  generateCTADId,
  type CTADMetadata,
  type CTADContributorRole,
} from "@/types/ctad";

/**
 * Map CANORA contribution roles to CTAD roles
 */
const CONTRIBUTION_ROLE_MAP: Record<string, CTADContributorRole> = {
  VOCAL: "performer",
  BEAT: "producer",
  LYRIC: "writer",
  SOUND: "producer",
  CURATION: "curator",
  AI_ASSIST: "ai_assist",
};

/**
 * Build CTAD from work creation input
 */
export function buildCTADFromInput(input: {
  title: string;
  contributions?: Array<{
    role: string;
    displayName: string;
    userId?: string;
    share?: number;
  }>;
  ai?: {
    involved: boolean;
    platform?: string;
    prompt?: string;
  };
  metadata?: {
    genre?: string;
    tags?: string[];
  };
  parentWorkIds?: string[];
}): CTADMetadata {
  // Map contribution roles to CTAD roles
  const contributors = (input.contributions || []).map((c) => ({
    name: c.displayName,
    role: (CONTRIBUTION_ROLE_MAP[c.role] || "other") as CTADContributorRole,
    share: c.share,
    userId: c.userId,
  }));

  // Ensure at least one contributor
  if (contributors.length === 0) {
    contributors.push({ name: "Unknown", role: "artist" as CTADContributorRole, share: undefined, userId: undefined });
  }

  const ctadId = generateCTADId();

  const ctad: CTADMetadata = {
    version: "1.0",
    id: { ctad: ctadId },
    track: {
      title: input.title,
      genre: input.metadata?.genre ? [input.metadata.genre] : undefined,
      tags: input.metadata?.tags,
    },
    contributors,
    timestamps: {
      created: new Date().toISOString(),
    },
  };

  // AI disclosure
  if (input.ai?.involved || contributors.some((c) => c.role === "ai_assist")) {
    ctad.ai = {
      involved: true,
      platforms: input.ai?.platform
        ? [
            {
              name: input.ai.platform,
              role: "full_generation",
            },
          ]
        : undefined,
    };
  }

  // Lineage (parent IDs will be resolved to CTAD IDs by caller if needed)
  if (input.parentWorkIds && input.parentWorkIds.length > 0) {
    ctad.lineage = {
      type: "original", // Will be updated based on edge type
      parents: input.parentWorkIds.map((id) => ({
        ctadId: id, // Will be resolved later
        relationship: "derived",
      })),
    };
  }

  return ctad;
}

/**
 * Resolve parent work IDs to CTAD IDs in lineage
 */
export async function resolveCTADLineage(
  ctad: CTADMetadata
): Promise<CTADMetadata> {
  if (!ctad.lineage?.parents) return ctad;

  const resolvedParents = await Promise.all(
    ctad.lineage.parents.map(async (parent) => {
      if (parent.ctadId?.startsWith("ctad_")) {
        // Already a CTAD ID
        return parent;
      }

      // Try to resolve work ID to CTAD ID
      const work = await prisma.work.findUnique({
        where: { id: parent.ctadId },
        select: { ctadId: true, title: true },
      });

      if (work?.ctadId) {
        return { ...parent, ctadId: work.ctadId, title: work.title };
      }

      return parent;
    })
  );

  return {
    ...ctad,
    lineage: { ...ctad.lineage, parents: resolvedParents },
  };
}

/**
 * Update CTAD with CANORA work ID
 */
export function setCanoraId(ctad: CTADMetadata, workId: string): CTADMetadata {
  return {
    ...ctad,
    id: {
      ...ctad.id,
      canora: workId,
    },
  };
}

/**
 * Update CTAD timestamps
 */
export function updateCTADTimestamps(ctad: CTADMetadata): CTADMetadata {
  return {
    ...ctad,
    timestamps: {
      ...ctad.timestamps,
      modified: new Date().toISOString(),
    },
  };
}

/**
 * Merge partial CTAD updates with existing CTAD
 */
export function mergeCTAD(
  existing: CTADMetadata,
  updates: Partial<CTADMetadata>
): CTADMetadata {
  const merged: CTADMetadata = {
    ...existing,
    ...updates,
    id: {
      ...existing.id,
      ...updates.id,
    },
    track: {
      ...existing.track,
      ...updates.track,
    },
    timestamps: {
      ...existing.timestamps,
      ...updates.timestamps,
      modified: new Date().toISOString(),
    },
  };

  // Merge contributors if provided
  if (updates.contributors) {
    merged.contributors = updates.contributors;
  }

  // Merge AI info if provided
  if (updates.ai) {
    merged.ai = {
      ...existing.ai,
      ...updates.ai,
    };
  }

  // Merge lineage if provided
  if (updates.lineage) {
    merged.lineage = {
      ...existing.lineage,
      ...updates.lineage,
    };
  }

  // Merge rights if provided
  if (updates.rights) {
    merged.rights = {
      ...existing.rights,
      ...updates.rights,
    };
  }

  // Merge audio if provided
  if (updates.audio) {
    merged.audio = {
      ...existing.audio,
      ...updates.audio,
    };
  }

  return merged;
}

/**
 * Get CTAD from a work by ID
 */
export async function getCTADFromWork(
  workId: string
): Promise<CTADMetadata | null> {
  const work = await prisma.work.findUnique({
    where: { id: workId },
    select: { ctadMetadata: true },
  });

  if (!work?.ctadMetadata) return null;

  return work.ctadMetadata as unknown as CTADMetadata;
}

/**
 * Update CTAD for a work
 */
export async function updateWorkCTAD(
  workId: string,
  ctad: CTADMetadata
): Promise<void> {
  await prisma.work.update({
    where: { id: workId },
    data: {
      ctadId: ctad.id.ctad,
      ctadMetadata: ctad as unknown as Prisma.InputJsonValue,
    },
  });
}

/**
 * Map edge type to CTAD lineage type
 */
export function edgeTypeToCTADLineageType(
  edgeType: string
): NonNullable<CTADMetadata["lineage"]>["type"] {
  switch (edgeType) {
    case "FORK":
      return "remix";
    case "MERGE":
      return "mashup";
    case "DERIVED":
      return "sample";
    default:
      return "original";
  }
}

/**
 * Map edge type to CTAD relationship
 */
export function edgeTypeToCTADRelationship(
  edgeType: string
): "sampled" | "remixed" | "covered" | "interpolated" | "derived" | "forked" {
  switch (edgeType) {
    case "FORK":
      return "forked";
    case "MERGE":
      return "derived";
    case "DERIVED":
      return "derived";
    default:
      return "derived";
  }
}
