import type { Node, Edge } from '@xyflow/react'
import type { SQLNodeData } from '@/types'

const NODE_WIDTH = 320
const NODE_HEIGHT = 100
const H_GAP = 100
const V_GAP = 110

// ── Adjacency helpers ─────────────────────────────────────────────────────────

interface ReverseGraph {
  outDegree: Map<string, number>
  reverseAdj: Map<string, string[]>
  remainingSuccessors: Map<string, number>
}

function buildReverseGraph(
  nodes: Node<SQLNodeData>[],
  layoutEdges: Edge[],
): ReverseGraph {
  const outDegree = new Map<string, number>()
  const reverseAdj = new Map<string, string[]>()
  const remainingSuccessors = new Map<string, number>()

  for (const n of nodes) {
    outDegree.set(n.id, 0)
    reverseAdj.set(n.id, [])
    remainingSuccessors.set(n.id, 0)
  }

  for (const e of layoutEdges) {
    outDegree.set(e.source, (outDegree.get(e.source) ?? 0) + 1)
    reverseAdj.get(e.target)?.push(e.source)
    remainingSuccessors.set(e.source, (remainingSuccessors.get(e.source) ?? 0) + 1)
  }

  return { outDegree, reverseAdj, remainingSuccessors }
}

// ── Backward Kahn's — longest path from node to any sink ─────────────────────

function computeBackwardLevels(
  nodes: Node<SQLNodeData>[],
  { outDegree, reverseAdj, remainingSuccessors }: ReverseGraph,
): Map<string, number> {
  const backLevels = new Map<string, number>()
  const queue: string[] = []

  for (const [id, deg] of outDegree) {
    if (deg === 0) { queue.push(id); backLevels.set(id, 0) }
  }

  while (queue.length > 0) {
    const cur = queue.shift()!
    const curLevel = backLevels.get(cur) ?? 0
    for (const pred of reverseAdj.get(cur) ?? []) {
      const lvl = curLevel + 1
      if ((backLevels.get(pred) ?? -1) < lvl) backLevels.set(pred, lvl)
      const rem = (remainingSuccessors.get(pred) ?? 0) - 1
      remainingSuccessors.set(pred, rem)
      if (rem === 0) queue.push(pred)
    }
  }

  // Isolated nodes or nodes in multi-node cycles → backLevel 0 (bottom)
  for (const n of nodes) {
    if (!backLevels.has(n.id)) backLevels.set(n.id, 0)
  }

  return backLevels
}

// ── Level grouping and position assignment ────────────────────────────────────

function groupByDisplayLevel(backLevels: Map<string, number>): Map<number, string[]> {
  const maxBack = backLevels.size > 0 ? Math.max(...backLevels.values()) : 0
  const byLevel = new Map<number, string[]>()

  for (const [id, back] of backLevels) {
    const display = maxBack - back
    if (!byLevel.has(display)) byLevel.set(display, [])
    byLevel.get(display)!.push(id)
  }

  return byLevel
}

function assignPositions(byLevel: Map<number, string[]>): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()

  for (const [level, levelNodes] of byLevel) {
    const count = levelNodes.length
    const totalWidth = count * NODE_WIDTH + (count - 1) * H_GAP
    const startX = count === 1 ? 0 : -totalWidth / 2
    levelNodes.forEach((id, i) => {
      positions.set(id, {
        x: startX + i * (NODE_WIDTH + H_GAP),
        y: level * (NODE_HEIGHT + V_GAP),
      })
    })
  }

  return positions
}

// ── Public entry point ────────────────────────────────────────────────────────

export function autoLayout(
  nodes: Node<SQLNodeData>[],
  edges: Edge[],
): Node<SQLNodeData>[] {
  if (nodes.length === 0) return nodes

  // Self-loops must not affect level assignment
  const layoutEdges = edges.filter(e => e.source !== e.target)
  const graph = buildReverseGraph(nodes, layoutEdges)
  const backLevels = computeBackwardLevels(nodes, graph)
  const byLevel = groupByDisplayLevel(backLevels)
  const positions = assignPositions(byLevel)

  return nodes.map(n => ({ ...n, position: positions.get(n.id) ?? { x: 0, y: 0 } }))
}
