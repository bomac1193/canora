import { ContributionRole } from '@prisma/client'
import { cn } from '@/lib/utils'

interface Contributor {
  id: string
  displayName: string
  role: ContributionRole
  notes?: string | null
  user?: { id: string; name: string | null } | null
}

interface ContributorListProps {
  contributors: Contributor[]
  className?: string
}

const roleLabels: Record<ContributionRole, string> = {
  VOCAL: 'Vocals',
  BEAT: 'Beat/Percussion',
  LYRIC: 'Lyrics',
  SOUND: 'Sound Design',
  CURATION: 'Curation',
  AI_ASSIST: 'AI Assistance',
}

export function ContributorList({ contributors, className }: ContributorListProps) {
  if (contributors.length === 0) {
    return (
      <p className={cn('text-sm text-secondary', className)}>
        No contributors listed
      </p>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {contributors.map((contributor) => (
        <div
          key={contributor.id}
          className="flex items-start justify-between gap-4 border-b border-divider pb-3 last:border-0"
        >
          <div>
            <p className="font-medium text-foreground">
              {contributor.displayName}
            </p>
            {contributor.notes && (
              <p className="mt-1 text-sm text-secondary">{contributor.notes}</p>
            )}
          </div>
          <span
            className={cn(
              'shrink-0 px-2 py-0.5 font-mono text-[10px] tracking-wider',
              contributor.role === 'AI_ASSIST'
                ? 'bg-muted text-muted-foreground'
                : 'bg-muted/50 text-secondary'
            )}
          >
            {roleLabels[contributor.role]}
          </span>
        </div>
      ))}
    </div>
  )
}
