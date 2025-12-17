import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCurator } from '@/lib/rbac'

// GET /api/lists - List curated lists
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const skip = (page - 1) * pageSize

  const [lists, total] = await Promise.all([
    prisma.curatedList.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        curator: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            work: {
              select: { id: true, slug: true, title: true, status: true },
            },
          },
          orderBy: { orderIndex: 'asc' },
          take: 5, // Preview only
        },
        _count: {
          select: { items: true },
        },
      },
    }),
    prisma.curatedList.count(),
  ])

  return NextResponse.json({
    data: lists,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}

// POST /api/lists - Create a curated list
export async function POST(request: NextRequest) {
  const authResult = await requireCurator()
  if (!authResult.authorized) {
    return authResult.response
  }

  try {
    const body = await request.json()
    const { title, description } = body

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const list = await prisma.curatedList.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        curatorUserId: authResult.user.id,
      },
      include: {
        curator: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({ data: list }, { status: 201 })
  } catch (error) {
    console.error('Create list error:', error)
    return NextResponse.json(
      { error: 'Failed to create list' },
      { status: 500 }
    )
  }
}
