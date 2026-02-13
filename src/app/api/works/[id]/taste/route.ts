import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCreator } from '@/lib/rbac'
import { isTasteVerdict } from '@/lib/taste-dna'

type Params = { params: Promise<{ id: string }> }

// GET /api/works/[id]/taste - list taste memories for work
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params

  const work = await prisma.work.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
    select: { id: true },
  })

  if (!work) {
    return NextResponse.json({ error: 'Work not found' }, { status: 404 })
  }

  const memories = await prisma.visualTasteMemory.findMany({
    where: { workId: work.id },
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
    take: 100,
  })

  return NextResponse.json({ data: memories })
}

// POST /api/works/[id]/taste - add taste memory signal
export async function POST(request: NextRequest, { params }: Params) {
  const authResult = await requireCreator()
  if (!authResult.authorized) {
    return authResult.response
  }

  const { id } = await params

  try {
    const work = await prisma.work.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      select: { id: true },
    })

    if (!work) {
      return NextResponse.json({ error: 'Work not found' }, { status: 404 })
    }

    const body = await request.json()
    const verdict = String(body.verdict || '').toUpperCase()
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    const tagsInput = Array.isArray(body.tags) ? body.tags : []

    if (!isTasteVerdict(verdict)) {
      return NextResponse.json(
        { error: 'verdict must be one of APPROVE, REJECT, HOLD' },
        { status: 400 }
      )
    }

    if (verdict === 'REJECT' && reason.length < 3) {
      return NextResponse.json(
        { error: 'REJECT feedback requires a reason (minimum 3 characters)' },
        { status: 400 }
      )
    }

    const tags = tagsInput
      .map((value: unknown) => String(value).trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 12)

    const memory = await prisma.visualTasteMemory.create({
      data: {
        workId: work.id,
        verdict,
        reason: reason || null,
        tags,
        createdByUserId: authResult.user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({ data: memory }, { status: 201 })
  } catch (error) {
    console.error('Create taste memory error:', error)
    return NextResponse.json({ error: 'Failed to store taste memory' }, { status: 500 })
  }
}
