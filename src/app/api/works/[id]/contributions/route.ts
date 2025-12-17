import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCreator } from '@/lib/rbac'
import { ContributionRole } from '@prisma/client'

type Params = { params: Promise<{ id: string }> }

// GET /api/works/[id]/contributions - List contributions
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params

  const work = await prisma.work.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
    select: { id: true },
  })

  if (!work) {
    return NextResponse.json(
      { error: 'Work not found' },
      { status: 404 }
    )
  }

  const contributions = await prisma.contribution.findMany({
    where: { workId: work.id },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ data: contributions })
}

// POST /api/works/[id]/contributions - Add contribution
export async function POST(request: NextRequest, { params }: Params) {
  const authResult = await requireCreator()
  if (!authResult.authorized) {
    return authResult.response
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { displayName, role, notes, userId } = body

    // Validate required fields
    if (!displayName || typeof displayName !== 'string') {
      return NextResponse.json(
        { error: 'Display name is required' },
        { status: 400 }
      )
    }

    if (!role || !Object.values(ContributionRole).includes(role)) {
      return NextResponse.json(
        { error: 'Valid contribution role is required' },
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

    // Cannot add contributions to CANON works
    if (work.status === 'CANON') {
      return NextResponse.json(
        { error: 'Cannot modify canonized works' },
        { status: 403 }
      )
    }

    const contribution = await prisma.contribution.create({
      data: {
        workId: work.id,
        displayName: displayName.trim(),
        role,
        notes: notes?.trim() || null,
        userId: userId || null,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({ data: contribution }, { status: 201 })
  } catch (error) {
    console.error('Add contribution error:', error)
    return NextResponse.json(
      { error: 'Failed to add contribution' },
      { status: 500 }
    )
  }
}
