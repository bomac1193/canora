'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { PageContainer, PageHeader, Section } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ContributionRole } from '@prisma/client'

const contributionRoles: Array<{ value: ContributionRole; label: string }> = [
  { value: 'SOUND', label: 'Sound Design / Production' },
  { value: 'VOCAL', label: 'Vocals' },
  { value: 'BEAT', label: 'Beat / Percussion' },
  { value: 'LYRIC', label: 'Lyrics' },
  { value: 'CURATION', label: 'Curation' },
  { value: 'AI_ASSIST', label: 'AI Assistance' },
]

export default function CreateWorkPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contributorRole, setContributorRole] = useState<ContributionRole>('SOUND')
  const [tasteGuardrails, setTasteGuardrails] = useState('')
  const [tasteSummary, setTasteSummary] = useState<{
    totalSignals: number
    rejects: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Check auth
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (session?.user?.role === 'VIEWER') {
      router.push('/')
    }
  }, [session, status, router])

  useEffect(() => {
    async function fetchTasteGuardrails() {
      if (!session?.user) return

      try {
        const res = await fetch('/api/taste-dna/guardrails')
        if (!res.ok) return
        const json = await res.json()
        const payload = json.data
        if (!payload?.guardrails?.promptGuardrails) return

        setTasteGuardrails(payload.guardrails.promptGuardrails)
        setTasteSummary({
          totalSignals: payload.summary?.totalSignals || 0,
          rejects: payload.summary?.verdictCounts?.REJECT || 0,
        })
      } catch {
        // Non-blocking: work creation must continue without Taste DNA.
      }
    }

    fetchTasteGuardrails()
  }, [session?.user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          contributorName: session?.user?.name || 'Anonymous',
          contributorRole,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create work')
      }

      const { data } = await res.json()
      router.push(`/work/${data.slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create work')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || !session?.user) {
    return (
      <PageContainer>
        <div className="py-12 text-center">
          <p className="text-secondary">Loading...</p>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Submit Work"
        subtitle="Add a new work to the CANORA archive"
      />

      <Section number={1} title="Work Details">
        <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
          {tasteGuardrails ? (
            <div className="space-y-2 border border-divider bg-muted/20 p-4">
              <p className="font-mono text-xs text-secondary">Your Taste DNA Guardrails</p>
              <p className="text-xs text-muted-foreground">
                Learned from your profile signals ({tasteSummary?.totalSignals || 0} total, {tasteSummary?.rejects || 0} rejects)
              </p>
              <Textarea
                value={tasteGuardrails}
                readOnly
                className="min-h-20 border-divider bg-muted/30 text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!description.trim()) {
                    setDescription(tasteGuardrails)
                    return
                  }
                  if (description.includes(tasteGuardrails)) return
                  setDescription(`${description.trim()}\n\nTaste DNA guardrails: ${tasteGuardrails}`)
                }}
              >
                Apply to Description
              </Button>
            </div>
          ) : null}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              type="text"
              placeholder="Enter work title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-divider bg-muted/30"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the work, its context, or creative process..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-24 border-divider bg-muted/30"
            />
          </div>

          {/* Contributor Role */}
          <div className="space-y-2">
            <Label htmlFor="role">Your contribution role</Label>
            <Select
              value={contributorRole}
              onValueChange={(value) => setContributorRole(value as ContributionRole)}
            >
              <SelectTrigger className="border-divider bg-muted/30">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {contributionRoles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              You will be credited as: {session?.user?.name || 'Anonymous'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? 'Submitting...' : 'Submit Work'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Section>

      <Section number={2} title="Submission Guidelines">
        <div className="max-w-xl space-y-4 text-sm text-secondary">
          <p>
            All submissions enter the archive as <strong>JAM</strong> status.
            Works are reviewed by curators who may promote notable submissions
            to PLATE, and exceptional works to permanent CANON status.
          </p>
          <p>
            Be honest about AI involvement. If AI tools were used in creation,
            select &quot;AI Assistance&quot; as your contribution role. Transparency
            about process is valued in CANORA.
          </p>
          <p className="text-muted-foreground">
            Audio upload coming soon. For now, you may add audio URLs after creation.
          </p>
        </div>
      </Section>
    </PageContainer>
  )
}
