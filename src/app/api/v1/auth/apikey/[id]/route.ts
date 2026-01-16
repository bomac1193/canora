/**
 * Individual API Key Management Routes
 * DELETE - Revoke an API key (requires session auth)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/v1/auth/apikey/[id]
 * Revoke/delete an API key owned by the user
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const authResult = await requireAuth();
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { id } = await params;

    // Find the API key and verify ownership
    const apiKey = await prisma.apiKey.findUnique({
      where: { id },
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    if (apiKey.userId !== authResult.user.id) {
      return NextResponse.json(
        { error: "Not authorized to delete this API key" },
        { status: 403 }
      );
    }

    // Delete the API key
    await prisma.apiKey.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting API key:", error);
    return NextResponse.json(
      { error: "Failed to delete API key" },
      { status: 500 }
    );
  }
}
