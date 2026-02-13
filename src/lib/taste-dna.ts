import { prisma } from '@/lib/prisma'

export const TASTE_VERDICTS = ['APPROVE', 'REJECT', 'HOLD'] as const
export type TasteVerdict = (typeof TASTE_VERDICTS)[number]

export function isTasteVerdict(value: string): value is TasteVerdict {
  return TASTE_VERDICTS.includes(value as TasteVerdict)
}

export interface TasteDnaSummary {
  totalSignals: number
  verdictCounts: Record<TasteVerdict, number>
  topRejectReasons: Array<{ reason: string; count: number }>
  topRejectTags: Array<{ tag: string; count: number }>
  recentRejectMemory: Array<{
    workId: string
    workTitle: string
    reason: string | null
    tags: string[]
    createdAt: string
  }>
}

export interface TastePromptGuardrails {
  negativeTags: string[]
  avoidThemes: string[]
  promptGuardrails: string
}

export async function getTasteDnaSummary(limit = 8): Promise<TasteDnaSummary> {
  return getTasteDnaSummaryForUser({ limit })
}

export async function getTasteDnaSummaryForUser(opts: {
  userId?: string
  limit?: number
}): Promise<TasteDnaSummary> {
  const limit = opts.limit ?? 8

  const memories = await prisma.visualTasteMemory.findMany({
    where: opts.userId
      ? {
          createdByUserId: opts.userId,
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      work: {
        select: { id: true, title: true },
      },
    },
    take: 500,
  })

  const verdictCounts: Record<TasteVerdict, number> = {
    APPROVE: 0,
    REJECT: 0,
    HOLD: 0,
  }

  const rejectReasons = new Map<string, number>()
  const rejectTags = new Map<string, number>()

  for (const item of memories) {
    if (isTasteVerdict(item.verdict)) {
      verdictCounts[item.verdict] += 1
    }

    if (item.verdict !== 'REJECT') continue

    const normalizedReason = item.reason?.trim().toLowerCase()
    if (normalizedReason) {
      rejectReasons.set(normalizedReason, (rejectReasons.get(normalizedReason) || 0) + 1)
    }

    for (const tag of item.tags) {
      const normalizedTag = tag.trim().toLowerCase()
      if (!normalizedTag) continue
      rejectTags.set(normalizedTag, (rejectTags.get(normalizedTag) || 0) + 1)
    }
  }

  const topRejectReasons = Array.from(rejectReasons.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([reason, count]) => ({ reason, count }))

  const topRejectTags = Array.from(rejectTags.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }))

  const recentRejectMemory = memories
    .filter((item) => item.verdict === 'REJECT')
    .slice(0, limit)
    .map((item) => ({
      workId: item.work.id,
      workTitle: item.work.title,
      reason: item.reason,
      tags: item.tags,
      createdAt: item.createdAt.toISOString(),
    }))

  return {
    totalSignals: memories.length,
    verdictCounts,
    topRejectReasons,
    topRejectTags,
    recentRejectMemory,
  }
}

export function buildTastePromptGuardrails(
  summary: TasteDnaSummary,
  opts: { maxTags?: number; maxThemes?: number } = {}
): TastePromptGuardrails {
  const maxTags = opts.maxTags ?? 8
  const maxThemes = opts.maxThemes ?? 6

  const negativeTags = summary.topRejectTags
    .slice(0, maxTags)
    .map((item) => item.tag)

  const avoidThemes = summary.topRejectReasons
    .slice(0, maxThemes)
    .map((item) => item.reason)

  const clauses: string[] = []
  if (negativeTags.length > 0) {
    clauses.push(`Avoid these traits: ${negativeTags.join(', ')}`)
  }
  if (avoidThemes.length > 0) {
    clauses.push(`Do not produce outcomes with: ${avoidThemes.join('; ')}`)
  }
  clauses.push('Prioritize clarity, identity consistency, and premium finish.')

  return {
    negativeTags,
    avoidThemes,
    promptGuardrails: clauses.join(' '),
  }
}
