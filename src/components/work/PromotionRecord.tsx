import { WorkStatus } from '@prisma/client'
import { formatDateTime } from '@/lib/utils'
import { StatusBadge } from './StatusBadge'

interface PromotionEvent {
  id: string
  fromStatus: WorkStatus
  toStatus: WorkStatus
  justification: string
  createdAt: Date | string
  signedByDisplayName: string
  signedBy?: { id: string; name: string | null } | null
}

interface PromotionRecordProps {
  events: PromotionEvent[]
}

export function PromotionRecord({ events }: PromotionRecordProps) {
  if (events.length === 0) {
    return (
      <div className="border border-dashed border-divider p-6 text-center">
        <p className="text-sm text-secondary">No promotion history</p>
        <p className="mt-1 text-xs text-muted-foreground">
          This work is still in its initial state
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {events.map((event, index) => (
        <article
          key={event.id}
          className="relative border-l-2 border-divider pl-6"
        >
          {/* Timeline dot */}
          <div
            className={`absolute -left-[5px] top-0 h-2 w-2 ${
              event.toStatus === 'CANON' ? 'bg-canon' : 'bg-plate'
            }`}
          />

          {/* Header */}
          <div className="mb-3 flex items-center gap-3">
            <span className="font-mono text-[10px] text-secondary">
              {String(index + 1).padStart(2, '0')}
            </span>
            <StatusBadge status={event.fromStatus} size="sm" />
            <span className="text-secondary">&rarr;</span>
            <StatusBadge status={event.toStatus} size="sm" />
          </div>

          {/* Justification */}
          <blockquote className="mb-3 border-l-2 border-muted pl-4 text-sm text-foreground">
            {event.justification}
          </blockquote>

          {/* Signature */}
          <div className="flex items-center gap-4 text-xs text-secondary">
            <span className="font-medium">
              Signed by {event.signedByDisplayName}
            </span>
            <span className="font-mono text-muted-foreground">
              {formatDateTime(event.createdAt)}
            </span>
          </div>

          {/* Canon seal */}
          {event.toStatus === 'CANON' && (
            <div className="mt-4 inline-flex items-center gap-2 border border-canon px-3 py-1.5">
              <span className="font-mono text-[10px] font-semibold tracking-widest text-canon">
                CANONIZED
              </span>
              <span className="text-[10px] text-muted-foreground">
                This decision is irreversible
              </span>
            </div>
          )}
        </article>
      ))}
    </div>
  )
}
