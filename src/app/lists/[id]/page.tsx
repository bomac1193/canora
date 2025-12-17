import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { PageContainer, Section } from '@/components/layout/PageContainer'
import { StatusBadge } from '@/components/work/StatusBadge'
import { formatDate, formatWorkId } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export default async function CuratedListPage({ params }: Params) {
  const { id } = await params

  const list = await prisma.curatedList.findUnique({
    where: { id },
    include: {
      curator: {
        select: { id: true, name: true },
      },
      items: {
        include: {
          work: {
            select: {
              id: true,
              slug: true,
              title: true,
              status: true,
              description: true,
              createdAt: true,
            },
          },
        },
        orderBy: { orderIndex: 'asc' },
      },
    },
  })

  if (!list) {
    notFound()
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-12 border-b border-divider pb-8">
        <Link
          href="/lists"
          className="mb-4 inline-block text-sm text-secondary hover:text-foreground"
        >
          &larr; Back to Lists
        </Link>
        <h1 className="font-serif text-4xl font-semibold text-foreground">
          {list.title}
        </h1>
        {list.description && (
          <p className="mt-4 max-w-2xl text-secondary">{list.description}</p>
        )}
        <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
          <span>Curated by {list.curator.name || 'Anonymous'}</span>
          <span>&middot;</span>
          <span className="font-mono text-xs">{formatDate(list.createdAt)}</span>
          <span>&middot;</span>
          <span>{list.items.length} works</span>
        </div>
      </div>

      {/* Works */}
      <Section number={1} title="Works in this collection">
        {list.items.length === 0 ? (
          <div className="border border-dashed border-divider py-8 text-center">
            <p className="text-secondary">This list is empty</p>
          </div>
        ) : (
          <div className="divide-y divide-divider border-t border-divider">
            {list.items.map((item, index) => (
              <Link
                key={item.id}
                href={`/work/${item.work.slug}`}
                className="group flex items-start gap-6 py-6 transition-colors hover:bg-muted/30"
              >
                {/* Index */}
                <span className="shrink-0 font-mono text-2xl font-light text-muted-foreground">
                  {String(index + 1).padStart(2, '0')}
                </span>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={item.work.status} size="sm" />
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {formatWorkId(item.work.slug)}
                    </span>
                  </div>
                  <h3 className="mt-2 font-serif text-xl font-medium group-hover:text-canon">
                    {item.work.title}
                  </h3>
                  {item.work.description && (
                    <p className="mt-1 text-sm text-secondary line-clamp-2">
                      {item.work.description}
                    </p>
                  )}
                </div>

                {/* Date */}
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {formatDate(item.work.createdAt)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </PageContainer>
  )
}
