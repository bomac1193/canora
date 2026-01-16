/**
 * CTAD: Creative Track Attribution Data
 * Universal metadata standard for the taste ecosystem
 */

export interface CTADMetadata {
  version: "1.0";

  // Core identifiers
  id: {
    ctad: string; // Universal CTAD ID (generated)
    canora?: string; // CANORA work ID
    isrc?: string; // ISRC if registered
    iswc?: string; // ISWC if registered
    external?: {
      // External platform IDs
      spotify?: string;
      soundcloud?: string;
      youtube?: string;
      [key: string]: string | undefined;
    };
  };

  // Basic track info
  track: {
    title: string;
    duration?: number; // Seconds
    releaseDate?: string; // ISO date
    genre?: string[];
    tags?: string[];
    language?: string; // ISO 639-1
    explicit?: boolean;
  };

  // Audio characteristics (optional, can be computed)
  audio?: {
    bpm?: number;
    key?: string; // e.g., "C major", "A minor"
    energy?: number; // 0-1
    valence?: number; // 0-1 (musical positiveness)
  };

  // Contributors with roles and splits
  contributors: Array<{
    name: string;
    role: CTADContributorRole;
    share?: number; // Percentage (0-100), should sum to 100
    userId?: string; // CANORA user ID if linked
    verified?: boolean; // Identity verified
    external?: {
      // External identifiers
      isni?: string; // International Standard Name Identifier
      ipi?: string; // Interested Parties Information
      spotify?: string;
      [key: string]: string | undefined;
    };
  }>;

  // AI involvement disclosure (required if AI involved)
  ai?: {
    involved: boolean;
    platforms?: Array<{
      name: string; // "suno", "udio", "musicgen", etc.
      version?: string;
      role:
        | "full_generation"
        | "stem_generation"
        | "mastering"
        | "mixing"
        | "vocal_synthesis"
        | "other";
    }>;
    estimatedContribution?: number; // 0-100 percentage
    o8ProvenanceId?: string; // Link to O8 provenance record
    humanOversight?: string; // Description of human involvement
  };

  // Lineage and derivation
  lineage?: {
    type?:
      | "original"
      | "remix"
      | "cover"
      | "sample"
      | "mashup"
      | "ai_variation"
      | "stem_extraction";
    parents?: Array<{
      ctadId?: string; // CTAD ID if in ecosystem
      title?: string; // Title if external
      artist?: string;
      relationship:
        | "sampled"
        | "remixed"
        | "covered"
        | "interpolated"
        | "derived"
        | "forked";
      timestamp?: {
        // If sampling, what portion
        start?: number;
        end?: number;
      };
    }>;
  };

  // Rights and licensing
  rights?: {
    copyright?: {
      owner: string;
      year: number;
    };
    license?: CTADLicense;
    restrictions?: string[];
    territory?: string[]; // ISO 3166-1 alpha-2 country codes, empty = worldwide
  };

  // Timestamps
  timestamps: {
    created: string; // When CTAD record was created
    modified?: string; // Last modification
    generated?: string; // When audio was generated (from O8)
    released?: string; // Official release date
  };
}

export type CTADContributorRole =
  | "artist" // Primary/featured artist
  | "performer" // Vocalist or instrumentalist
  | "writer" // Songwriter/lyricist
  | "composer" // Music composer
  | "producer" // Music producer
  | "mixer" // Mixing engineer
  | "master" // Mastering engineer
  | "arranger" // Musical arranger
  | "programmer" // Beat/synth programmer
  | "ai_assist" // AI tool used in creation
  | "curator" // Person who discovered/curated
  | "other";

export type CTADLicense =
  | "all-rights-reserved"
  | "cc-by"
  | "cc-by-sa"
  | "cc-by-nc"
  | "cc-by-nc-sa"
  | "cc-by-nd"
  | "cc-by-nc-nd"
  | "cc0"
  | "custom";

/**
 * Generate a new CTAD ID
 * Format: ctad_[timestamp]_[random]
 */
export function generateCTADId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `ctad_${timestamp}_${random}`;
}

/**
 * Validate CTAD metadata
 */
export function validateCTAD(ctad: Partial<CTADMetadata>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!ctad.version) errors.push("version is required");
  if (ctad.version && ctad.version !== "1.0") errors.push("unsupported version");

  if (!ctad.id?.ctad) errors.push("id.ctad is required");

  if (!ctad.track?.title) errors.push("track.title is required");

  if (!ctad.contributors || ctad.contributors.length === 0) {
    errors.push("at least one contributor is required");
  }

  if (ctad.contributors) {
    const totalShare = ctad.contributors.reduce(
      (sum, c) => sum + (c.share || 0),
      0
    );
    if (totalShare > 0 && Math.abs(totalShare - 100) > 0.01) {
      errors.push(`contributor shares must sum to 100 (got ${totalShare})`);
    }
  }

  // AI disclosure required if any contributor has ai_assist role
  const hasAiContributor = ctad.contributors?.some(
    (c) => c.role === "ai_assist"
  );
  if (hasAiContributor && !ctad.ai?.involved) {
    errors.push("ai.involved must be true when ai_assist contributor exists");
  }

  if (!ctad.timestamps?.created) errors.push("timestamps.created is required");

  return { valid: errors.length === 0, errors };
}

/**
 * Create minimal CTAD from basic inputs
 */
export function createCTAD(input: {
  title: string;
  contributors: Array<{
    name: string;
    role: CTADContributorRole;
    share?: number;
  }>;
  aiInvolved?: boolean;
  aiPlatform?: string;
}): CTADMetadata {
  const ctadId = generateCTADId();

  return {
    version: "1.0",
    id: { ctad: ctadId },
    track: { title: input.title },
    contributors: input.contributors,
    ai: input.aiInvolved
      ? {
          involved: true,
          platforms: input.aiPlatform
            ? [{ name: input.aiPlatform, role: "full_generation" }]
            : undefined,
        }
      : undefined,
    timestamps: {
      created: new Date().toISOString(),
    },
  };
}

/**
 * Check if CTAD indicates AI involvement
 */
export function hasAIInvolvement(ctad: CTADMetadata): boolean {
  if (ctad.ai?.involved) return true;
  if (ctad.contributors?.some((c) => c.role === "ai_assist")) return true;
  return false;
}

/**
 * Get primary artist from CTAD
 */
export function getPrimaryArtist(ctad: CTADMetadata): string | undefined {
  const artist = ctad.contributors?.find((c) => c.role === "artist");
  return artist?.name;
}

/**
 * Get all contributors with a specific role
 */
export function getContributorsByRole(
  ctad: CTADMetadata,
  role: CTADContributorRole
): CTADMetadata["contributors"] {
  return ctad.contributors?.filter((c) => c.role === role) || [];
}
