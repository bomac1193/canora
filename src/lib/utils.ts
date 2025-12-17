import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { customAlphabet } from "nanoid"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate a short, human-readable ID suffix (4 chars)
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 4)

/**
 * Generate a URL-safe slug from a title with a unique suffix
 * e.g., "Midnight Echoes" -> "midnight-echoes-a3b2"
 */
export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with single
    .substring(0, 50)         // Limit length

  return `${base}-${nanoid()}`
}

/**
 * Format a date for display in institutional style
 * e.g., "15 December 2024"
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Format a date with time for timestamps
 * e.g., "15 Dec 2024, 14:32"
 */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format a monospace ID for display
 */
export function formatWorkId(slug: string): string {
  return slug.toUpperCase()
}
