import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { LineageGraph, LineageNode, LineageEdge } from '@/types'

type Params = { params: Promise<{ id: string }> }

// GET /api/works/[id]/lineage - Get full lineage graph
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const depth = parseInt(searchParams.get('depth') || '3')

  // Find the starting work
  const startWork = await prisma.work.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
  })

  if (!startWork) {
    return NextResponse.json(
      { error: 'Work not found' },
      { status: 404 }
    )
  }

  // Build the lineage graph using BFS
  const nodes = new Map<string, LineageNode>()
  const edges: LineageEdge[] = []
  const visited = new Set<string>()
  const queue: Array<{ workId: string; direction: 'up' | 'down'; currentDepth: number }> = [
    { workId: startWork.id, direction: 'up', currentDepth: 0 },
    { workId: startWork.id, direction: 'down', currentDepth: 0 },
  ]

  // Add the starting node
  nodes.set(startWork.id, {
    id: startWork.id,
    slug: startWork.slug,
    title: startWork.title,
    status: startWork.status,
    depth: 0,
  })

  while (queue.length > 0) {
    const { workId, direction, currentDepth } = queue.shift()!

    if (currentDepth >= depth) continue

    const visitKey = `${workId}-${direction}`
    if (visited.has(visitKey)) continue
    visited.add(visitKey)

    if (direction === 'up') {
      // Find parent works (works that this work was derived from)
      const parentEdges = await prisma.workEdge.findMany({
        where: { toWorkId: workId },
        include: {
          fromWork: true,
        },
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

        queue.push({
          workId: edge.fromWorkId,
          direction: 'up',
          currentDepth: currentDepth + 1,
        })
      }
    } else {
      // Find child works (works derived from this work)
      const childEdges = await prisma.workEdge.findMany({
        where: { fromWorkId: workId },
        include: {
          toWork: true,
        },
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

        // Avoid duplicate edges
        if (!edges.find(e => e.source === edge.fromWorkId && e.target === edge.toWorkId)) {
          edges.push({
            id: edge.id,
            source: edge.fromWorkId,
            target: edge.toWorkId,
            type: edge.type,
          })
        }

        queue.push({
          workId: edge.toWorkId,
          direction: 'down',
          currentDepth: currentDepth + 1,
        })
      }
    }
  }

  const graph: LineageGraph = {
    nodes: Array.from(nodes.values()),
    edges,
  }

  return NextResponse.json({ data: graph })
}
