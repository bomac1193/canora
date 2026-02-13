import { NextResponse } from 'next/server'
import { requireCreator } from '@/lib/rbac'
import { buildTastePromptGuardrails, getTasteDnaSummaryForUser } from '@/lib/taste-dna'

export async function GET() {
  const authResult = await requireCreator()
  if (!authResult.authorized) {
    return authResult.response
  }

  try {
    const summary = await getTasteDnaSummaryForUser({
      userId: authResult.user.id,
      limit: 12,
    })
    const guardrails = buildTastePromptGuardrails(summary)
    return NextResponse.json({
      data: {
        scope: 'profile',
        userId: authResult.user.id,
        summary,
        guardrails,
      },
    })
  } catch (error) {
    console.error('Taste DNA guardrails error:', error)
    return NextResponse.json(
      { error: 'Failed to build taste guardrails' },
      { status: 500 }
    )
  }
}
