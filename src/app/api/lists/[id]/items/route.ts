import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCurator } from '@/lib/rbac'

type Params = { params: Promise<{ id: string }> }

// POST /api/lists/[id]/items - Add work to list
export async function POST(request: NextRequest, { params }: Params) {
  const authResult = await requireCurator()
  if (!authResult.authorized) {
    return authResult.response
  }

  const { id: listId } = await params

  try {
    const body = await request.json()
    const { workId } = body

    if (!workId) {
      return NextResponse.json(
        { error: 'Work ID is required' },
        { status: 400 }
      )
    }

    // Check list ownership
    const list = await prisma.curatedList.findUnique({
      where: { id: listId },
    })

    if (!list) {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      )
    }

    if (list.curatorUserId !== authResult.user.id && authResult.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Not authorized to modify this list' },
        { status: 403 }
      )
    }

    // Check work exists
    const work = await prisma.work.findUnique({
      where: { id: workId },
    })

    if (!work) {
      return NextResponse.json(
        { error: 'Work not found' },
        { status: 404 }
      )
    }

    // Get next order index
    const lastItem = await prisma.curatedListItem.findFirst({
      where: { listId },
      orderBy: { orderIndex: 'desc' },
    })

    const nextOrderIndex = (lastItem?.orderIndex ?? -1) + 1

    // Add item (will fail if work already in list due to unique constraint)
    const item = await prisma.curatedListItem.create({
      data: {
        listId,
        workId,
        orderIndex: nextOrderIndex,
      },
      include: {
        work: {
          select: { id: true, slug: true, title: true, status: true },
        },
      },
    })

    return NextResponse.json({ data: item }, { status: 201 })
  } catch (error: unknown) {
    // Handle duplicate entry
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Work is already in this list' },
        { status: 409 }
      )
    }

    console.error('Add list item error:', error)
    return NextResponse.json(
      { error: 'Failed to add item to list' },
      { status: 500 }
    )
  }
}

// DELETE /api/lists/[id]/items - Remove work from list
export async function DELETE(request: NextRequest, { params }: Params) {
  const authResult = await requireCurator()
  if (!authResult.authorized) {
    return authResult.response
  }

  const { id: listId } = await params

  try {
    const { searchParams } = new URL(request.url)
    const workId = searchParams.get('workId')

    if (!workId) {
      return NextResponse.json(
        { error: 'Work ID is required' },
        { status: 400 }
      )
    }

    // Check list ownership
    const list = await prisma.curatedList.findUnique({
      where: { id: listId },
    })

    if (!list) {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      )
    }

    if (list.curatorUserId !== authResult.user.id && authResult.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Not authorized to modify this list' },
        { status: 403 }
      )
    }

    await prisma.curatedListItem.delete({
      where: {
        listId_workId: {
          listId,
          workId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove list item error:', error)
    return NextResponse.json(
      { error: 'Failed to remove item from list' },
      { status: 500 }
    )
  }
}
