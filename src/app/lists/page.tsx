import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { PageContainer, PageHeader, Section } from '@/components/layout/PageContainer'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function CuratedListsPage() {
  const lists = await prisma.curatedList.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      curator: {
        select: { id: true, name: true },
      },
      items: {
        include: {
          work: {
            select: { id: true, slug: true, title: true, status: true },
          },
        },
        orderBy: { orderIndex: 'asc' },
        take: 5,
      },
      _count: {
        select: { items: true },
      },
    },
  })

  return (
    <PageContainer>
      <PageHeader
        title="Curated Lists"
        subtitle="Collections assembled by CANORA curators"
      />

      {lists.length === 0 ? (
        <Section>
          <div className="border border-dashed border-divider py-16 text-center">
            <p className="font-serif text-xl text-secondary">
              No curated lists yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Curators will create thematic collections as the archive grows.
            </p>
          </div>
        </Section>
      ) : (
        <Section>
          <div className="grid gap-6 md:grid-cols-2">
            {lists.map((list) => (
              <Link
                key={list.id}
                href={`/lists/${list.id}`}
                className="group block border border-divider p-6 transition-colors hover:border-secondary"
              >
                <h3 className="font-serif text-xl font-medium group-hover:text-canon">
                  {list.title}
                </h3>
                {list.description && (
                  <p className="mt-2 text-sm text-secondary line-clamp-2">
                    {list.description}
                  </p>
                )}

                {/* Preview items */}
                {list.items.length > 0 && (
                  <div className="mt-4 space-y-1">
                    {list.items.map((item, index) => (
                      <p
                        key={item.id}
                        className="font-mono text-xs text-muted-foreground"
                      >
                        {String(index + 1).padStart(2, '0')}. {item.work.title}
                      </p>
                    ))}
                    {list._count.items > 5 && (
                      <p className="font-mono text-xs text-secondary">
                        +{list._count.items - 5} more
                      </p>
                    )}
                  </div>
                )}

                {/* Meta */}
                <div className="mt-6 flex items-center justify-between border-t border-divider pt-4">
                  <span className="text-xs text-secondary">
                    by {list.curator.name || 'Anonymous'}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatDate(list.createdAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </PageContainer>
  )
}
