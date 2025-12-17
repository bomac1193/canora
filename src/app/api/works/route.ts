import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCreator } from '@/lib/rbac'
import { generateSlug } from '@/lib/utils'
import { WorkStatus } from '@prisma/client'

// GET /api/works - List works with filtering and pagination
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const status = searchParams.get('status') as WorkStatus | null
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const skip = (page - 1) * pageSize

  const where = status ? { status } : {}

  const [works, total] = await Promise.all([
    prisma.work.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        contributions: {
          take: 3, // Preview only
        },
        promotionEvents: {
          where: { toStatus: 'CANON' },
          include: {
            signedBy: {
              select: { id: true, name: true },
            },
          },
          take: 1,
        },
        canonLockedBy: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.work.count({ where }),
  ])

  return NextResponse.json({
    data: works,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}

// POST /api/works - Create a new work
export async function POST(request: NextRequest) {
  const authResult = await requireCreator()
  if (!authResult.authorized) {
    return authResult.response
  }

  try {
    const body = await request.json()
    const { title, description, audioUrl, parentWorkIds, contributorName, contributorRole } = body

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const slug = generateSlug(title)

    // Create work with initial contribution
    const work = await prisma.work.create({
      data: {
        slug,
        title: title.trim(),
        description: description?.trim() || null,
        audioUrl: audioUrl || null,
        status: 'JAM',
        createdByUserId: authResult.user.id,
        contributions: {
          create: {
            displayName: contributorName || authResult.user.name || 'Anonymous',
            role: contributorRole || 'SOUND',
            userId: authResult.user.id,
          },
        },
        // Create parent edges if forking
        ...(parentWorkIds?.length > 0 && {
          parentEdges: {
            create: parentWorkIds.map((parentId: string) => ({
              fromWorkId: parentId,
              type: 'FORK',
            })),
          },
        }),
      },
      include: {
        contributions: true,
        parentEdges: {
          include: {
            fromWork: {
              select: { id: true, slug: true, title: true, status: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ data: work }, { status: 201 })
  } catch (error) {
    console.error('Create work error:', error)
    return NextResponse.json(
      { error: 'Failed to create work' },
      { status: 500 }
    )
  }
}
