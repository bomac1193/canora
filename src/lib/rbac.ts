import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { Role } from '@prisma/client'
import { NextResponse } from 'next/server'
import { hasRole, canCreate, canPromote, canCurate, canManageRoles } from './roles'

// Re-export client-safe role utilities
export { hasRole, canCreate, canPromote, canCurate, canManageRoles }

/**
 * Get the current user's session with role
 */
export async function getSession() {
  return getServerSession(authOptions)
}

/**
 * API route wrapper that requires authentication
 */
export async function requireAuth() {
  const session = await getSession()

  if (!session?.user) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    }
  }

  return {
    authorized: true as const,
    user: session.user,
  }
}

/**
 * API route wrapper that requires a specific role
 */
export async function requireRole(requiredRole: Role) {
  const authResult = await requireAuth()

  if (!authResult.authorized) {
    return authResult
  }

  if (!hasRole(authResult.user.role, requiredRole)) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: `Requires ${requiredRole} role or higher` },
        { status: 403 }
      ),
    }
  }

  return authResult
}

/**
 * API route wrapper for creator-level actions
 */
export async function requireCreator() {
  return requireRole('CREATOR')
}

/**
 * API route wrapper for curator-level actions
 */
export async function requireCurator() {
  return requireRole('CURATOR')
}

/**
 * API route wrapper for admin-level actions
 */
export async function requireAdmin() {
  return requireRole('ADMIN')
}
