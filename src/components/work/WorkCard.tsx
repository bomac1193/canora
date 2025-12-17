import Link from 'next/link'
import { StatusBadge } from './StatusBadge'
import { formatDate, formatWorkId } from '@/lib/utils'
import { WorkStatus } from '@prisma/client'

interface WorkCardProps {
  slug: string
  title: string
  status: WorkStatus
  createdAt: Date | string
  canonizedAt?: Date | string | null
  curatorName?: string | null
  contributors?: Array<{ displayName: string; role: string }>
}

export function WorkCard({
  slug,
  title,
  status,
  createdAt,
  canonizedAt,
  curatorName,
  contributors,
}: WorkCardProps) {
  return (
    <Link href={`/work/${slug}`} className="group block">
      <article className="border-b border-divider py-6 transition-colors group-hover:bg-muted/30">
        <div className="flex items-start justify-between gap-4">
          {/* Main Info */}
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-3">
              <StatusBadge status={status} size="sm" />
              <span className="font-mono text-[10px] text-secondary">
                {formatWorkId(slug)}
              </span>
            </div>

            <h3 className="font-serif text-xl font-medium text-foreground group-hover:text-canon">
              {title}
            </h3>

            {/* Contributors Preview */}
            {contributors && contributors.length > 0 && (
              <p className="mt-2 text-sm text-secondary">
                {contributors.slice(0, 3).map((c, i) => (
                  <span key={i}>
                    {i > 0 && ', '}
                    {c.displayName}
                    <span className="text-muted-foreground"> ({c.role})</span>
                  </span>
                ))}
                {contributors.length > 3 && (
                  <span className="text-muted-foreground">
                    {' '}+{contributors.length - 3} more
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Date and Curator */}
          <div className="shrink-0 text-right">
            {status === 'CANON' && canonizedAt ? (
              <>
                <p className="font-mono text-xs text-secondary">
                  Canonized {formatDate(canonizedAt)}
                </p>
                {curatorName && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    by {curatorName}
                  </p>
                )}
              </>
            ) : (
              <p className="font-mono text-xs text-secondary">
                {formatDate(createdAt)}
              </p>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
