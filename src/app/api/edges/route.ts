import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCreator } from '@/lib/rbac'
import { EdgeType } from '@prisma/client'

// POST /api/edges - Create a work edge (fork/derive)
export async function POST(request: NextRequest) {
  const authResult = await requireCreator()
  if (!authResult.authorized) {
    return authResult.response
  }

  try {
    const body = await request.json()
    const { fromWorkId, toWorkId, type } = body

    // Validate required fields
    if (!fromWorkId || !toWorkId) {
      return NextResponse.json(
        { error: 'Both fromWorkId and toWorkId are required' },
        { status: 400 }
      )
    }

    if (!type || !Object.values(EdgeType).includes(type)) {
      return NextResponse.json(
        { error: 'Valid edge type is required (FORK, MERGE, DERIVED)' },
        { status: 400 }
      )
    }

    // Verify both works exist
    const [fromWork, toWork] = await Promise.all([
      prisma.work.findUnique({ where: { id: fromWorkId } }),
      prisma.work.findUnique({ where: { id: toWorkId } }),
    ])

    if (!fromWork || !toWork) {
      return NextResponse.json(
        { error: 'One or both works not found' },
        { status: 404 }
      )
    }

    // Cannot create edges to CANON works (they're immutable)
    if (toWork.status === 'CANON') {
      return NextResponse.json(
        { error: 'Cannot create edges to canonized works' },
        { status: 403 }
      )
    }

    // Check if edge already exists
    const existingEdge = await prisma.workEdge.findUnique({
      where: {
        fromWorkId_toWorkId: {
          fromWorkId,
          toWorkId,
        },
      },
    })

    if (existingEdge) {
      return NextResponse.json(
        { error: 'Edge already exists between these works' },
        { status: 409 }
      )
    }

    const edge = await prisma.workEdge.create({
      data: {
        fromWorkId,
        toWorkId,
        type,
      },
      include: {
        fromWork: {
          select: { id: true, slug: true, title: true, status: true },
        },
        toWork: {
          select: { id: true, slug: true, title: true, status: true },
        },
      },
    })

    return NextResponse.json({ data: edge }, { status: 201 })
  } catch (error) {
    console.error('Create edge error:', error)
    return NextResponse.json(
      { error: 'Failed to create edge' },
      { status: 500 }
    )
  }
}
