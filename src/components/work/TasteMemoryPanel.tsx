'use client'

import { useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

type TasteMemory = {
  id: string
  verdict: 'APPROVE' | 'REJECT' | 'HOLD'
  reason: string | null
  tags: string[]
  createdAt: string
  createdBy: { id: string; name: string | null } | null
}

interface TasteMemoryPanelProps {
  workId: string
  initialMemories: TasteMemory[]
}

export function TasteMemoryPanel({ workId, initialMemories }: TasteMemoryPanelProps) {
  const { data: session } = useSession()
  const [memories, setMemories] = useState<TasteMemory[]>(initialMemories)
  const [verdict, setVerdict] = useState<'APPROVE' | 'REJECT' | 'HOLD'>('REJECT')
  const [reason, setReason] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rejectCount = useMemo(
    () => memories.filter((item) => item.verdict === 'REJECT').length,
    [memories]
  )

  async function submit() {
    try {
      setIsSaving(true)
      setError(null)

      const tags = tagInput
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)

      const response = await fetch(`/api/works/${workId}/taste`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verdict,
          reason,
          tags,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save taste memory')
      }

      setMemories((prev) => [data.data as TasteMemory, ...prev])
      setReason('')
      setTagInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="border border-divider bg-muted/20 p-4">
          <p className="font-mono text-xs text-secondary">Signals</p>
          <p className="mt-1 text-2xl font-semibold">{memories.length}</p>
        </div>
        <div className="border border-divider bg-muted/20 p-4">
          <p className="font-mono text-xs text-secondary">Rejects</p>
          <p className="mt-1 text-2xl font-semibold text-destructive">{rejectCount}</p>
        </div>
        <div className="border border-divider bg-muted/20 p-4">
          <p className="font-mono text-xs text-secondary">Last Signal</p>
          <p className="mt-1 text-sm text-secondary">
            {memories[0] ? new Date(memories[0].createdAt).toLocaleString() : 'No data yet'}
          </p>
        </div>
      </div>

      {session?.user ? (
        <div className="border border-divider bg-muted/10 p-4 space-y-3">
          <p className="font-mono text-xs text-secondary">Log Taste Signal</p>

          <div className="flex gap-2">
            {(['APPROVE', 'REJECT', 'HOLD'] as const).map((option) => (
              <Button
                key={option}
                size="sm"
                variant={verdict === option ? 'default' : 'outline'}
                onClick={() => setVerdict(option)}
              >
                {option}
              </Button>
            ))}
          </div>

          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why this was accepted/rejected (required for REJECT)"
            rows={3}
          />

          <Input
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            placeholder="Tags (comma-separated): off-brand, wrong vibe, muddy mix"
          />

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button onClick={submit} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Taste Signal'}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-secondary">Sign in with creator access to log taste memory.</p>
      )}

      <div className="space-y-3">
        {memories.length === 0 ? (
          <p className="text-sm text-secondary">No taste memory yet.</p>
        ) : (
          memories.map((memory) => (
            <article key={memory.id} className="border border-divider p-4 bg-muted/10">
              <div className="flex items-center justify-between gap-3">
                <Badge
                  variant={
                    memory.verdict === 'REJECT'
                      ? 'destructive'
                      : memory.verdict === 'APPROVE'
                        ? 'default'
                        : 'secondary'
                  }
                >
                  {memory.verdict}
                </Badge>
                <span className="font-mono text-xs text-secondary">
                  {new Date(memory.createdAt).toLocaleString()}
                </span>
              </div>

              {memory.reason ? <p className="mt-3 text-sm">{memory.reason}</p> : null}

              {memory.tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {memory.tags.map((tag) => (
                    <Badge key={`${memory.id}-${tag}`} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </div>
  )
}
