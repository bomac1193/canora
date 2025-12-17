import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCreator } from '@/lib/rbac'

type Params = { params: Promise<{ id: string }> }

// GET /api/works/[id] - Get work details
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params

  const work = await prisma.work.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
    include: {
      contributions: {
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      promotionEvents: {
        include: {
          signedBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      parentEdges: {
        include: {
          fromWork: {
            select: { id: true, slug: true, title: true, status: true },
          },
        },
      },
      childEdges: {
        include: {
          toWork: {
            select: { id: true, slug: true, title: true, status: true },
          },
        },
      },
      canonLockedBy: {
        select: { id: true, name: true },
      },
      createdBy: {
        select: { id: true, name: true },
      },
    },
  })

  if (!work) {
    return NextResponse.json(
      { error: 'Work not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({ data: work })
}

// PATCH /api/works/[id] - Update work (if not CANON)
export async function PATCH(request: NextRequest, { params }: Params) {
  const authResult = await requireCreator()
  if (!authResult.authorized) {
    return authResult.response
  }

  const { id } = await params

  try {
    // Check if work exists and is not CANON
    const existingWork = await prisma.work.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    })

    if (!existingWork) {
      return NextResponse.json(
        { error: 'Work not found' },
        { status: 404 }
      )
    }

    if (existingWork.status === 'CANON') {
      return NextResponse.json(
        { error: 'Cannot modify canonized works' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, description, audioUrl } = body

    const work = await prisma.work.update({
      where: { id: existingWork.id },
      data: {
        ...(title && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(audioUrl !== undefined && { audioUrl }),
      },
      include: {
        contributions: true,
      },
    })

    return NextResponse.json({ data: work })
  } catch (error) {
    console.error('Update work error:', error)
    return NextResponse.json(
      { error: 'Failed to update work' },
      { status: 500 }
    )
  }
}
