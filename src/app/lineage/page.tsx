'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageContainer, PageHeader, Section } from '@/components/layout/PageContainer'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function LineageExplorerPage() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/work/${query.trim()}`)
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Lineage Explorer"
        subtitle="Navigate the ancestry and derivation of musical works"
      />

      <Section number={1} title="Search Work">
        <form onSubmit={handleSearch} className="max-w-xl">
          <div className="flex gap-4">
            <Input
              type="text"
              placeholder="Enter work ID or slug (e.g., midnight-echoes-a3b2)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 border-divider bg-muted/30 font-mono text-sm"
            />
            <Button type="submit" disabled={!query.trim()}>
              Explore
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Enter a work ID to view its full lineage graph and navigate through its ancestry
          </p>
        </form>
      </Section>

      <Section number={2} title="About Lineage">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="border border-divider p-6">
            <div className="mb-3 h-1 w-8 bg-jam" />
            <h3 className="font-serif text-lg font-medium">Fork</h3>
            <p className="mt-2 text-sm text-secondary">
              A direct derivation where a new work is created by modifying or building upon
              an existing work.
            </p>
          </div>
          <div className="border border-divider p-6">
            <div className="mb-3 h-1 w-8 bg-plate" />
            <h3 className="font-serif text-lg font-medium">Merge</h3>
            <p className="mt-2 text-sm text-secondary">
              A combination where elements from multiple works are brought together
              into a new unified work.
            </p>
          </div>
          <div className="border border-divider p-6">
            <div className="mb-3 h-1 w-8 bg-divider" />
            <h3 className="font-serif text-lg font-medium">Derived</h3>
            <p className="mt-2 text-sm text-secondary">
              A looser inspiration relationship where a work takes influence from
              another without direct modification.
            </p>
          </div>
        </div>
      </Section>

      <Section number={3} title="Why Lineage Matters">
        <div className="max-w-2xl space-y-4 text-secondary">
          <p>
            In an age of infinite AI generation, understanding where ideas come from
            becomes more important than ever. CANORA&apos;s lineage system preserves the full
            history of how musical works evolve, fork, and merge.
          </p>
          <p>
            Every work in CANORA can trace its ancestry&mdash;showing which ideas it borrowed,
            which collaborators contributed, and how it relates to the broader musical
            conversation happening in the archive.
          </p>
          <p className="font-medium text-foreground">
            Lineage is not just metadata. It is the memory of cultural production.
          </p>
        </div>
      </Section>
    </PageContainer>
  )
}
