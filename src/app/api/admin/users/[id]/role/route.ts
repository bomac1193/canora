import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/rbac'
import { Role } from '@prisma/client'

type Params = { params: Promise<{ id: string }> }

// PATCH /api/admin/users/[id]/role - Update user role
export async function PATCH(request: NextRequest, { params }: Params) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return authResult.response
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { role } = body

    // Validate role
    if (!role || !Object.values(Role).includes(role)) {
      return NextResponse.json(
        { error: 'Valid role is required (VIEWER, CREATOR, CURATOR, ADMIN)' },
        { status: 400 }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent admins from demoting themselves
    if (user.id === authResult.user.id && role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot demote yourself' },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    return NextResponse.json({ data: updatedUser })
  } catch (error) {
    console.error('Update role error:', error)
    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    )
  }
}
