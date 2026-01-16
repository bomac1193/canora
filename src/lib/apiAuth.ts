import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./prisma";

/**
 * Generate a new API key
 * Format: sk_live_{64 hex characters}
 */
export function generateApiKey(): string {
  return `sk_live_${randomBytes(32).toString("hex")}`;
}

/**
 * Hash an API key for storage comparison
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Mask an API key for display (shows first 7 + last 4 chars)
 */
export function maskApiKey(key: string): string {
  if (key.length <= 11) return key;
  return `${key.slice(0, 7)}...${key.slice(-4)}`;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  userId?: string;
  scopes?: string[];
  error?: string;
}

/**
 * Validate an API key and check scopes
 */
export async function validateApiKey(
  key: string,
  requiredScopes: string[] = []
): Promise<ApiKeyValidationResult> {
  if (!key || !key.startsWith("sk_live_")) {
    return { valid: false, error: "Invalid API key format" };
  }

  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { key },
    });

    if (!apiKey) {
      return { valid: false, error: "API key not found" };
    }

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return { valid: false, error: "API key has expired" };
    }

    // Check required scopes
    if (requiredScopes.length > 0) {
      const hasAllScopes = requiredScopes.every((scope) =>
        apiKey.scopes.includes(scope)
      );
      if (!hasAllScopes) {
        return {
          valid: false,
          error: "Insufficient scopes",
          scopes: apiKey.scopes,
        };
      }
    }

    // Update last used timestamp (fire and forget)
    prisma.apiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {
        // Ignore errors on usage tracking
      });

    return {
      valid: true,
      userId: apiKey.userId,
      scopes: apiKey.scopes,
    };
  } catch (error) {
    console.error("API key validation error:", error);
    return { valid: false, error: "Validation failed" };
  }
}

export interface ApiAuthContext {
  userId: string;
  scopes: string[];
}

export type ApiHandler<T = unknown> = (
  request: NextRequest,
  context: ApiAuthContext
) => Promise<NextResponse<T>>;

export type ApiHandlerWithParams<T = unknown> = (
  request: NextRequest,
  context: ApiAuthContext,
  params: { params: Promise<Record<string, string>> }
) => Promise<NextResponse<T>>;

/**
 * Higher-order function wrapper for API routes that require API key authentication
 */
export function withApiKeyAuth<T = unknown>(
  handler: ApiHandler<T>,
  requiredScopes: string[] = []
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const apiKey = request.headers.get("X-API-Key");

    if (!apiKey) {
      return NextResponse.json(
        { error: "Invalid or missing API key" },
        { status: 401 }
      );
    }

    const validation = await validateApiKey(apiKey, requiredScopes);

    if (!validation.valid) {
      if (validation.error === "Insufficient scopes") {
        return NextResponse.json(
          {
            error: "Insufficient scopes",
            required: requiredScopes,
            available: validation.scopes,
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: validation.error || "Invalid or missing API key" },
        { status: 401 }
      );
    }

    const context: ApiAuthContext = {
      userId: validation.userId!,
      scopes: validation.scopes!,
    };

    return handler(request, context);
  };
}

/**
 * Higher-order function wrapper for API routes with dynamic params
 */
export function withApiKeyAuthParams<T = unknown>(
  handler: ApiHandlerWithParams<T>,
  requiredScopes: string[] = []
): (
  request: NextRequest,
  params: { params: Promise<Record<string, string>> }
) => Promise<NextResponse> {
  return async (
    request: NextRequest,
    params: { params: Promise<Record<string, string>> }
  ) => {
    const apiKey = request.headers.get("X-API-Key");

    if (!apiKey) {
      return NextResponse.json(
        { error: "Invalid or missing API key" },
        { status: 401 }
      );
    }

    const validation = await validateApiKey(apiKey, requiredScopes);

    if (!validation.valid) {
      if (validation.error === "Insufficient scopes") {
        return NextResponse.json(
          {
            error: "Insufficient scopes",
            required: requiredScopes,
            available: validation.scopes,
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: validation.error || "Invalid or missing API key" },
        { status: 401 }
      );
    }

    const context: ApiAuthContext = {
      userId: validation.userId!,
      scopes: validation.scopes!,
    };

    return handler(request, context, params);
  };
}

/**
 * Available API key scopes
 */
export const API_SCOPES = {
  WORKS_READ: "works:read",
  WORKS_WRITE: "works:write",
  WORKS_PROMOTE: "works:promote",
  SIGNALS_WRITE: "signals:write",
  CANON_GRADUATE: "canon:graduate",
  DISCOVERY_READ: "discovery:read",
  WEBHOOKS_MANAGE: "webhooks:manage",
} as const;

export type ApiScope = (typeof API_SCOPES)[keyof typeof API_SCOPES];

/**
 * Validate that provided scopes are valid
 */
export function validateScopes(scopes: string[]): {
  valid: boolean;
  invalidScopes: string[];
} {
  const validScopes = Object.values(API_SCOPES);
  const invalidScopes = scopes.filter(
    (s) => !validScopes.includes(s as ApiScope)
  );
  return {
    valid: invalidScopes.length === 0,
    invalidScopes,
  };
}
