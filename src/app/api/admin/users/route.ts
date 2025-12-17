import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/rbac'

// GET /api/admin/users - List users
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return authResult.response
  }

  const { searchParams } = new URL(request.url)

  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const skip = (page - 1) * pageSize

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            contributions: true,
            promotionEvents: true,
            curatedLists: true,
          },
        },
      },
    }),
    prisma.user.count(),
  ])

  return NextResponse.json({
    data: users,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}
