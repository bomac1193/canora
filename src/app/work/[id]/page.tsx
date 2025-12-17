import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageContainer, Section } from '@/components/layout/PageContainer'
import { StatusBadge } from '@/components/work/StatusBadge'
import { ContributorList } from '@/components/work/ContributorList'
import { PromotionRecord } from '@/components/work/PromotionRecord'
import { LineageGraph } from '@/components/lineage/LineageGraph'
import { formatDate, formatWorkId } from '@/lib/utils'
import { LineageGraph as LineageGraphType } from '@/types'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

async function getLineageGraph(workId: string, depth: number = 3): Promise<LineageGraphType> {
  const work = await prisma.work.findUnique({
    where: { id: workId },
  })

  if (!work) return { nodes: [], edges: [] }

  const nodes = new Map<string, { id: string; slug: string; title: string; status: string; depth: number }>()
  const edges: Array<{ id: string; source: string; target: string; type: string }> = []
  const visited = new Set<string>()
  const queue: Array<{ workId: string; direction: 'up' | 'down'; currentDepth: number }> = [
    { workId: work.id, direction: 'up', currentDepth: 0 },
    { workId: work.id, direction: 'down', currentDepth: 0 },
  ]

  nodes.set(work.id, {
    id: work.id,
    slug: work.slug,
    title: work.title,
    status: work.status,
    depth: 0,
  })

  while (queue.length > 0) {
    const { workId: currentWorkId, direction, currentDepth } = queue.shift()!

    if (currentDepth >= depth) continue

    const visitKey = `${currentWorkId}-${direction}`
    if (visited.has(visitKey)) continue
    visited.add(visitKey)

    if (direction === 'up') {
      const parentEdges = await prisma.workEdge.findMany({
        where: { toWorkId: currentWorkId },
        include: { fromWork: true },
      })

      for (const edge of parentEdges) {
        if (!nodes.has(edge.fromWorkId)) {
          nodes.set(edge.fromWorkId, {
            id: edge.fromWorkId,
            slug: edge.fromWork.slug,
            title: edge.fromWork.title,
            status: edge.fromWork.status,
            depth: -(currentDepth + 1),
          })
        }

        edges.push({
          id: edge.id,
          source: edge.fromWorkId,
          target: edge.toWorkId,
          type: edge.type,
        })

        queue.push({ workId: edge.fromWorkId, direction: 'up', currentDepth: currentDepth + 1 })
      }
    } else {
      const childEdges = await prisma.workEdge.findMany({
        where: { fromWorkId: currentWorkId },
        include: { toWork: true },
      })

      for (const edge of childEdges) {
        if (!nodes.has(edge.toWorkId)) {
          nodes.set(edge.toWorkId, {
            id: edge.toWorkId,
            slug: edge.toWork.slug,
            title: edge.toWork.title,
            status: edge.toWork.status,
            depth: currentDepth + 1,
          })
        }

        if (!edges.find(e => e.source === edge.fromWorkId && e.target === edge.toWorkId)) {
          edges.push({
            id: edge.id,
            source: edge.fromWorkId,
            target: edge.toWorkId,
            type: edge.type,
          })
        }

        queue.push({ workId: edge.toWorkId, direction: 'down', currentDepth: currentDepth + 1 })
      }
    }
  }

  return {
    nodes: Array.from(nodes.values()) as LineageGraphType['nodes'],
    edges: edges as LineageGraphType['edges'],
  }
}

export default async function WorkPage({ params }: Params) {
  const { id } = await params

  const work = await prisma.work.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
    include: {
      contributions: {
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      promotionEvents: {
        include: {
          signedBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      canonLockedBy: {
        select: { id: true, name: true },
      },
      createdBy: {
        select: { id: true, name: true },
      },
    },
  })

  if (!work) {
    notFound()
  }

  const lineageGraph = await getLineageGraph(work.id)

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-12 border-b border-divider pb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-4 flex items-center gap-4">
              <StatusBadge status={work.status} size="lg" />
              <span className="font-mono text-sm text-secondary">
                {formatWorkId(work.slug)}
              </span>
            </div>
            <h1 className="font-serif text-4xl font-semibold text-foreground">
              {work.title}
            </h1>
            {work.description && (
              <p className="mt-4 max-w-2xl text-secondary">{work.description}</p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-xs text-secondary">
              Created {formatDate(work.createdAt)}
            </p>
            {work.createdBy?.name && (
              <p className="mt-1 text-xs text-muted-foreground">
                by {work.createdBy.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Lineage Graph - Central Focus */}
      <Section number={1} title="Lineage">
        <LineageGraph graph={lineageGraph} currentWorkId={work.id} />
        <p className="mt-4 text-xs text-muted-foreground">
          Click on any node to navigate to that work. Lineage shows the derivation history of musical ideas.
        </p>
      </Section>

      {/* Contributors */}
      <Section number={2} title="Contributors">
        <ContributorList contributors={work.contributions} />
      </Section>

      {/* Promotion History */}
      <Section number={3} title="Promotion History">
        <PromotionRecord events={work.promotionEvents} />
      </Section>

      {/* Audio (if exists) */}
      {work.audioUrl && (
        <Section number={4} title="Audio">
          <div className="border border-divider bg-muted/30 p-6">
            <audio controls className="w-full" src={work.audioUrl}>
              Your browser does not support the audio element.
            </audio>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {work.audioUrl.split('/').pop()}
            </p>
          </div>
        </Section>
      )}
    </PageContainer>
  )
}
