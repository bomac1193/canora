import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCurator } from '@/lib/rbac'

type Params = { params: Promise<{ id: string }> }

// GET /api/lists/[id] - Get list details
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params

  const list = await prisma.curatedList.findUnique({
    where: { id },
    include: {
      curator: {
        select: { id: true, name: true },
      },
      items: {
        include: {
          work: {
            select: {
              id: true,
              slug: true,
              title: true,
              status: true,
              description: true,
              createdAt: true,
            },
          },
        },
        orderBy: { orderIndex: 'asc' },
      },
    },
  })

  if (!list) {
    return NextResponse.json(
      { error: 'List not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({ data: list })
}

// PATCH /api/lists/[id] - Update list (owner only)
export async function PATCH(request: NextRequest, { params }: Params) {
  const authResult = await requireCurator()
  if (!authResult.authorized) {
    return authResult.response
  }

  const { id } = await params

  try {
    // Check ownership
    const existingList = await prisma.curatedList.findUnique({
      where: { id },
    })

    if (!existingList) {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      )
    }

    if (existingList.curatorUserId !== authResult.user.id && authResult.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Not authorized to modify this list' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, description } = body

    const list = await prisma.curatedList.update({
      where: { id },
      data: {
        ...(title && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
      },
      include: {
        curator: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({ data: list })
  } catch (error) {
    console.error('Update list error:', error)
    return NextResponse.json(
      { error: 'Failed to update list' },
      { status: 500 }
    )
  }
}

// DELETE /api/lists/[id] - Delete list (owner only)
export async function DELETE(request: NextRequest, { params }: Params) {
  const authResult = await requireCurator()
  if (!authResult.authorized) {
    return authResult.response
  }

  const { id } = await params

  try {
    const existingList = await prisma.curatedList.findUnique({
      where: { id },
    })

    if (!existingList) {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      )
    }

    if (existingList.curatorUserId !== authResult.user.id && authResult.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Not authorized to delete this list' },
        { status: 403 }
      )
    }

    await prisma.curatedList.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete list error:', error)
    return NextResponse.json(
      { error: 'Failed to delete list' },
      { status: 500 }
    )
  }
}
