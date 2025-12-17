'use client'

import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useRouter } from 'next/navigation'
import { WorkStatus, EdgeType } from '@prisma/client'
import { LineageGraph as LineageGraphType } from '@/types'

interface LineageGraphProps {
  graph: LineageGraphType
  currentWorkId: string
}

const statusColors: Record<WorkStatus, string> = {
  JAM: '#1F2A1F',
  PLATE: '#0C2340',
  CANON: '#4A0E1A',
}

const edgeColors: Record<EdgeType, string> = {
  FORK: '#5A5A5A',
  MERGE: '#0C2340',
  DERIVED: '#D8D2C8',
}

function WorkNode({ data }: { data: { label: string; status: WorkStatus; isCurrent: boolean } }) {
  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-sm border-2 px-4 py-2 transition-all ${
        data.isCurrent
          ? 'border-canon bg-background shadow-md'
          : 'border-divider bg-background hover:border-secondary'
      }`}
    >
      <span
        className="h-1.5 w-8"
        style={{ backgroundColor: statusColors[data.status] }}
      />
      <span className="max-w-32 truncate text-center font-serif text-sm">
        {data.label}
      </span>
      <span className="font-mono text-[9px] text-muted-foreground">
        {data.status}
      </span>
    </div>
  )
}

const nodeTypes = {
  work: WorkNode,
}

export function LineageGraph({ graph, currentWorkId }: LineageGraphProps) {
  const router = useRouter()

  // Convert our graph format to React Flow format
  const initialNodes: Node[] = useMemo(() => {
    // Sort nodes by depth for layout
    const sortedNodes = [...graph.nodes].sort((a, b) => a.depth - b.depth)

    // Calculate positions based on depth
    const depthGroups = new Map<number, typeof sortedNodes>()
    for (const node of sortedNodes) {
      const group = depthGroups.get(node.depth) || []
      group.push(node)
      depthGroups.set(node.depth, group)
    }

    const result: Node[] = []
    const HORIZONTAL_SPACING = 200
    const VERTICAL_SPACING = 120

    for (const [depth, nodes] of depthGroups) {
      const startY = -((nodes.length - 1) * VERTICAL_SPACING) / 2

      nodes.forEach((node, index) => {
        result.push({
          id: node.id,
          type: 'work',
          position: {
            x: depth * HORIZONTAL_SPACING,
            y: startY + index * VERTICAL_SPACING,
          },
          data: {
            label: node.title,
            status: node.status,
            isCurrent: node.id === currentWorkId,
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        })
      })
    }

    return result
  }, [graph.nodes, currentWorkId])

  const initialEdges: Edge[] = useMemo(() => {
    return graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      style: {
        stroke: edgeColors[edge.type],
        strokeWidth: edge.type === 'FORK' ? 2 : 1,
      },
      animated: edge.type === 'MERGE',
      label: edge.type === 'MERGE' ? 'merge' : undefined,
      labelStyle: { fontSize: 10, fill: '#5A5A5A' },
    }))
  }, [graph.edges])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.id !== currentWorkId) {
        // Find the slug for this node
        const graphNode = graph.nodes.find((n) => n.id === node.id)
        if (graphNode) {
          router.push(`/work/${graphNode.slug}`)
        }
      }
    },
    [currentWorkId, graph.nodes, router]
  )

  if (graph.nodes.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center border border-dashed border-divider">
        <p className="text-sm text-secondary">No lineage data available</p>
      </div>
    )
  }

  return (
    <div className="h-96 w-full border border-divider bg-muted/30">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#D8D2C8" gap={16} />
        <Controls
          showInteractive={false}
          className="!bg-background !border-divider"
        />
      </ReactFlow>
    </div>
  )
}
