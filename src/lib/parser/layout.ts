import type { Node, Edge } from '@xyflow/react'
import type { SQLNodeData } from '@/types'

const NODE_WIDTH = 240
const NODE_HEIGHT = 90
const H_GAP = 60
const V_GAP = 80

export function autoLayout(
  nodes: Node<SQLNodeData>[],
  edges: Edge[]
): Node<SQLNodeData>[] {
  if (nodes.length === 0) return nodes

  const levels = new Map<string, number>()
  const inDegree = new Map<string, number>()
  const adjList = new Map<string, string[]>()

  for (const node of nodes) {
    inDegree.set(node.id, 0)
    adjList.set(node.id, [])
  }
  for (const edge of edges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
    adjList.get(edge.source)?.push(edge.target)
  }

  // Kahn's algorithm — topological order con longest-path level assignment
  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id)
      levels.set(id, 0)
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!
    const currentLevel = levels.get(current) ?? 0
    for (const neighbor of adjList.get(current) ?? []) {
      const newLevel = currentLevel + 1
      if ((levels.get(neighbor) ?? -1) < newLevel) {
        levels.set(neighbor, newLevel)
      }
      const newDeg = (inDegree.get(neighbor) ?? 0) - 1
      inDegree.set(neighbor, newDeg)
      if (newDeg === 0) queue.push(neighbor)
    }
  }

  // Nodos sin nivel asignado (aislados) → nivel 0
  for (const node of nodes) {
    if (!levels.has(node.id)) levels.set(node.id, 0)
  }

  // Agrupar por nivel
  const byLevel = new Map<number, string[]>()
  for (const [id, level] of levels) {
    if (!byLevel.has(level)) byLevel.set(level, [])
    byLevel.get(level)!.push(id)
  }

  // Asignar posiciones x/y centradas por nivel
  const positions = new Map<string, { x: number; y: number }>()
  for (const [level, levelNodes] of byLevel) {
    const count = levelNodes.length
    // totalWidth = ancho ocupado por los nodos sin incluir el último gap
    const totalWidth = count * NODE_WIDTH + (count - 1) * H_GAP
    // Centrar: el primer nodo arranca en -totalWidth/2
    // Con un solo nodo: totalWidth = NODE_WIDTH → startX = -NODE_WIDTH/2
    // pero queremos que el centro del nodo quede en x=0, entonces startX = 0
    const startX = count === 1 ? 0 : -totalWidth / 2
    levelNodes.forEach((id, i) => {
      positions.set(id, {
        x: startX + i * (NODE_WIDTH + H_GAP),
        y: level * (NODE_HEIGHT + V_GAP),
      })
    })
  }

  return nodes.map(node => ({
    ...node,
    position: positions.get(node.id) ?? { x: 0, y: 0 },
  }))
}
