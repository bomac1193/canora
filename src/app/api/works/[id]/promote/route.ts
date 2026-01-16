import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCurator } from '@/lib/rbac'
import { WorkStatus } from '@prisma/client'
import { dispatchWebhook, WEBHOOK_EVENTS } from '@/lib/webhooks'

type Params = { params: Promise<{ id: string }> }

// Valid promotion paths
const VALID_PROMOTIONS: Record<WorkStatus, WorkStatus | null> = {
  JAM: 'PLATE',
  PLATE: 'CANON',
  CANON: null, // Cannot promote further
}

// POST /api/works/[id]/promote - Promote work status
export async function POST(request: NextRequest, { params }: Params) {
  const authResult = await requireCurator()
  if (!authResult.authorized) {
    return authResult.response
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { justification } = body

    // Justification is required
    if (!justification || typeof justification !== 'string' || justification.trim().length < 10) {
      return NextResponse.json(
        { error: 'Justification is required (minimum 10 characters)' },
        { status: 400 }
      )
    }

    // Find work
    const work = await prisma.work.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    })

    if (!work) {
      return NextResponse.json(
        { error: 'Work not found' },
        { status: 404 }
      )
    }

    // Check if promotion is valid
    const nextStatus = VALID_PROMOTIONS[work.status]
    if (!nextStatus) {
      return NextResponse.json(
        { error: 'Work cannot be promoted further (already CANON)' },
        { status: 400 }
      )
    }

    // Perform promotion in transaction
    const [promotionEvent, updatedWork] = await prisma.$transaction([
      // Create promotion event
      prisma.promotionEvent.create({
        data: {
          workId: work.id,
          fromStatus: work.status,
          toStatus: nextStatus,
          justification: justification.trim(),
          signedByUserId: authResult.user.id,
          signedByDisplayName: authResult.user.name || 'Anonymous Curator',
        },
        include: {
          signedBy: {
            select: { id: true, name: true },
          },
        },
      }),
      // Update work status (and lock if CANON)
      prisma.work.update({
        where: { id: work.id },
        data: {
          status: nextStatus,
          ...(nextStatus === 'CANON' && {
            canonLockedAt: new Date(),
            canonLockedByUserId: authResult.user.id,
          }),
        },
        include: {
          promotionEvents: {
            include: {
              signedBy: {
                select: { id: true, name: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    ])

    // Dispatch webhook
    const webhookEvent = nextStatus === 'CANON'
      ? WEBHOOK_EVENTS.WORK_CANONIZED
      : WEBHOOK_EVENTS.WORK_PROMOTED

    await dispatchWebhook(webhookEvent, {
      work: {
        id: updatedWork.id,
        slug: updatedWork.slug,
        title: updatedWork.title,
        status: updatedWork.status,
        ctad: updatedWork.ctadMetadata,
      },
      fromStatus: work.status,
      toStatus: nextStatus,
      curatorJustification: justification.trim(),
      promotionEvent: {
        id: promotionEvent.id,
        signedBy: promotionEvent.signedBy,
        signedByDisplayName: promotionEvent.signedByDisplayName,
        createdAt: promotionEvent.createdAt.toISOString(),
      },
    })

    return NextResponse.json({
      data: {
        work: updatedWork,
        promotionEvent,
      },
    })
  } catch (error) {
    console.error('Promote work error:', error)
    return NextResponse.json(
      { error: 'Failed to promote work' },
      { status: 500 }
    )
  }
}
