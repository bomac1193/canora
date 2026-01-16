/**
 * API Key Management Routes
 * POST - Create new API key (requires session auth)
 * GET - List user's API keys (requires session auth)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  generateApiKey,
  hashApiKey,
  maskApiKey,
  validateScopes,
} from "@/lib/apiAuth";

/**
 * POST /api/v1/auth/apikey
 * Create a new API key for the authenticated user
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { name, scopes, expiresInDays } = body;

    // Validate input
    if (!name || typeof name !== "string" || name.length < 1) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!scopes || !Array.isArray(scopes) || scopes.length === 0) {
      return NextResponse.json(
        { error: "At least one scope is required" },
        { status: 400 }
      );
    }

    // Validate scopes
    const scopeValidation = validateScopes(scopes);
    if (!scopeValidation.valid) {
      return NextResponse.json(
        {
          error: "Invalid scopes",
          invalidScopes: scopeValidation.invalidScopes,
        },
        { status: 400 }
      );
    }

    // Generate key
    const key = generateApiKey();
    const hashedKey = hashApiKey(key);

    // Calculate expiration
    let expiresAt: Date | null = null;
    if (expiresInDays && typeof expiresInDays === "number" && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Create API key
    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        key, // Stored plain for lookup
        hashedKey, // Stored hashed for verification
        userId: authResult.user.id,
        scopes,
        expiresAt,
      },
    });

    // Return the key - this is the ONLY time it will be shown
    return NextResponse.json(
      {
        id: apiKey.id,
        name: apiKey.name,
        key, // Plain key shown only once
        scopes: apiKey.scopes,
        expiresAt: apiKey.expiresAt?.toISOString() || null,
        createdAt: apiKey.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating API key:", error);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/auth/apikey
 * List user's API keys with masked previews
 */
export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: authResult.user.id },
      orderBy: { createdAt: "desc" },
    });

    const keys = apiKeys.map((key) => ({
      id: key.id,
      name: key.name,
      keyPreview: maskApiKey(key.key),
      scopes: key.scopes,
      lastUsedAt: key.lastUsedAt?.toISOString() || null,
      expiresAt: key.expiresAt?.toISOString() || null,
      createdAt: key.createdAt.toISOString(),
    }));

    return NextResponse.json({ keys });
  } catch (error) {
    console.error("Error listing API keys:", error);
    return NextResponse.json(
      { error: "Failed to list API keys" },
      { status: 500 }
    );
  }
}
