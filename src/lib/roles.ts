// Client-safe role checking utilities
// This file contains no server-side imports and can be safely used in client components

export type Role = 'VIEWER' | 'CREATOR' | 'CURATOR' | 'ADMIN'

// Role hierarchy - higher index = more permissions
const ROLE_HIERARCHY: Role[] = ['VIEWER', 'CREATOR', 'CURATOR', 'ADMIN']

/**
 * Check if a role has at least the required permission level
 */
export function hasRole(userRole: Role, requiredRole: Role): boolean {
  const userIndex = ROLE_HIERARCHY.indexOf(userRole)
  const requiredIndex = ROLE_HIERARCHY.indexOf(requiredRole)
  return userIndex >= requiredIndex
}

/**
 * Check if user can create works (CREATOR or above)
 */
export function canCreate(role: Role): boolean {
  return hasRole(role, 'CREATOR')
}

/**
 * Check if user can promote works (CURATOR or above)
 */
export function canPromote(role: Role): boolean {
  return hasRole(role, 'CURATOR')
}

/**
 * Check if user can create curated lists (CURATOR or above)
 */
export function canCurate(role: Role): boolean {
  return hasRole(role, 'CURATOR')
}

/**
 * Check if user can manage roles (ADMIN only)
 */
export function canManageRoles(role: Role): boolean {
  return role === 'ADMIN'
}
