import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/rbac'
import { Metrics } from '@/types'

// GET /api/admin/metrics - Get dashboard metrics
export async function GET() {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return authResult.response
  }

  try {
    // Get work counts by status
    const [jamCount, plateCount, canonCount, totalWorks] = await Promise.all([
      prisma.work.count({ where: { status: 'JAM' } }),
      prisma.work.count({ where: { status: 'PLATE' } }),
      prisma.work.count({ where: { status: 'CANON' } }),
      prisma.work.count(),
    ])

    // Calculate canon percentage
    const canonPercentage = totalWorks > 0 ? (canonCount / totalWorks) * 100 : 0

    // Get promotion events for timing calculations
    const promotionEvents = await prisma.promotionEvent.findMany({
      include: {
        work: {
          select: { createdAt: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Group promotions by work to calculate time to promotion
    const workPromotions = new Map<string, { jamToPlate?: number; plateToCanon?: number }>()

    for (const event of promotionEvents) {
      if (!workPromotions.has(event.workId)) {
        workPromotions.set(event.workId, {})
      }

      const promotionTiming = workPromotions.get(event.workId)!

      if (event.fromStatus === 'JAM' && event.toStatus === 'PLATE') {
        // Find when the work was created (JAM state)
        const daysDiff = Math.floor(
          (event.createdAt.getTime() - event.work.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        )
        promotionTiming.jamToPlate = daysDiff
      } else if (event.fromStatus === 'PLATE' && event.toStatus === 'CANON') {
        // Find the JAM->PLATE event for this work
        const jamToPlateEvent = promotionEvents.find(
          e => e.workId === event.workId && e.fromStatus === 'JAM' && e.toStatus === 'PLATE'
        )
        if (jamToPlateEvent) {
          const daysDiff = Math.floor(
            (event.createdAt.getTime() - jamToPlateEvent.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          )
          promotionTiming.plateToCanon = daysDiff
        }
      }
    }

    // Calculate medians
    const jamToPlateTimings = Array.from(workPromotions.values())
      .map(p => p.jamToPlate)
      .filter((t): t is number => t !== undefined)
      .sort((a, b) => a - b)

    const plateToCanonTimings = Array.from(workPromotions.values())
      .map(p => p.plateToCanon)
      .filter((t): t is number => t !== undefined)
      .sort((a, b) => a - b)

    const medianJamToPlate = jamToPlateTimings.length > 0
      ? jamToPlateTimings[Math.floor(jamToPlateTimings.length / 2)]
      : null

    const medianPlateToCanon = plateToCanonTimings.length > 0
      ? plateToCanonTimings[Math.floor(plateToCanonTimings.length / 2)]
      : null

    // Count lineage exploration vs creation events
    // (In a real app, you'd track these in a separate analytics table)
    // For MVP, we estimate based on edge count vs work count
    const edgeCount = await prisma.workEdge.count()

    const metrics: Metrics = {
      totalWorks,
      jamCount,
      plateCount,
      canonCount,
      canonPercentage: Math.round(canonPercentage * 100) / 100,
      lineageExplorationEvents: edgeCount * 2, // Estimate
      creationEvents: totalWorks,
      medianJamToPlate,
      medianPlateToCanon,
    }

    return NextResponse.json({ data: metrics })
  } catch (error) {
    console.error('Metrics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}
