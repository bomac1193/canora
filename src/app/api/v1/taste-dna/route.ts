import { NextRequest, NextResponse } from 'next/server'
import { withApiKeyAuth, API_SCOPES, type ApiAuthContext } from '@/lib/apiAuth'
import { getTasteDnaSummary } from '@/lib/taste-dna'

async function handleGet(
  request: NextRequest,
  _context: ApiAuthContext
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '8', 10), 25)
    const summary = await getTasteDnaSummary(limit)

    return NextResponse.json({ data: summary })
  } catch (error) {
    console.error('Taste DNA summary error:', error)
    return NextResponse.json({ error: 'Failed to load taste DNA summary' }, { status: 500 })
  }
}

export const GET = withApiKeyAuth(handleGet, [API_SCOPES.WORKS_READ])
