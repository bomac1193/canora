import { prisma } from '@/lib/prisma'
import { PageContainer, PageHeader, Section } from '@/components/layout/PageContainer'
import { WorkCard } from '@/components/work/WorkCard'

export const dynamic = 'force-dynamic'

export default async function CanonArchivePage() {
  const canonWorks = await prisma.work.findMany({
    where: { status: 'CANON' },
    orderBy: { canonLockedAt: 'desc' },
    include: {
      contributions: {
        take: 3,
      },
      promotionEvents: {
        where: { toStatus: 'CANON' },
        include: {
          signedBy: {
            select: { id: true, name: true },
          },
        },
        take: 1,
      },
      canonLockedBy: {
        select: { id: true, name: true },
      },
    },
  })

  return (
    <PageContainer>
      <PageHeader
        title="Canon Archive"
        subtitle="Works that have achieved permanent status in the archive"
      />

      {canonWorks.length === 0 ? (
        <Section>
          <div className="border border-dashed border-divider py-16 text-center">
            <p className="font-serif text-xl text-secondary">
              The Canon is empty
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              No works have been canonized yet. Canon status is rare and irreversible.
            </p>
          </div>
        </Section>
      ) : (
        <Section>
          <div className="mb-6 flex items-center justify-between">
            <p className="font-mono text-xs text-secondary">
              {canonWorks.length} work{canonWorks.length !== 1 ? 's' : ''} in Canon
            </p>
          </div>

          <div className="divide-y divide-divider border-t border-divider">
            {canonWorks.map((work) => {
              const canonEvent = work.promotionEvents[0]
              return (
                <WorkCard
                  key={work.id}
                  slug={work.slug}
                  title={work.title}
                  status={work.status}
                  createdAt={work.createdAt}
                  canonizedAt={work.canonLockedAt}
                  curatorName={canonEvent?.signedBy?.name || canonEvent?.signedByDisplayName}
                  contributors={work.contributions.map((c) => ({
                    displayName: c.displayName,
                    role: c.role,
                  }))}
                />
              )
            })}
          </div>
        </Section>
      )}

      {/* Archive Information */}
      <Section number={2} title="About the Canon">
        <div className="prose prose-sm max-w-none text-secondary">
          <p>
            The Canon represents the permanent archive of works deemed culturally significant
            by CANORA&apos;s curatorial body. Canonization is irreversible&mdash;once a work enters
            the Canon, it cannot be removed or demoted.
          </p>
          <p className="mt-4">
            Each canonized work includes a signed justification from the curator who made
            the decision, preserving the reasoning behind each selection for future reference.
          </p>
        </div>
      </Section>
    </PageContainer>
  )
}
