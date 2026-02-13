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

export async function getTasteDnaSummary(limit = 8): Promise<TasteDnaSummary> {
  const memories = await prisma.visualTasteMemory.findMany({
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
